# Mafia Web Game

Multiplayer Mafia in the browser. Next.js client, Node + Socket.IO server. Live game state is kept in server memory.

## Run locally

```bash
cd server && npm install && npm run dev      # http://localhost:4000
cd client && npm install && npm run dev      # http://localhost:3000
```

`client/.env.local` → `NEXT_PUBLIC_SERVER_URL=http://localhost:4000`

Test alone: create a room and press **Add bots (debug)** in the lobby, then Start.

## Stats (optional, MongoDB)

No database: each player's stats (games, wins, per-role record) are saved in their own browser's localStorage when a game ends. Client page `/stats`.

## Tests

```bash
cd server && npm test
```

Unit tests for roles, win check, night actions and voting, plus an end-to-end game with 5 socket clients that also checks no role leaks.

## Rules

- 5–12 players. Mafia: 1 (5–6), 2 (7–9), 3 (10–12). Always 1 Doctor + 1 Detective.
- Phases: LOBBY → ROLE_REVEAL → NIGHT → DAY_RESULT → DISCUSSION → VOTING → VOTE_RESULT → (NIGHT | GAME_OVER).
- Timers: night 30s, discussion 120s, voting 30s. Night/voting end early once everyone has acted.
- Doctor may save themselves. Mafia pick by plurality (random tie-break). A voting tie (or "skip" winning) eliminates nobody.
- Villagers win when no Mafia remain; Mafia win when they equal or outnumber everyone else.
- Roles are sent privately; the role of a dead player is revealed to all.
- Chat: public (day/lobby), Mafia-only (night), ghost chat (dead).
- Refreshing reconnects you to your seat (stable `playerId` in localStorage). Host passes to the next connected player.

## Layout

```
server/  index.js (sockets) · rooms.js · view.js (per-player state) · game/{roles,phases,actions,winCheck}.js
client/  app/ (home, room/[code]) · components/ · lib/{socket,useRoom}.js
```

## Deploy

- Server (Render/Railway): root `server`, start `node index.js`. Set `CLIENT_ORIGIN` to the frontend URL and `NODE_ENV=production` (disables debug bots).
- Client (Vercel): root `client`, env `NEXT_PUBLIC_SERVER_URL` = backend URL.

## Not built yet (guide weeks 6–8)

Sounds/animations/avatars polish, Google login (stats currently use a per-browser id), voice chat, Figma designs.
