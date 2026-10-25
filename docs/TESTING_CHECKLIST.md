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

## Manual: chat (Week 5)

- [ ] Day: town chat reaches everyone (ghosts can read it too)
- [ ] Night: town chat shows "Chat closed"; the Mafia tab (2+ Mafia) works day and night, only for the Mafia
- [ ] Dead players: "You were eliminated — spectating. Ghost chat is open"; only ghosts read ghost chat
- [ ] Refresh keeps the chat history (and only what you may see)

## Manual: devices (Week 6)

Done 25 Oct 2026 in the Browser pane: phone 375×812, tablet 768×1024, desktop; plus real Chrome and Edge (desktop).
Firefox / Safari are not installed here, so test them on a real phone or Mac before launch.

- [ ] No sideways scrolling on any page (menu, career, lobby, every game phase, game over)
- [ ] Every button is at least ~40 px to tap; the top menu fits on one line (on ≤400 px "How to play" reads "Help")
- [ ] Chat input stays visible when the phone keyboard opens
- [ ] Real phones: Android Chrome + iPhone Safari join the same room as a laptop

## Manual: community + feedback (Weeks 7-8)

- [ ] `NEXT_PUBLIC_DISCORD_URL` set on Vercel → the Discord button shows in the menu, home page, voice panel and game over, and opens the invite in a new tab
- [ ] Feedback (menu) and "Rate this game" (game over): pick stars, send, see "Thank you!"
- [ ] Team reads it: `curl -H "Authorization: Bearer $FEEDBACK_TOKEN" https://<backend>/feedback`

## Final launch checklist (Week 8)

- [ ] `cd server && npm test` all green (92 tests on 25 Oct 2026)
- [ ] `cd client && npm run build` passes
- [ ] Render env: `CLIENT_ORIGIN` = Vercel URL, `FEEDBACK_TOKEN` set (long random), `NODE_ENV=production`
- [ ] Vercel env: `NEXT_PUBLIC_SERVER_URL` = Render URL, `NEXT_PUBLIC_DISCORD_URL` = invite link; redeploy after changing
- [ ] `node tests/checkServer.js <render-url>` → "Server is awake and ready"
- [ ] One full game on the live URL with 5+ real people (phones + laptops), then download the feedback
- [ ] (Optional) custom domain connected, `CLIENT_ORIGIN` updated to it

## Before a demo / stream

- [ ] `checkServer.js` against the live server (free Render sleeps)
- [ ] Frontend opens over https, no errors in the browser console
- [ ] Phone + laptop in the same room
