import { create } from "zustand";
import { io } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

const DEFAULT_GAME_ROOM_STATE = {
  currentRoomId: null,
  roomPlayers: [],
  roomName: "",
  roomDescription: "",
  roomAdminId: null,
  roomIsPrivate: false,
  gamePhase: null,
  yourSeat: null,
  yourHand: [],
  handSizes: [0, 0, 0, 0],
  currentTrick: null,
  trump: null,
  turn: null,
  score: { A: 0, B: 0 },
  seats: [],
  trickWinners: [],
  lastHandResult: null,
  trumpCallerSeat: null,
  lastPlayedCard: null,
  lastTrickWinner: null,
  chatMessages: [],
  notification: null,
};

export const useSocketStore = create((set, get) => ({
  socket: null,
  connected: false,
  ...DEFAULT_GAME_ROOM_STATE,

  // Lobby state
  lobbyMessages: [],

  // ── Connect ────────────────────────────────────────────
  connect(token) {
    if (get().socket?.connected) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      console.log("Socket connected successfully to:", SOCKET_URL);
      set({ connected: true });
    });
    socket.on("disconnect", () => {
      console.log("Socket disconnected from:", SOCKET_URL);
      set({ connected: false });
    });
    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message, err);
      set({ connected: false });
    });

    // Room events
    socket.on("player_joined", ({ room, newPlayer }) => {
      const seats = Object.values(room.seats);
      set({ 
        roomPlayers: seats,
        roomName: room.name,
        roomDescription: room.description || "",
        roomAdminId: room.createdBy,
        roomIsPrivate: room.isPrivate,
      });
    });

    socket.on("room_updated", ({ room }) => {
      const seats = Object.values(room.seats);
      set({ 
        roomPlayers: seats,
        roomName: room.name,
        roomDescription: room.description || "",
        roomAdminId: room.createdBy,
        roomIsPrivate: room.isPrivate,
      });
    });

    socket.on("player_left", ({ userId, username, reason }) => {
      set((s) => ({
        roomPlayers: s.roomPlayers.map((p) =>
          p?.userId === userId ? null : p
        ),
        notification: reason === "kicked" ? `${username} was kicked from the table` : `${username} left the room`,
      }));
    });

    socket.on("player_disconnected", ({ username, reconnectWindowMs }) => {
      set({ notification: `${username} disconnected. Waiting ${reconnectWindowMs / 1000}s…` });
    });

    socket.on("bot_substituted", ({ seat, username }) => {
      set({ notification: `${username} was replaced by a bot` });
    });

    socket.on("game_starting", ({ countdown }) => {
      set({ notification: `Game starting in ${countdown}…` });
    });

    socket.on("chat_message", (msg) => {
      set((s) => ({ chatMessages: [...s.chatMessages.slice(-99), msg] }));
    });

    socket.on("room_closed", ({ reason }) => {
      set({
        currentRoomId: null,
        roomPlayers: [],
        roomName: "",
        roomDescription: "",
        roomAdminId: null,
        notification: reason === "admin_disconnected" ? "Table closed: Admin disconnected." : "Table closed.",
      });
    });

    socket.on("kicked", ({ reason }) => {
      set({
        currentRoomId: null,
        roomPlayers: [],
        roomName: "",
        roomDescription: "",
        roomAdminId: null,
        notification: reason || "You were kicked from the table.",
      });
    });

    socket.on("lobby_message", (msg) => {
      set((s) => ({ lobbyMessages: [...s.lobbyMessages.slice(-99), msg] }));
    });

    // Game events
    socket.on("game_started", (playerView) => {
      set({ ...flattenView(playerView), gamePhase: playerView.phase });
    });

    socket.on("state_update", (playerView) => {
      set({ ...flattenView(playerView) });
    });

    socket.on("game_state_snapshot", (playerView) => {
      set({ ...flattenView(playerView) });
    });

    socket.on("trump_declared", ({ trump, callerSeat, callerUsername }) => {
      set({ trump, notification: `${callerUsername} declared ${suitName(trump)} as trump` });
    });

    socket.on("card_played", ({ seatIndex, card, turn }) => {
      set({ lastPlayedCard: { seatIndex, card }, turn });
    });

    socket.on("trick_won", ({ winningSeat, tricksCount, coat }) => {
      set({
        lastTrickWinner: winningSeat,
        notification: coat ? `🎉 COAT! Team ${coat} wins the hand!` : null,
      });
    });

    socket.on("hand_complete", ({ result, score }) => {
      set({ score, lastHandResult: result, gamePhase: "hand_complete" });
    });

    socket.on("match_over", ({ winner, score }) => {
      set({ score, gamePhase: "match_over", notification: `Team ${winner} wins the match!` });
    });

    set({ socket });
  },

  disconnect() {
    get().socket?.disconnect();
    set({ 
      socket: null, 
      connected: false,
      ...DEFAULT_GAME_ROOM_STATE,
      lobbyMessages: [],
    });
  },

  // ── Actions (emit helpers) ──────────────────────────────
  createRoom(name, description = "", isPrivate = false) {
    set(DEFAULT_GAME_ROOM_STATE);
    return emitWithAck(get().socket, "create_room", { name, description, isPrivate });
  },

  createSoloRoom() {
    set(DEFAULT_GAME_ROOM_STATE);
    return emitWithAck(get().socket, "create_solo_room", {});
  },

  joinRoom(roomId) {
    set(DEFAULT_GAME_ROOM_STATE);
    return emitWithAck(get().socket, "join_room", { roomId });
  },

  leaveRoom() {
    set(DEFAULT_GAME_ROOM_STATE);
    return emitWithAck(get().socket, "leave_room", {});
  },

  updateRoom(name, description) {
    return emitWithAck(get().socket, "update_room", { name, description });
  },

  transferAdmin(targetUserId) {
    return emitWithAck(get().socket, "transfer_admin", { targetUserId });
  },

  kickPlayer(targetUserId) {
    return emitWithAck(get().socket, "kick_player", { targetUserId });
  },

  joinLobby() {
    get().socket?.emit("join_lobby");
  },

  sendLobbyChat(message) {
    get().socket?.emit("send_lobby_chat", { message });
  },

  declareTrump(trump) {
    return emitWithAck(get().socket, "declare_trump", { trump });
  },

  playCard(card) {
    return emitWithAck(get().socket, "play_card", { card });
  },

  continueGame() {
    return emitWithAck(get().socket, "continue_game", {});
  },

  checkActiveGame() {
    return emitWithAck(get().socket, "check_active_game", {});
  },

  sendChat(message) {
    get().socket?.emit("send_chat", { message });
  },

  clearNotification() {
    set({ notification: null });
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const SUIT_ORDER = { D: 0, C: 1, H: 2, S: 3 };
const RANK_ORDER = {
  "2": 0, "3": 1, "4": 2, "5": 3, "6": 4, "7": 5, "8": 6, "9": 7,
  "T": 8, "J": 9, "Q": 10, "K": 11, "A": 12
};

function sortHand(hand) {
  if (!hand) return [];
  return [...hand].sort((a, b) => {
    const suitA = a[1];
    const suitB = b[1];
    if (suitA !== suitB) {
      return SUIT_ORDER[suitA] - SUIT_ORDER[suitB];
    }
    const rankA = a[0];
    const rankB = b[0];
    return RANK_ORDER[rankA] - RANK_ORDER[rankB]; // Ascending rank (2 up to A)
  });
}

function flattenView(view) {
  return {
    gamePhase: view.phase,
    yourSeat: view.yourSeat,
    yourHand: sortHand(view.yourHand),
    handSizes: view.handSizes,
    currentTrick: view.currentTrick,
    trump: view.trump,
    turn: view.turn,
    score: view.score,
    seats: view.seats,
    trickWinners: view.trickWinners,
    lastHandResult: view.lastHandResult,
    trumpCallerSeat: view.trumpCallerSeat,
  };
}

function emitWithAck(socket, event, data) {
  return new Promise((resolve) => {
    if (!socket) return resolve({ ok: false, error: "Not connected" });
    socket.emit(event, data, resolve);
  });
}

function suitName(suit) {
  return { S: "Spades ♠", H: "Hearts ♥", D: "Diamonds ♦", C: "Clubs ♣" }[suit] || suit;
}
