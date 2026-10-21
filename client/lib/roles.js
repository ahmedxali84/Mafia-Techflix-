// Role copy and the night action each role takes. `tone` picks the role's colour in game.css.
export const ROLES = {
  MAFIA: {
    label: 'Mafia',
    team: 'Mafia',
    tone: 'mafia',
    blurb: 'Each night, choose a player to eliminate with your team. Stay hidden by day.',
    goal: 'Outnumber the town.',
    night: { prompt: 'Choose who to eliminate', verb: 'Marked' },
  },
  DOCTOR: {
    label: 'Doctor',
    team: 'Town',
    tone: 'doctor',
    blurb: 'Each night, protect one player from being killed. You may protect yourself.',
    goal: 'Find and vote out every Mafia member.',
    night: { prompt: 'Choose who to protect', verb: 'Protected' },
  },
  DETECTIVE: {
    label: 'Detective',
    team: 'Town',
    tone: 'detective',
    blurb: 'Each night, investigate one player to learn whether they are Mafia.',
    goal: 'Find and vote out every Mafia member.',
    night: { prompt: 'Choose who to investigate', verb: 'Investigating' },
  },
  VILLAGER: {
    label: 'Villager',
    team: 'Town',
    tone: 'villager',
    blurb: 'You have no night power. Find the Mafia by talking and voting.',
    goal: 'Find and vote out every Mafia member.',
    night: null,
  },
  JESTER: {
    label: 'Jester',
    team: 'Alone',
    tone: 'jester',
    blurb: 'You play for yourself. Act guilty, look like the Mafia and bait the town into voting you out.',
    goal: 'Get voted out by the town. If they hang you, you win on the spot.',
    night: null,
  },
  THIEF: {
    label: 'Thief',
    team: 'Town, for now',
    tone: 'thief',
    blurb: 'On the first night, steal another player’s role. You become what they were and join their team; they wake up a Villager.',
    goal: 'Pick your mark well. Rob the Mafia and you are Mafia.',
    night: { prompt: 'Choose whose role to steal', verb: 'Robbing' },
  },
};

// Card art for each role: `src` 720px wide (reveal, kills), `thumb` 256px (home page, lists).
// `ar` is width / height, so frames fit the art.
export const CARDS = {
  MAFIA: { src: '/cards/mafia.webp', thumb: '/cards/thumb/mafia.webp', ar: 720 / 1117 },
  DOCTOR: { src: '/cards/doctor.webp', thumb: '/cards/thumb/doctor.webp', ar: 720 / 1128 },
  DETECTIVE: { src: '/cards/detective.webp', thumb: '/cards/thumb/detective.webp', ar: 720 / 1115 },
  VILLAGER: { src: '/cards/villager.webp', thumb: '/cards/thumb/villager.webp', ar: 720 / 1186 },
  JESTER: { src: '/cards/jester.webp', thumb: '/cards/thumb/jester.webp', ar: 720 / 1116 },
  THIEF: { src: '/cards/thief.webp', thumb: '/cards/thumb/thief.webp', ar: 720 / 1116 },
};

// Starts downloading every card so a reveal or a kill never waits on the network.
export function preloadCards() {
  if (typeof window === 'undefined') return;
  for (const c of Object.values(CARDS)) {
    const img = new Image();
    img.decoding = 'async';
    img.src = c.src;
  }
}

// A role this client doesn't know (from a newer server) is shown as a plain role card, not a crash.
export const roleInfo = (role) => ROLES[role] || { label: role ? role[0] + role.slice(1).toLowerCase() : 'Unknown', team: '?', tone: 'villager', blurb: '', goal: '', night: null };

// Extra roles this client can show. Sent when joining; the server only deals one if every
// human at the table can show it. Mirrors the server's game/roles.js.
export const EXTRA_ROLES = ['JESTER', 'THIEF'];
export const JESTER_FROM = 6;
export const THIEF_FROM = 7;
export const mafiaCount = (n) => (n <= 6 ? 1 : n <= 9 ? 2 : 3);

// [role, count] dealt to a table of n players. `extras`: the extra roles the server will deal.
export function roleMix(n, extras = EXTRA_ROLES) {
  const m = mafiaCount(n);
  const jester = n >= JESTER_FROM && extras.includes('JESTER') ? 1 : 0;
  const thief = n >= THIEF_FROM && extras.includes('THIEF') ? 1 : 0;
  return [['MAFIA', m], ['DOCTOR', 1], ['DETECTIVE', 1], ['JESTER', jester], ['THIEF', thief], ['VILLAGER', n - m - 2 - jester - thief]].filter(([, c]) => c > 0);
}

// Career ranks by total wins.
export const RANKS = [
  { name: 'Associate', wins: 0 },
  { name: 'Soldier', wins: 3 },
  { name: 'Capo', wins: 10 },
  { name: 'Consigliere', wins: 25 },
  { name: 'Underboss', wins: 50 },
  { name: 'Don', wins: 100 },
];

export function rankOf(wins = 0) {
  let i = 0;
  while (i + 1 < RANKS.length && wins >= RANKS[i + 1].wins) i++;
  const next = RANKS[i + 1] || null;
  const from = RANKS[i].wins;
  return { ...RANKS[i], level: i + 1, next, progress: next ? (wins - from) / (next.wins - from) : 1 };
}
