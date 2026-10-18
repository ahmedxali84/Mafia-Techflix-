# Testing checklist

Owner: Usman. Run it **every week before the demo**, and after every deploy. Copy the list into the weekly PR or issue and tick it.

## Automated (2 minutes)

```bash
cd server && npm test                         # all tests must pass
node ../tests/checkServer.js <server-url>     # wakes Render, checks HTTP + Socket.IO
```

What the tests cover:

| File | Checks |
|---|---|
| `test/rooms.e2e.test.js` | 5 tabs create/join, live list, wrong code, case-insensitive code, names, full room (12), start rules, refresh keeps seat, leave/host handover, switching rooms |
| `test/roleleak.e2e.test.js` | 7 players play a full game; **every** event each player receives is audited against the real roles (no leaks, Mafia/ghost chat and whispers only reach the right people, detective result only to the Detective) |
| `test/e2e.test.js` | 5 players play to Game over |
| `test/game.test.js` | role counts 5–12, night actions, voting, tie, win check |
| `test/voice*.test.js`, `test/whispers*.test.js` | voice routing, whispers |

## Manual: rooms (Week 2), 5 tabs or devices

- [ ] Create a room; the 4-letter code is shown and the copy button works
- [ ] 4 more tabs/devices join with the code; every tab shows the same list live
- [ ] Wrong code shows "Room not found"
- [ ] Same name twice is refused
- [ ] 13th player sees "Room is full" (use `node tests/addBots.js CODE 11`)
- [ ] Start is disabled under 5 players; only the host can start
- [ ] Refresh a tab: the player keeps their seat (no duplicate)
- [ ] Host leaves: someone else becomes host (👑 moves)
- [ ] Joining after start shows "Game already started"

## Manual: secrecy (Week 3)

- [ ] Each player sees only their own role card
- [ ] Mafia see their teammates; nobody else sees any role until that player dies
- [ ] Detective result only appears for the Detective
- [ ] At night villagers can't chat; Mafia chat isn't visible to the town
- [ ] Dead players' chat is only visible to the dead
- [ ] (Optional) DevTools → Network → WS frames: no `role` for living players you shouldn't know

## Manual: full game (Week 4)

- [ ] Role reveal → Night → Morning result → Discussion → Voting → Vote result → … → Game over
- [ ] Timers count down and the phase changes on its own
- [ ] Night ends early when all night roles have acted; voting ends early when all have voted
- [ ] Doctor save works (nobody dies); tie vote eliminates nobody
- [ ] Game over shows the winner and all roles; "Play again" returns to the lobby
- [ ] Debug: "Fill with bots" / `tests/addBots.js` lets one person test a full game

## Before a demo / stream

- [ ] `checkServer.js` against the live server (free Render sleeps)
- [ ] Frontend opens over https, no errors in the browser console
- [ ] Phone + laptop in the same room
