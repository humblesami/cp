require("dotenv").config();
const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { initRedis } = require("./redis/client");
const roomRoutes = require("./routes/rooms");
const { registerSocketHandlers } = require("./socket/index");

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  },
});

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000", credentials: true }));
app.use(express.json());

// REST routes (room listing for lobby)
app.use("/api/rooms", roomRoutes);

app.get("/health", (req, res) => res.json({ status: "ok" }));

// WebSocket handlers
registerSocketHandlers(io);

const PORT = process.env.PORT || 3001;

async function start() {
  await initRedis();

  // Clean up all solo rooms and games from Redis on startup
  const { getRedis } = require("./redis/client");
  const redis = getRedis();
  try {
    const soloRoomKeys = await redis.keys("room:SOLO-*");
    const soloGameKeys = await redis.keys("game:SOLO-*");
    const keysToDelete = [...soloRoomKeys, ...soloGameKeys];
    if (keysToDelete.length > 0) {
      await redis.del(keysToDelete);
      console.log(`[Startup] Cleaned up ${keysToDelete.length} solo room/game keys from Redis.`);
    }
  } catch (err) {
    console.error("[Startup] Failed to clean up solo keys:", err);
  }

  httpServer.listen(PORT, () => {
    console.log(`Node server running on port ${PORT}`);
  });
}

start().catch(console.error);
