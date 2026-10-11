const { io } = require("socket.io-client");

// Backend server URL
const SERVER_URL = "http://localhost:4000";

// Jo room code aapke browser par show ho raha hai wo yahan likhein:
const ROOM_CODE = "ABCD"; // <-- Yahan apna live room code dalein

console.log(`Connecting 5 bots to room: ${ROOM_CODE}...`);

for (let i = 1; i <= 5; i++) {
  const socket = io(SERVER_URL);

  socket.on("connect", () => {
    socket.emit("join_room", {
      code: ROOM_CODE,
      name: `Bot_${i}`,
      playerId: `bot_${i}_${Date.now()}`
    });
    console.log(`Bot_${i} joined successfully!`);
  });

  socket.on("connect_error", (err) => {
    console.error(`Bot_${i} connection error:`, err.message);
  });
}