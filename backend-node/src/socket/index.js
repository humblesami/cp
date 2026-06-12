const { socketAuthMiddleware } = require("../middleware/auth");
const { registerRoomHandlers } = require("./roomHandlers");
const { registerGameHandlers } = require("./gameHandlers");

function registerSocketHandlers(io) {
  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.user?.username} (${socket.id})`);

    registerRoomHandlers(io, socket);
    registerGameHandlers(io, socket);

    socket.on("disconnect", (reason) => {
      console.log(`Socket disconnected: ${socket.user?.username} — ${reason}`);
    });
  });
}

module.exports = { registerSocketHandlers };
