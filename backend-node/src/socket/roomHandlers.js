const { createRoom, getRoom, joinRoom, leaveRoom, markDisconnected, markReconnected, findActiveRoomByUserId } = require("../redis/rooms");
const { getGameState } = require("../redis/gameState");
const { createGameState, getPlayerView } = require("../game-engine/engine");
const { saveGameState } = require("../redis/gameState");

// Track disconnect timers: socketId -> timer
const disconnectTimers = new Map();
const BOT_SUBSTITUTION_DELAY_MS = 30000;

function registerRoomHandlers(io, socket) {
  const { user } = socket;

  // ── Check Active Game ──────────────────────────────────
  socket.on("check_active_game", async (_, callback) => {
    try {
      const active = await findActiveRoomByUserId(user.id);
      if (active) {
        // Automatically join the socket room again and set state
        socket.join(active.roomId);
        socket.currentRoomId = active.roomId;

        // Cancel any pending bot timer for this user (reconnect scenario)
        const timerKey = `${active.roomId}:${user.id}`;
        if (disconnectTimers.has(timerKey)) {
          clearTimeout(disconnectTimers.get(timerKey));
          disconnectTimers.delete(timerKey);
        }

        // Mark them as reconnected in Redis
        await markReconnected(active.roomId, user.id);
        
        // Broadcast that they reconnected
        io.to(active.roomId).emit("player_reconnected", { userId: user.id, username: user.username });

        callback?.({ ok: true, inGame: true, roomId: active.roomId, status: active.status });
      } else {
        callback?.({ ok: true, inGame: false });
      }
    } catch (err) {
      callback?.({ ok: false, error: err.message });
    }
  });

  // ── Create Room ────────────────────────────────────────
  socket.on("create_room", async ({ name, isPrivate = false }, callback) => {
    try {
      const roomId = await createRoom({
        name: name || `${user.username}'s Table`,
        createdByUserId: user.id,
        createdByUsername: user.username,
        isPrivate,
      });

      socket.join(roomId);
      socket.currentRoomId = roomId;

      const room = await getRoom(roomId);
      callback({ ok: true, roomId, room });
    } catch (err) {
      callback({ ok: false, error: err.message });
    }
  });

  // ── Join Room ──────────────────────────────────────────
  socket.on("join_room", async ({ roomId }, callback) => {
    try {
      let seatIndex, playerCount, status;
      try {
        const joinRes = await joinRoom(roomId, user.id, user.username);
        seatIndex = joinRes.seatIndex;
        playerCount = joinRes.playerCount;
        status = joinRes.status;
      } catch (err) {
        if (err.message === "ALREADY_IN_ROOM") {
          const room = await getRoom(roomId);
          if (!room) throw new Error("ROOM_NOT_FOUND");
          seatIndex = Object.values(room.seats).findIndex((s) => s && s.userId === user.id);
          playerCount = Object.values(room.seats).filter(Boolean).length;
          status = room.status;
        } else {
          throw err;
        }
      }

      socket.join(roomId);
      socket.currentRoomId = roomId;

      // Cancel any pending bot timer for this user (reconnect scenario)
      const timerKey = `${roomId}:${user.id}`;
      if (disconnectTimers.has(timerKey)) {
        clearTimeout(disconnectTimers.get(timerKey));
        disconnectTimers.delete(timerKey);
      }
      
      await markReconnected(roomId, user.id);

      // Re-send game state to reconnecting player
      const gameState = await getGameState(roomId);
      if (gameState) {
        socket.emit("game_state_snapshot", getPlayerView(gameState, seatIndex));
      }

      const room = await getRoom(roomId);
      io.to(roomId).emit("player_joined", { room, newPlayer: { userId: user.id, username: user.username, seatIndex } });

      // Auto-start when 4 players seated
      if (playerCount === 4 && status !== "in_progress") {
        setTimeout(() => startGame(io, roomId, room), 3000);
        io.to(roomId).emit("game_starting", { countdown: 3 });
      }

      callback({ ok: true, seatIndex });
    } catch (err) {
      callback({ ok: false, error: err.message }); // ROOM_FULL, ROOM_NOT_FOUND, etc.
    }
  });

  // ── Leave Room ─────────────────────────────────────────
  socket.on("leave_room", async (_, callback) => {
    await handleLeave(io, socket, "voluntary");
    callback?.({ ok: true });
  });

  // ── Chat ───────────────────────────────────────────────
  socket.on("send_chat", ({ message }) => {
    if (!socket.currentRoomId || !message?.trim()) return;
    io.to(socket.currentRoomId).emit("chat_message", {
      userId: user.id,
      username: user.username,
      message: message.trim().slice(0, 200),
      timestamp: Date.now(),
    });
  });

  // ── Disconnect handling ────────────────────────────────
  socket.on("disconnect", async () => {
    if (!socket.currentRoomId) return;
    const roomId = socket.currentRoomId;

    await markDisconnected(roomId, user.id);
    io.to(roomId).emit("player_disconnected", { userId: user.id, username: user.username, reconnectWindowMs: BOT_SUBSTITUTION_DELAY_MS });

    // Start bot substitution timer
    const timerKey = `${roomId}:${user.id}`;
    const timer = setTimeout(async () => {
      disconnectTimers.delete(timerKey);
      const gameState = await getGameState(roomId);
      if (!gameState) return;

      // Mark their seat as bot
      const seat = gameState.seats.findIndex((s) => s && s.userId === user.id);
      if (seat >= 0) {
        gameState.seats[seat].isBot = true;
        await saveGameState(roomId, gameState);
        io.to(roomId).emit("bot_substituted", { seat, username: user.username });

        // Trigger bot action if it was this player's turn
        const { triggerBotPlay, triggerBotTrump } = require("./gameHandlers");
        if (gameState.phase === "trump_selection" && gameState.trumpCallerSeat === seat) {
          setTimeout(() => triggerBotTrump(io, roomId, gameState, seat), 1200);
        } else if (gameState.phase === "playing" && gameState.turn === seat) {
          setTimeout(() => triggerBotPlay(io, roomId, gameState, seat), 1200);
        }
      }
    }, BOT_SUBSTITUTION_DELAY_MS);

    disconnectTimers.set(timerKey, timer);
  });
}

async function startGame(io, roomId, room) {
  const seats = Object.values(room.seats);
  const gameState = createGameState(seats);
  await saveGameState(roomId, gameState);

  // Send each player their own view (never leaking other hands)
  const sockets = await io.in(roomId).fetchSockets();
  for (const s of sockets) {
    const seatIndex = seats.findIndex((seat) => seat && seat.userId === s.user?.id);
    if (seatIndex >= 0) {
      s.emit("game_started", getPlayerView(gameState, seatIndex));
    }
  }

  // If initial trump caller is a bot, trigger trump selection
  if (gameState.seats[gameState.trumpCallerSeat]?.isBot) {
    const { triggerBotTrump } = require("./gameHandlers");
    setTimeout(() => triggerBotTrump(io, roomId, gameState, gameState.trumpCallerSeat), 1200);
  }
}

async function handleLeave(io, socket, reason) {
  const roomId = socket.currentRoomId;
  if (!roomId) return;

  const result = await leaveRoom(roomId, socket.user.id);
  socket.leave(roomId);
  socket.currentRoomId = null;

  if (result?.deleted) {
    io.to(roomId).emit("room_closed", { reason: "last_player_left" });
  } else {
    io.to(roomId).emit("player_left", { userId: socket.user.id, username: socket.user.username, reason });
  }
}

module.exports = { registerRoomHandlers };
