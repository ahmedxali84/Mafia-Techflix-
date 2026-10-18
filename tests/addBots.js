// Debug mode: fills a real room with fake players that connect over Socket.IO
// exactly like browser tabs, and then actually play (night actions + votes).
//
//   node tests/addBots.js <ROOM_CODE> [count=5] [server=http://localhost:4000]
//
// Unlike the lobby's "Add bot" button (server-side bots), these go through the
// real network path, so they test join/reconnect/events like 5 extra tabs would.
const { io } = require('socket.io-client');

const [code, countArg, urlArg] = process.argv.slice(2);
const COUNT = Math.min(Number(countArg) || 5, 11);
const SERVER_URL = urlArg || process.env.SERVER_URL || 'http://localhost:4000';

if (!code) {
  console.log('Usage: node tests/addBots.js <ROOM_CODE> [count=5] [server=http://localhost:4000]');
  process.exit(1);
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const run = Date.now().toString(36);
console.log(`Connecting ${COUNT} fake players to room ${code.toUpperCase()} on ${SERVER_URL} ...`);

for (let i = 1; i <= COUNT; i++) {
  const name = `Fake_${i}`;
  const playerId = `fake-${run}-${i}`;
  const socket = io(SERVER_URL);
  let last = '';

  socket.on('connect', () => {
    // rejoin_room after a reconnect gives the same seat back
    socket.emit('join_room', { code, name, playerId }, (res) => {
      if (res.error) console.error(`${name}: ${res.error}`);
      else console.log(`${name} joined`);
    });
  });

  socket.on('your_role', ({ role }) => console.log(`${name} is ${role}`));

  socket.on('state', (st) => {
    const key = `${st.phase}-${st.day}`;
    const others = st.players.filter((p) => p.alive && p.id !== playerId);
    if (!st.you.alive || !others.length) return;
    if (st.phase === 'NIGHT' && !st.you.nightTarget && ['MAFIA', 'DOCTOR', 'DETECTIVE'].includes(st.you.role)) {
      const targets = st.you.role === 'MAFIA' ? others.filter((p) => p.role !== 'MAFIA') : others;
      if (targets.length) socket.emit('night_action', { targetId: pick(targets).id }, () => {});
    }
    if (st.phase === 'VOTING' && !st.you.vote && last !== key) {
      last = key;
      // Small random delay so votes don't all land in the same millisecond.
      setTimeout(() => socket.emit('cast_vote', { targetId: pick(others).id }, () => {}), 300 + Math.random() * 1500);
    }
  });

  socket.on('game_over', ({ winner }) => i === 1 && console.log(`Game over: ${winner} win`));
  socket.on('connect_error', (err) => console.error(`${name} connection error: ${err.message}`));
}

process.on('SIGINT', () => process.exit(0));
