// Builds what each player is allowed to see. Roles are never broadcast:
// you see your own role, your Mafia teammates (if Mafia), and the role of
// anyone who is dead or once the game is over.
const { teamOf } = require('./game/roles');

function canSeeRole(room, viewer, p) {
  if (room.phase === 'GAME_OVER') return true;
  if (p.id === viewer.id) return true;
  if (!p.alive) return true;
  return viewer.role === 'MAFIA' && p.role === 'MAFIA';
}

// Which chat channel the player writes to right now (null = cannot chat).
function chatChannel(room, p) {
  if (room.phase === 'LOBBY' || room.phase === 'GAME_OVER') return 'public';
  if (room.phase === 'ROLE_REVEAL') return null;
  if (!p.alive) return 'dead';
  if (room.phase === 'NIGHT') return p.role === 'MAFIA' ? 'mafia' : null;
  return 'public';
}

function canSeeMessage(room, viewer, msg) {
  if (msg.channel === 'public') return true;
  if (msg.channel === 'mafia') return viewer.role === 'MAFIA';
  if (msg.channel === 'dead') return !viewer.alive || room.phase === 'GAME_OVER';
  return false;
}

function stateFor(room, viewer) {
  const started = room.phase !== 'LOBBY';
  return {
    code: room.code,
    phase: room.phase,
    endsAt: room.endsAt,
    phaseMs: room.phaseMs || 0,
    votedIds: room.phase === 'VOTING' ? Object.keys(room.votes) : [],
    serverNow: Date.now(),
    day: room.day,
    hostId: room.host,
    winner: room.winner,
    gameId: room.startedAt ? `${room.code}-${room.startedAt}` : null,
    result: room.result,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      alive: p.alive,
      connected: p.connected || !!p.bot,
      bot: !!p.bot,
      role: started && canSeeRole(room, viewer, p) ? p.role : undefined,
    })),
    you: {
      id: viewer.id,
      role: viewer.role,
      team: viewer.role ? teamOf(viewer.role) : null,
      alive: viewer.alive,
      nightTarget: room.night.actions[viewer.id] || null,
      vote: room.votes[viewer.id] || null,
      checks: viewer.checks || [],
      chatChannel: chatChannel(room, viewer),
    },
    chat: room.chat.filter((m) => canSeeMessage(room, viewer, m)),
  };
}

module.exports = { stateFor, chatChannel, canSeeMessage };
