// Per-browser game stats, kept in localStorage (no server / database).
const KEY = 'mafia_stats';
const ROLES = ['MAFIA', 'VILLAGER', 'DOCTOR', 'DETECTIVE', 'JESTER', 'THIEF'];

function empty() {
  return {
    games: 0,
    wins: 0,
    losses: 0,
    byRole: Object.fromEntries(ROLES.map((r) => [r, { games: 0, wins: 0 }])),
    recent: [], // last finished games, newest first
    counted: [], // gameIds already recorded, so a refresh doesn't double count
  };
}

export function getStats() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw && typeof raw.games === 'number') return { ...empty(), ...raw, byRole: { ...empty().byRole, ...raw.byRole } };
  } catch {}
  return empty();
}

// Called when a room reaches GAME_OVER. Safe to call repeatedly for the same game.
export function recordGame(state) {
  const { gameId, winner, you } = state || {};
  if (!gameId || !winner || !you?.role) return;
  const s = getStats();
  if (s.counted.includes(gameId)) return;
  const won = you.team === winner;
  s.games += 1;
  s.wins += won ? 1 : 0;
  s.losses += won ? 0 : 1;
  const r = (s.byRole[you.role] ||= { games: 0, wins: 0 });
  r.games += 1;
  r.wins += won ? 1 : 0;
  s.recent = [{ role: you.role, won, at: Date.now() }, ...s.recent].slice(0, 10);
  s.counted = [gameId, ...s.counted].slice(0, 50);
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

export function resetStats() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
