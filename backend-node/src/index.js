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
  httpServer.listen(PORT, () => {
    console.log(`Node server running on port ${PORT}`);
  });
}

start().catch(console.error);
