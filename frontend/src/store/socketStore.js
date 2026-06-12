import { create } from "zustand";
import { io } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

export const useSocketStore = create((set, get) => ({
  socket: null,
  connected: false,

  // Room state
  currentRoomId: null,
  roomPlayers: [],

  // Game state (player's own view)
  gamePhase: null,       // trump_selection | playing | hand_complete | match_over
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

  // UI state
  lastPlayedCard: null,   // { seatIndex, card } for animation
  lastTrickWinner: null,
  chatMessages: [],
  notification: null,

  // ── Connect ────────────────────────────────────────────
  connect(token) {
    if (get().socket?.connected) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
    });

    socket.on("connect", () => set({ connected: true }));
    socket.on("disconnect", () => set({ connected: false }));

    // Room events
    socket.on("player_joined", ({ room, newPlayer }) => {
      const seats = Object.values(room.seats);
      set({ roomPlayers: seats });
    });

    socket.on("player_left", ({ userId, username }) => {
      set((s) => ({
        roomPlayers: s.roomPlayers.map((p) =>
          p?.userId === userId ? null : p
        ),
        notification: `${username} left the room`,
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
    set({ socket: null, connected: false });
  },

  // ── Actions (emit helpers) ──────────────────────────────
  createRoom(name, isPrivate = false) {
    return emitWithAck(get().socket, "create_room", { name, isPrivate });
  },

  joinRoom(roomId) {
    return emitWithAck(get().socket, "join_room", { roomId });
  },

  leaveRoom() {
    return emitWithAck(get().socket, "leave_room", {});
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

  sendChat(message) {
    get().socket?.emit("send_chat", { message });
  },

  clearNotification() {
    set({ notification: null });
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function flattenView(view) {
  return {
    gamePhase: view.phase,
    yourSeat: view.yourSeat,
    yourHand: view.yourHand,
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
