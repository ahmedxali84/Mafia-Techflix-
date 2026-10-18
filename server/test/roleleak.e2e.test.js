// Week 3 QA: does anyone learn a role they shouldn't? Seven real socket clients
// (2 Mafia) play a whole game while we record EVERY event each one receives and
// audit it against the true roles held by the server.
process.env.TIMER_SCALE = '0.02';
process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');
const { io: connect } = require('socket.io-client');
const { server, io } = require('../index');
const { rooms } = require('../rooms');
const { clearTimers } = require('../game/phases');

const emit = (s, ev, data) => new Promise((res) => s.emit(ev, data, res));
const until = (fn, ms = 30000) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => { clearInterval(iv); reject(new Error('timeout')); }, ms);
    const iv = setInterval(() => { if (fn()) { clearTimeout(t); clearInterval(iv); resolve(); } }, 20);
  });

// Walks any payload and returns every { id, role } pair found in it.
function rolesIn(value, out = []) {
  if (Array.isArray(value)) value.forEach((v) => rolesIn(v, out));
  else if (value && typeof value === 'object') {
    if (typeof value.id === 'string' && value.role) out.push({ id: value.id, role: value.role });
    for (const [k, v] of Object.entries(value)) {
      // result objects name the victim as killedId/killedRole, eliminatedId/eliminatedRole
      const m = k.match(/^(\w+)Id$/);
      if (m && typeof v === 'string' && value[`${m[1]}Role`]) out.push({ id: v, role: value[`${m[1]}Role`] });
      rolesIn(v, out);
    }
  }
  return out;
}

test('7 players: no event ever reveals a living player\'s role to someone who may not know it', async () => {
  await new Promise((r) => server.listen(0, r));
  const url = `http://localhost:${server.address().port}`;
  const cs = Array.from({ length: 7 }, (_, i) => ({ id: `leak-${i}`, name: `L${i}`, events: [], socket: connect(url, { forceNew: true }) }));

  let code;
  let room; // the server's own room object = ground truth
  const problems = [];

  for (const c of cs) {
    c.socket.onAny((event, payload) => {
      if (!room || room.phase === 'LOBBY') return;
      // Snapshot the truth at the moment the event arrives.
      const me = room.players.find((p) => p.id === c.id);
      const truth = Object.fromEntries(room.players.map((p) => [p.id, { role: p.role, alive: p.alive }]));
      c.events.push(event);
      if (event === 'game_over' || payload?.phase === 'GAME_OVER') return; // all roles are public at the end

      for (const { id, role } of rolesIn(payload)) {
        const t = truth[id];
        if (!t) continue;
        if (t.role !== role) problems.push(`${c.name} got a WRONG role for ${id} in ${event}`);
        const allowed = id === c.id || !t.alive || (me.role === 'MAFIA' && t.role === 'MAFIA');
        if (!allowed) problems.push(`${c.name} (${me.role}) learned ${id} is ${role} via ${event} (${payload?.phase || room.phase})`);
      }
      if (event === 'your_role' && payload.role !== me.role) problems.push(`${c.name} got someone else's your_role`);
      if (event === 'investigation_result' && me.role !== 'DETECTIVE') problems.push(`${c.name} (${me.role}) got a detective result`);
      if (event === 'room_update' && payload.some((p) => 'role' in p)) problems.push('room_update carries roles');

      const msgs = event === 'chat_message' ? [payload] : event === 'state' ? payload.chat : [];
      for (const m of msgs) {
        if (m.channel === 'mafia' && me.role !== 'MAFIA') problems.push(`${c.name} (${me.role}) can read Mafia chat`);
        if (m.channel === 'dead' && me.alive && room.phase !== 'GAME_OVER') problems.push(`${c.name} (alive) can read ghost chat`);
        if (m.channel === 'whisper' && ![m.from, m.to].includes(c.id)) problems.push(`${c.name} can read someone else's whisper`);
      }
    });

    // Play: act at night, talk on the "secret" channels, vote by day.
    c.socket.on('state', (st) => {
      const others = st.players.filter((p) => p.alive && p.id !== c.id);
      if (st.phase === 'NIGHT' && st.you.alive) {
        if (st.you.role === 'MAFIA' && !c.saidNight) {
          c.saidNight = st.day;
          c.socket.emit('chat_message', { text: `mafia plan day ${st.day}` }, () => {});
        }
        if (!st.you.nightTarget && ['MAFIA', 'DOCTOR', 'DETECTIVE'].includes(st.you.role)) {
          const targets = st.you.role === 'MAFIA' ? others.filter((p) => p.role !== 'MAFIA') : others;
          if (targets[0]) c.socket.emit('night_action', { targetId: targets[0].id }, () => {});
        }
      }
      if (!st.you.alive && st.phase === 'DISCUSSION' && !c.saidDead) {
        c.saidDead = true;
        c.socket.emit('chat_message', { text: 'boo from the grave' }, () => {});
      }
      if (st.phase === 'DISCUSSION' && st.you.alive && st.you.whispersLeft > 0 && !c.whispered && others[0]) {
        c.whispered = true;
        c.socket.emit('whisper', { targetId: others[0].id, text: 'psst' }, () => {});
      }
      if (st.phase === 'VOTING' && st.you.alive && !st.you.vote && others[0]) {
        c.socket.emit('cast_vote', { targetId: others[0].id }, () => {});
      }
    });
  }

  try {
  ({ code } = await emit(cs[0].socket, 'create_room', { playerId: cs[0].id, name: cs[0].name }));
  for (const c of cs.slice(1)) assert.ok((await emit(c.socket, 'join_room', { code, playerId: c.id, name: c.name })).ok);
  room = rooms[code];
  assert.ok((await emit(cs[0].socket, 'start_game', {})).ok);
  assert.equal(room.players.filter((p) => p.role === 'MAFIA').length, 2);

  await until(() => room.phase === 'GAME_OVER').catch((e) => { throw new Error(`stuck in ${room.phase} day ${room.day}: ${JSON.stringify(room.players.map((p) => [p.name, p.role, p.alive]))}`); });
  await new Promise((r) => setTimeout(r, 100));

  assert.deepEqual(problems, []);
  for (const c of cs) {
    assert.equal(c.events.filter((e) => e === 'your_role').length, 1, `${c.name} gets exactly one your_role`);
    assert.ok(c.events.includes('game_over'));
  }

  } finally {
    if (room) clearTimers(room);
    cs.forEach((c) => c.socket.close());
    io.close();
  }
});
