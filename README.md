# Mafia Web Game

Multiplayer Mafia in the browser. Next.js client, Node + Socket.IO server. Live game state is kept in server memory.

## Run locally

```bash
cd server && npm install && npm run dev      # http://localhost:4000
cd client && npm install && npm run dev      # http://localhost:3000
```

`client/.env.local` → `NEXT_PUBLIC_SERVER_URL=http://localhost:4000`

Test alone: create a room and press **Add bots (debug)** in the lobby, then Start.

## Stats (optional, MongoDB - off by default)

No database: each player's stats (games, wins, per-role record) are saved in their own browser's localStorage when a game ends. Client page `/stats`.

## Team workflow (read before your first commit)

1. **Never push to `main`.** Every task gets its own branch: `git checkout -b feature/<task>` (e.g. `feature/lobby-ui`).
2. Small commits with clear messages: `git commit -m "add join room"`.
3. Open a **Pull Request** when done. The Team Lead reviews and merges.
4. Start each day with `git pull origin main`, and merge it into your branch before opening a PR.
5. **Stay in your folder** to avoid conflicts (see table). Need a change elsewhere? Ask the owner or mention it in your PR.
6. Never commit secrets. `.env` is git-ignored; share values privately and keep `.env.example` up to date.
7. Run `cd server && npm test` before opening a PR. All tests must pass.
8. 10-minute daily check-in (yesterday / today / blockers) and a demo at the end of every week.

| Owner | Area | Folders |
|---|---|---|
| Mubashir (Team Lead) | Game logic | `server/game/` |
| Hiban | Rooms, sockets, database | `server/index.js`, `server/rooms.js`, `server/db.js` |
| Usman | QA, deploy, chat/voice | `server/test/`, deploy config |
| Eshaal | Frontend | `client/app`, `client/components`, `client/lib/socket.js` |
| Tazmeen | UI / styling | `client/app/globals.css`, `client/public`, Figma |

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

## Voice chat

Real-time voice (WebRTC, peer-to-peer). Open **Players → Join voice**. Push-to-talk (hold `T` or the 🎙️ button) or open mic, mute, deafen, per-player volume. Voice follows the chat rules: at night only the Mafia hear each other and ghosts only talk to ghosts. Needs `https` or `localhost` for the mic. Design + protocol: [docs/VOICE.md](docs/VOICE.md). For players behind strict NATs set `TURN_URL`, `TURN_USERNAME`, `TURN_CREDENTIAL` on the server.

## Layout

```
server/  index.js (sockets) · rooms.js · view.js (per-player state) · game/{roles,phases,actions,winCheck}.js
client/  app/ (home, room/[code]) · components/ · lib/{socket,useRoom}.js
```

## Deploy

- Server (Render/Railway): root `server`, start `node index.js`. Set `CLIENT_ORIGIN` to the frontend URL and `NODE_ENV=production` (disables debug bots).
- Client (Vercel): root `client`, env `NEXT_PUBLIC_SERVER_URL` = backend URL.

## Not built yet (guide weeks 6–8)

Sounds/animations/avatars polish, Google login (stats currently use a per-browser id), Figma designs.
