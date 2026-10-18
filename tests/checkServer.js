// Free hosting (Render) puts the server to sleep after ~15 min idle and the first
// request then takes 30-60 s. Run this before a stream/test to wake it up and
// confirm both HTTP and Socket.IO work.
//
//   node tests/checkServer.js [server=http://localhost:4000]
const { io } = require('socket.io-client');

const SERVER_URL = process.argv[2] || process.env.SERVER_URL || 'http://localhost:4000';
const started = Date.now();
const secs = () => ((Date.now() - started) / 1000).toFixed(1);

async function main() {
  console.log(`Checking ${SERVER_URL} (may take up to a minute if it was asleep) ...`);
  const res = await fetch(`${SERVER_URL}/health`, { signal: AbortSignal.timeout(90000) });
  if (!res.ok) throw new Error(`/health returned HTTP ${res.status}`);
  console.log(`HTTP ok in ${secs()}s:`, await res.json());

  const socket = io(SERVER_URL, { timeout: 20000, reconnection: false });
  await new Promise((resolve, reject) => {
    socket.on('connect', resolve);
    socket.on('connect_error', reject);
  });
  // A bad room code must come back with an error - proves the event handlers respond.
  const reply = await new Promise((r) => socket.emit('join_room', { code: '????', playerId: 'health-check', name: 'Check' }, r));
  socket.close();
  if (reply.error !== 'Room not found') throw new Error(`unexpected reply: ${JSON.stringify(reply)}`);
  console.log(`Socket.IO ok in ${secs()}s. Server is awake and ready.`);
}

main().catch((err) => {
  console.error(`Server check FAILED after ${secs()}s: ${err.message}`);
  process.exit(1);
});
