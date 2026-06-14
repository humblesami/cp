const { 
  createRoom, 
  getRoom, 
  joinRoom, 
  leaveRoom, 
  markDisconnected, 
  markReconnected, 
  findActiveRoomByUserId,
  findAdminRoomsByUserId,
  transferAdmin,
  updateRoomMetadata,
  deleteRoom,
  createSoloRoom
} = require("../redis/rooms");
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
  socket.on("create_room", async ({ name, description = "", isPrivate = false }, callback) => {
    try {
      // Check if user is already admin of an active room
      const adminRooms = await findAdminRoomsByUserId(user.id);
      if (adminRooms.length > 0) {
        return callback({ 
          ok: false, 
          error: "You cannot create a new room until you transfer admin status or leave your active room." 
        });
      }

      const roomId = await createRoom({
        name: name || `${user.username}'s Table`,
        description,
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

  // ── Create Solo Room (All Bots) ─────────────────────────
  socket.on("create_solo_room", async (_, callback) => {
    try {
      const adminRooms = await findAdminRoomsByUserId(user.id);
      if (adminRooms.length > 0) {
        return callback({ 
          ok: false, 
          error: "You cannot start a solo game until you transfer admin status or leave your active room." 
        });
      }

      const roomId = await createSoloRoom(user.id, user.username);
      await updateRoomMetadata(roomId, { status: "in_progress" });

      socket.join(roomId);
      socket.currentRoomId = roomId;

      const room = await getRoom(roomId);
      callback?.({ ok: true, roomId, room });

      // Automatically trigger game start since solo room has all 4 players (1 human + 3 bots) immediately!
      // dealerSeat = 3 means trumpCaller is (3+1)%4 = 0, which is the human player.
      setTimeout(async () => {
        try {
          await startGame(io, roomId, room, 3);
        } catch (err) {
          console.error("Failed to auto-start solo game:", err);
        }
      }, 500);

    } catch (err) {
      console.error("Solo room error:", err);
      callback?.({ ok: false, error: err.message });
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
        await updateRoomMetadata(roomId, { status: "in_progress" });
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
    try {
      await handleLeave(io, socket, "voluntary");
      callback?.({ ok: true });
    } catch (err) {
      console.error("Leave room error:", err);
      callback?.({ ok: false, error: err.message });
    }
  });

  // ── Rename Room & Update Description ───────────────────
  socket.on("update_room", async ({ name, description }, callback) => {
    try {
      if (!socket.currentRoomId) throw new Error("NOT_IN_ROOM");
      const room = await getRoom(socket.currentRoomId);
      if (!room) throw new Error("ROOM_NOT_FOUND");

      if (parseInt(room.createdBy) !== parseInt(user.id)) {
        throw new Error("UNAUTHORIZED");
      }

      await updateRoomMetadata(socket.currentRoomId, name, description);
      const updatedRoom = await getRoom(socket.currentRoomId);
      io.to(socket.currentRoomId).emit("room_updated", { room: updatedRoom });
      callback?.({ ok: true });
    } catch (err) {
      callback?.({ ok: false, error: err.message });
    }
  });

  // ── Transfer Admin ─────────────────────────────────────
  socket.on("transfer_admin", async ({ targetUserId }, callback) => {
    try {
      if (!socket.currentRoomId) throw new Error("NOT_IN_ROOM");
      const room = await getRoom(socket.currentRoomId);
      if (!room) throw new Error("ROOM_NOT_FOUND");

      if (parseInt(room.createdBy) !== parseInt(user.id)) {
        throw new Error("UNAUTHORIZED");
      }

      const seats = Object.values(room.seats);
      const targetInRoom = seats.find((s) => s && parseInt(s.userId) === parseInt(targetUserId));
      if (!targetInRoom) throw new Error("TARGET_PLAYER_NOT_IN_ROOM");

      await transferAdmin(socket.currentRoomId, targetUserId);
      const updatedRoom = await getRoom(socket.currentRoomId);

      io.to(socket.currentRoomId).emit("room_updated", { room: updatedRoom });
      io.to(socket.currentRoomId).emit("chat_message", {
        userId: "system",
        username: "System",
        message: `${targetInRoom.username} is now the table admin.`,
        timestamp: Date.now(),
      });
      callback?.({ ok: true });
    } catch (err) {
      callback?.({ ok: false, error: err.message });
    }
  });

  // ── Kick Player ────────────────────────────────────────
  socket.on("kick_player", async ({ targetUserId }, callback) => {
    try {
      if (!socket.currentRoomId) throw new Error("NOT_IN_ROOM");
      const roomId = socket.currentRoomId;
      const room = await getRoom(roomId);
      if (!room) throw new Error("ROOM_NOT_FOUND");

      if (parseInt(room.createdBy) !== parseInt(user.id)) {
        throw new Error("UNAUTHORIZED");
      }

      const seats = Object.values(room.seats);
      const targetInRoom = seats.find((s) => s && parseInt(s.userId) === parseInt(targetUserId));
      if (!targetInRoom) throw new Error("TARGET_PLAYER_NOT_IN_ROOM");

      await leaveRoom(roomId, targetUserId, true);

      const sockets = await io.in(roomId).fetchSockets();
      const targetSocket = sockets.find((s) => s.user?.id === targetUserId);
      if (targetSocket) {
        targetSocket.leave(roomId);
        targetSocket.currentRoomId = null;
        targetSocket.emit("kicked", { reason: "You were kicked by the table admin." });
      }

      io.to(roomId).emit("player_left", { userId: targetUserId, username: targetInRoom.username, reason: "kicked" });
      const updatedRoom = await getRoom(roomId);
      io.to(roomId).emit("player_joined", { room: updatedRoom, newPlayer: null });

      callback?.({ ok: true });
    } catch (err) {
      callback?.({ ok: false, error: err.message });
    }
  });

  // ── Chat ───────────────────────────────────────────────
  socket.on("send_chat", async ({ message }) => {
    if (!socket.currentRoomId || !message?.trim()) return;
    const room = await getRoom(socket.currentRoomId);
    if (!room) return;
    const seatsCount = Object.values(room.seats).filter(Boolean).length;
    if (seatsCount < 2) return;

    io.to(socket.currentRoomId).emit("chat_message", {
      userId: user.id,
      username: user.username,
      message: message.trim().slice(0, 200),
      timestamp: Date.now(),
    });
  });

  // ── Lobby Chat ─────────────────────────────────────────
  socket.on("join_lobby", () => {
    socket.join("lobby");
  });

  socket.on("send_lobby_chat", ({ message }) => {
    if (!message?.trim()) return;
    io.to("lobby").emit("lobby_message", {
      userId: user.id,
      username: user.username,
      message: message.trim().slice(0, 200),
      role: user.role,
      timestamp: Date.now(),
    });
  });

  // ── Disconnect handling ────────────────────────────────
  socket.on("disconnect", async () => {
    socket.leave("lobby");

    if (socket.currentRoomId) {
      const roomId = socket.currentRoomId;
      
      if (roomId.startsWith("SOLO-")) {
        const { deleteGameState } = require("../redis/gameState");
        const { deleteRoom } = require("../redis/rooms");
        await deleteGameState(roomId);
        await deleteRoom(roomId);
        console.log(`[Disconnect] Instantly cleaned up solo room and game ${roomId}`);
        return;
      }

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
    }

    // Admin clean-up when disconnected from website
    const adminRooms = await findAdminRoomsByUserId(user.id);
    for (const r of adminRooms) {
      const seats = Object.values(r.seats);
      const playerCount = seats.filter(Boolean).length;
      if (playerCount === 0) {
        await deleteRoom(r.id);
        io.to(r.id).emit("room_closed", { reason: "admin_disconnected" });
      }
    }
  });
}

async function startGame(io, roomId, room, dealerSeat = 0) {
  await updateRoomMetadata(roomId, { status: "in_progress" });
  const seats = Object.values(room.seats);
  const gameState = createGameState(seats, dealerSeat);
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

  const room = await getRoom(roomId);
  if (!room) return;

  // Check if admin is connected to the website
  const sockets = await io.fetchSockets();
  const isAdminConnected = sockets.some((s) => s.user?.id === parseInt(room.createdBy));

  // Leave room in Redis
  const result = await leaveRoom(roomId, socket.user.id, isAdminConnected);
  socket.leave(roomId);
  socket.currentRoomId = null;

  if (result?.deleted) {
    io.to(roomId).emit("room_closed", { reason: "last_player_left" });
  } else {
    io.to(roomId).emit("player_left", { userId: socket.user.id, username: socket.user.username, reason });
    if (result?.newAdminId) {
      const updatedRoom = await getRoom(roomId);
      io.to(roomId).emit("room_updated", { room: updatedRoom });
      io.to(roomId).emit("chat_message", {
        userId: "system",
        username: "System",
        message: `${result.newAdminUsername} is now the table admin.`,
        timestamp: Date.now(),
      });
    }
  }
}

module.exports = { registerRoomHandlers };
