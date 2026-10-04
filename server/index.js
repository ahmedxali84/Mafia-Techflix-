require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const rm = require('./rooms');
const phases = require('./game/phases');
const actions = require('./game/actions');
const { teamOf } = require('./game/roles');
const db = require('./db');
const { stateFor, chatChannel, canSeeMessage } = require('./view');

const PORT = process.env.PORT || 4000;
// Set CLIENT_ORIGIN (comma separated) in production; '*' only for local testing.
const ORIGIN = process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(',') : '*';
const DEBUG = process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEBUG === 'true';

const app = express();
app.use(cors({ origin: ORIGIN }));
app.get('/', (_req, res) => res.send('Mafia server running'));
app.get('/leaderboard', async (_req, res) => {
  try {
    res.json({ enabled: db.isReady(), players: await db.leaderboard(20) });
  } catch {
    res.status(500).json({ error: 'Leaderboard unavailable' });
  }
});
app.get('/stats/:playerId', async (req, res) => {
  try {
    res.json({ enabled: db.isReady(), stats: await db.getStats(req.params.playerId) });
  } catch {
    res.status(500).json({ error: 'Stats unavailable' });
  }
});
app.get('/health', (_req, res) => res.json({ ok: true, rooms: Object.keys(rm.rooms).length }));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: ORIGIN } });

const socketOf = (p) => (p.socketId ? io.sockets.sockets.get(p.socketId) : null);

// Sends every player their own personalised snapshot of the room.
function broadcast(room) {
  io.to(room.code).emit('room_update', room.players.map((p) => ({ id: p.id, name: p.name, connected: p.connected || !!p.bot })));
  for (const p of room.players) {
    const s = socketOf(p);
    if (s) s.emit('state', stateFor(room, p));
  }
}

const ctx = {
  onChange: broadcast,
  onPhase: (room) => io.to(room.code).emit('phase_change', { phase: room.phase, endsAt: room.endsAt }),
  onRole: (_room, p) => {
    const s = socketOf(p);
    if (s) s.emit('your_role', { role: p.role, team: teamOf(p.role) });
  },
  onCheck: (_room, det, c) => {
    const s = socketOf(det);
    if (s) s.emit('investigation_result', { targetId: c.targetId, isMafia: c.isMafia });
  },
  onGameOver: (room) => {
    db.recordGame(room);
    io.to(room.code).emit('game_over', {
      winner: room.winner,
      roles: Object.fromEntries(room.players.map((p) => [p.id, p.role])),
    });
  },
};

io.on('connection', (socket) => {
  let current = null; // { code, playerId }

  const me = () => {
    if (!current) return {};
    const room = rm.rooms[current.code];
    const player = room && room.players.find((p) => p.id === current.playerId);
    return { room, player };
  };

  function enter(room, player) {
    player.socketId = socket.id;
    current = { code: room.code, playerId: player.id };
    socket.join(room.code);
    broadcast(room);
  }

  socket.on('create_room', ({ playerId, name } = {}, cb = () => {}) => {
    if (!playerId || !rm.cleanName(name)) return cb({ error: 'Name is required' });
    const room = rm.createRoom(playerId, name);
    enter(room, room.players[0]);
    cb({ ok: true, code: room.code });
  });

  // Fresh join or reconnect (same playerId gets its old seat back).
  const join = ({ code, playerId, name } = {}, cb = () => {}) => {
    if (!playerId) return cb({ error: 'Missing player id' });
    const res = rm.joinRoom(code, playerId, name);
    if (res.error) return cb({ error: res.error });
    enter(res.room, res.player);
    cb({ ok: true, code: res.room.code });
  };
  socket.on('join_room', join);
  socket.on('rejoin_room', join);

  socket.on('leave_room', (_p, cb = () => {}) => {
    const { room, player } = me();
    if (!room) return cb({ ok: true });
    socket.leave(room.code);
    if (room.phase === 'LOBBY' || room.phase === 'GAME_OVER') rm.leaveRoom(room, player.id, broadcast);
    else rm.disconnect(room, player.id, broadcast), broadcast(room);
    current = null;
    cb({ ok: true });
  });

  socket.on('start_game', (_p, cb = () => {}) => {
    const { room, player } = me();
    if (!room) return cb({ error: 'Not in a room' });
    if (room.host !== player.id) return cb({ error: 'Only the host can start' });
    cb(phases.startGame(room, ctx));
  });

  socket.on('play_again', (_p, cb = () => {}) => {
    const { room, player } = me();
    if (!room || room.host !== player.id) return cb({ error: 'Only the host can do that' });
    if (room.phase !== 'GAME_OVER') return cb({ error: 'Game not over' });
    phases.backToLobby(room, ctx);
    cb({ ok: true });
  });

  socket.on('night_action', ({ targetId } = {}, cb = () => {}) => {
    const { room, player } = me();
    if (!room) return cb({ error: 'Not in a room' });
    const res = actions.submitNightAction(room, player.id, targetId);
    if (res.error) return cb(res);
    // Mafia see each other's picks so they can coordinate.
    broadcast(room);
    phases.checkEarlyEnd(room, ctx);
    cb({ ok: true });
  });

  socket.on('cast_vote', ({ targetId } = {}, cb = () => {}) => {
    const { room, player } = me();
    if (!room) return cb({ error: 'Not in a room' });
    const res = actions.castVote(room, player.id, targetId);
    if (res.error) return cb(res);
    broadcast(room);
    phases.checkEarlyEnd(room, ctx);
    cb({ ok: true });
  });

  socket.on('chat_message', ({ text } = {}, cb = () => {}) => {
    const { room, player } = me();
    if (!room) return cb({ error: 'Not in a room' });
    if (Date.now() - (player.lastChat || 0) < 600) return cb({ error: 'Slow down a little' });
    player.lastChat = Date.now();
    const clean = String(text || '').trim().slice(0, 300);
    if (!clean) return cb({ error: 'Empty message' });
    const channel = chatChannel(room, player);
    if (!channel) return cb({ error: 'You cannot chat right now' });
    const msg = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, channel, from: player.id, name: player.name, text: clean, ts: Date.now() };
    room.chat.push(msg);
    if (room.chat.length > 200) room.chat.shift();
    for (const p of room.players) {
      if (canSeeMessage(room, p, msg)) {
        const s = socketOf(p);
        if (s) s.emit('chat_message', msg);
      }
    }
    cb({ ok: true });
  });

  // Debug mode: one person can fill a room with bots to test alone.
  socket.on('add_bots', ({ count = 4 } = {}, cb = () => {}) => {
    if (!DEBUG) return cb({ error: 'Debug mode is off' });
    const { room, player } = me();
    if (!room || room.host !== player.id || room.phase !== 'LOBBY') return cb({ error: 'Host only, in lobby' });
    rm.addBots(room, Math.min(Number(count) || 0, 11));
    broadcast(room);
    cb({ ok: true });
  });

  socket.on('disconnect', () => {
    const { room, player } = me();
    if (!room || !player || player.socketId !== socket.id) return; // replaced by a newer connection
    rm.disconnect(room, player.id, broadcast);
    broadcast(room);
  });
});

if (require.main === module) {
  db.connectDb();
  server.listen(PORT, () => console.log(`Server running on port ${PORT}${DEBUG ? ' (debug on)' : ''}`));
}

module.exports = { server, io };
