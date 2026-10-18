# Bug list: Week 4 full-game test

Owner: Usman. Found by playing full games start to end (browser host + 5 fake players via `tests/addBots.js`), by the automated suites, and by reading the code.

**Test run (2026-10-18):** 6 players (Usman = Doctor + 5 fake players), local server + client. Lobby list live, role reveal, night (Doctor save picked), early night end, morning result, 2-min discussion, voting, tie, ghost chat after death, Mafia win on Day 3, all roles shown at Game over. No browser console errors. `npm test` 39/39 passing, 3 runs in a row. `next build` passes.

| # | Severity | Area / owner | Bug | Status |
|---|---|---|---|---|
| 1 | Low (hardening) | Rooms (Hiban) `server/index.js` | A socket that creates/joins a second room without `leave_room` stayed in the first room as a "connected" ghost (host there forever) and kept receiving that room's `room_update`. Today's client doesn't hit this, because `useRoom` disconnects the socket when you leave the room page (checked in the browser: Back → old seat goes offline → removed after 10 s → host passes on). Any client that reuses one socket (scripts, a future client change) would. | **Fixed**: `enter()` now leaves the previous room first. Regression test in `rooms.e2e.test.js`. Please review, Hiban. |
| 2 | Low | Rooms (Hiban) `server/index.js` | `leave_room` from an old tab removed the player even when a newer tab had already taken over the seat. | **Fixed** with #1 (shared `leave()` checks the socket owns the seat). |
| 3 | Medium | Tests (Usman) `voice.e2e.test.js` | "routes follow the game" failed ~3/4 runs under load: night 1 ends early before every client sees it, so the check ran on night 2 with a dead Doctor (correctly on the ghost channel). Test bug, not a game bug. | **Fixed** (dead players expected on `dead`). |
| 4 | Low | Frontend (Eshaal) `client/components/PhaseSplash.js` | If a phase ends within 1.9 s (fast night), the effect cleanup cancels the hide timer and the next phase has no splash, so the "Night falls" splash never unmounts. It's invisible (opacity 0, no clicks) but screen readers still read it, e.g. on the Game over screen. Fix: in the effect, `if (!s) { setShow(null); return; }`. | Open |
| 5 | Low | Docs (Usman) `README.md` | README said `NODE_ENV=production` disables debug bots. It doesn't (the flag only changes a log line), and bots are a product feature ("Play with bots"). | **Fixed** in README + DEPLOY.md |

Not bugs (checked):
- Villager chat at night: refused by the server (`You cannot chat right now`). A message can look like it got through only because the night already ended early.
- Role leaks: none. Every event of a full 7-player game was audited (`roleleak.e2e.test.js`), and the audit was confirmed to catch a deliberately planted leak.

## Debug mode (5 fake players)

Two ways, both already working:
1. **In the lobby (host):** "🤖 Fill with bots" / "＋ Add bot" (server-side bots that vote, scheme and chat). `/play` → "Play with bots" starts a table with 5.
2. **Real network clients:** `node tests/addBots.js <CODE> [count=5] [server-url]`. Fake players join over Socket.IO like real tabs and play (night actions + votes). Good for testing a deployed server.
