const { getGameState, saveGameState, deleteGameState } = require("../redis/gameState");
const { getRoom } = require("../redis/rooms");
const { declareTrump, playCard, startNewHand, getPlayerView } = require("../game-engine/engine");
const { botChooseCard, botChooseTrump } = require("../game-engine/bot");
const axios = require("axios");

function registerGameHandlers(io, socket) {
  const { user } = socket;

  // ── Declare Trump ──────────────────────────────────────
  socket.on("declare_trump", async ({ trump }, callback) => {
    const roomId = socket.currentRoomId;
    if (!roomId) return callback?.({ ok: false, error: "Not in a room" });

    try {
      const state = await getGameState(roomId);
      const seatIndex = state.seats.findIndex((s) => s && s.userId === user.id);

      const newState = declareTrump(state, seatIndex, trump);
      await saveGameState(roomId, newState);

      io.to(roomId).emit("trump_declared", { trump, callerSeat: seatIndex, callerUsername: user.username });
      await broadcastPlayerViews(io, roomId, newState);

      callback?.({ ok: true });
    } catch (err) {
      callback?.({ ok: false, error: err.message });
    }
  });

  // ── Play Card ──────────────────────────────────────────
  socket.on("play_card", async ({ card }, callback) => {
    const roomId = socket.currentRoomId;
    if (!roomId) return callback?.({ ok: false, error: "Not in a room" });

    try {
      const state = await getGameState(roomId);
      const seatIndex = state.seats.findIndex((s) => s && s.userId === user.id);

      const result = await processCardPlay(io, roomId, state, seatIndex, card);
      callback?.({ ok: true });
    } catch (err) {
      callback?.({ ok: false, error: err.message });
    }
  });

  // ── Continue (new hand after hand_complete) ────────────
  socket.on("continue_game", async (_, callback) => {
    const roomId = socket.currentRoomId;
    if (!roomId) return;

    const state = await getGameState(roomId);
    if (state?.phase !== "hand_complete") return callback?.({ ok: false });

    const newState = startNewHand(state);
    await saveGameState(roomId, newState);

    await broadcastPlayerViews(io, roomId, newState);
    io.to(roomId).emit("new_hand_started", { dealerSeat: newState.dealerSeat, trumpCallerSeat: newState.trumpCallerSeat });
    callback?.({ ok: true });
  });

  // ── Request State Snapshot (on reconnect/refresh) ──────
  socket.on("request_state", async (_, callback) => {
    const roomId = socket.currentRoomId;
    if (!roomId) return;

    const state = await getGameState(roomId);
    if (!state) return callback?.({ ok: false });

    const seatIndex = state.seats.findIndex((s) => s && s.userId === user.id);
    socket.emit("game_state_snapshot", getPlayerView(state, seatIndex));
    callback?.({ ok: true });
  });
}

/**
 * Core card-play processor. Used by both human plays and bot plays.
 */
async function processCardPlay(io, roomId, state, seatIndex, card) {
  const { newState, trickComplete, trickWinner, coatDetected, handComplete, handResult } = playCard(state, seatIndex, card);

  await saveGameState(roomId, newState);

  // Broadcast the played card to everyone
  io.to(roomId).emit("card_played", { seatIndex, card, turn: newState.turn });

  if (trickComplete) {
    await delay(500); // small pause before showing trick result
    io.to(roomId).emit("trick_won", {
      winningSeat: trickWinner,
      winningTeam: newState.trickWinners.length > 0 ? getTeamOf(trickWinner) : null,
      tricksCount: { A: newState.trickWinners.filter(s => getTeamOf(s) === "A").length, B: newState.trickWinners.filter(s => getTeamOf(s) === "B").length },
      coat: coatDetected,
    });
  }

  if (handComplete) {
    await delay(1500);
    io.to(roomId).emit("hand_complete", { result: handResult, score: newState.score });

    if (newState.phase === "match_over") {
      const matchWinner = newState.score.A >= 7 ? "A" : "B";
      io.to(roomId).emit("match_over", { winner: matchWinner, score: newState.score });
      await recordMatchToNextjs(roomId, newState, matchWinner);
      await deleteGameState(roomId);
      return;
    }
  }

  // Send updated hands to each player (after card removed)
  await broadcastPlayerViews(io, roomId, newState);

  // If next turn is a bot, schedule bot play
  if (!handComplete && newState.turn !== null) {
    const nextSeat = newState.turn;
    if (newState.seats[nextSeat]?.isBot) {
      setTimeout(() => triggerBotPlay(io, roomId, newState, nextSeat), 1200);
    }
  }
}

async function triggerBotPlay(io, roomId, state, botSeat) {
  const fresh = await getGameState(roomId); // re-read in case state changed
  if (!fresh || fresh.turn !== botSeat) return;

  const card = botChooseCard(
    fresh.hands[botSeat],
    fresh.currentTrick,
    fresh.trump,
    botSeat
  );

  await processCardPlay(io, roomId, fresh, botSeat, card);
}

async function broadcastPlayerViews(io, roomId, state) {
  const sockets = await io.in(roomId).fetchSockets();
  for (const s of sockets) {
    const seatIndex = state.seats.findIndex((seat) => seat && seat.userId === s.user?.id);
    if (seatIndex >= 0) {
      s.emit("state_update", getPlayerView(state, seatIndex));
    }
  }
}

async function triggerBotTrump(io, roomId, state, botSeat) {
  const fresh = await getGameState(roomId);
  if (!fresh || fresh.phase !== "trump_selection" || fresh.trumpCallerSeat !== botSeat) return;

  const trumpSuit = botChooseTrump(fresh.hands[botSeat]);
  const newState = declareTrump(fresh, botSeat, trumpSuit);
  await saveGameState(roomId, newState);

  io.to(roomId).emit("trump_declared", { 
    trump: trumpSuit, 
    callerSeat: botSeat, 
    callerUsername: fresh.seats[botSeat]?.username || "Bot" 
  });
  await broadcastPlayerViews(io, roomId, newState);

  // After declaring trump, the bot also leads the first trick!
  if (newState.turn === botSeat) {
    setTimeout(() => triggerBotPlay(io, roomId, newState, botSeat), 1200);
  }
}

async function recordMatchToNextjs(roomId, state, winningTeam) {
  try {
    const teamASeats = [0, 2];
    const teamBSeats = [1, 3];
    const teamAIds = teamASeats.map((i) => state.seats[i]?.userId).filter(Boolean);
    const teamBIds = teamBSeats.map((i) => state.seats[i]?.userId).filter(Boolean);

    const frontendUrl = process.env.FRONTEND_API_URL || "http://localhost:3000";

    await axios.post(`${frontendUrl}/api/matches/record`, {
      room_id: roomId,
      team_a_user_ids: teamAIds,
      team_b_user_ids: teamBIds,
      winning_team: winningTeam,
      score_a: state.score.A,
      score_b: state.score.B,
      court_achieved: state.handResults.some((r) => r.isCourt),
      coat_achieved: state.handResults.some((r) => r.isCoat),
      started_at: new Date(state.startedAt).toISOString(),
    });
  } catch (err) {
    console.error("Failed to record match to Next.js API:", err.message);
  }
}

function getTeamOf(seat) { return seat % 2 === 0 ? "A" : "B"; }
function delay(ms) { return new Promise((r) => setTimeout(r, ms)); }

module.exports = { registerGameHandlers, triggerBotPlay, triggerBotTrump };
