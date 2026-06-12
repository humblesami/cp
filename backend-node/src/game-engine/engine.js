const { deal, getSuit } = require("./deck");
const { isLegalPlay } = require("./validator");
const { resolveTrick, getTeam } = require("./trick");
const { scoreHand, detectCoat, checkMatchOver } = require("./scorer");

/**
 * Creates the initial game state when 4 players are seated.
 * @param {Array} seats - array of 4 {userId, username} objects indexed by seat
 */
function createGameState(seats, dealerSeat = 0) {
  const hands = deal();
  const trumpCallerSeat = (dealerSeat + 1) % 4;

  return {
    phase: "trump_selection",     // trump_selection | playing | hand_complete | match_over
    dealerSeat,
    trumpCallerSeat,
    trump: null,
    turn: trumpCallerSeat,        // trump caller leads first trick after declaring
    seats,                        // [{ userId, username, isBot }, ...]
    hands,                        // [ [cards], [cards], [cards], [cards] ]
    currentTrick: {
      ledBy: null,
      cards: { 0: null, 1: null, 2: null, 3: null },
    },
    trickWinners: [],             // seat indices of trick winners in order
    completedTricks: [],          // full trick history of the current hand
    score: { A: 0, B: 0 },       // match score (hands won)
    handResults: [],              // history of hand results
    startedAt: Date.now(),
  };
}

/**
 * Process trump declaration. Returns updated state or throws.
 */
function declareTrump(state, seatIndex, trumpSuit) {
  if (state.phase !== "trump_selection") throw new Error("Not in trump selection phase");
  if (seatIndex !== state.trumpCallerSeat) throw new Error("Not your turn to declare trump");
  if (!["S", "H", "D", "C"].includes(trumpSuit)) throw new Error("Invalid suit");

  return {
    ...state,
    trump: trumpSuit,
    phase: "playing",
    turn: state.trumpCallerSeat,  // trump caller leads first trick
  };
}

/**
 * Process a card play. Returns { newState, trickComplete, trickWinner, coatDetected, handComplete, handResult }.
 */
function playCard(state, seatIndex, card) {
  if (state.phase !== "playing") throw new Error("Game not in playing phase");
  if (state.turn !== seatIndex) throw new Error("Not your turn");

  const hand = state.hands[seatIndex];
  if (!isLegalPlay(card, hand, state.currentTrick, state.trump)) {
    throw new Error("Illegal card play");
  }

  // Remove card from hand
  const newHands = state.hands.map((h, i) =>
    i === seatIndex ? h.filter((c) => c !== card) : h
  );

  // Add to trick
  const newTrick = {
    ...state.currentTrick,
    ledBy: state.currentTrick.ledBy === null ? seatIndex : state.currentTrick.ledBy,
    cards: { ...state.currentTrick.cards, [seatIndex]: card },
  };

  // Check if all 4 players have played
  const allPlayed = Object.values(newTrick.cards).every((c) => c !== null);

  if (!allPlayed) {
    // Next player's turn
    const nextTurn = (seatIndex + 1) % 4;
    return {
      newState: { ...state, hands: newHands, currentTrick: newTrick, turn: nextTurn },
      trickComplete: false,
    };
  }

  // Trick complete — resolve winner
  const trickWinner = resolveTrick(newTrick, state.trump);
  const newTrickWinners = [...state.trickWinners, trickWinner];

  // Check coat (first 7 consecutive)
  const coatWinner = detectCoat(newTrickWinners);

  // Check if all 13 tricks done
  const handComplete = newTrickWinners.length === 13 || coatWinner !== null;

  let handResult = null;
  let newScore = { ...state.score };
  let newPhase = "playing";

  if (handComplete) {
    handResult = scoreHand(newTrickWinners);
    newScore.A = state.score.A + handResult.pointsA;
    newScore.B = state.score.B + handResult.pointsB;
    const matchWinner = checkMatchOver(newScore.A, newScore.B);
    newPhase = matchWinner ? "match_over" : "hand_complete";
  }

  const nextTurn = handComplete ? null : trickWinner;

  const completedTrick = {
    ledBy: newTrick.ledBy,
    cards: newTrick.cards,
    winner: trickWinner,
  };

  const newState = {
    ...state,
    hands: newHands,
    currentTrick: handComplete
      ? { ledBy: null, cards: { 0: null, 1: null, 2: null, 3: null } }
      : { ledBy: trickWinner, cards: { 0: null, 1: null, 2: null, 3: null } },
    trickWinners: newTrickWinners,
    completedTricks: [...(state.completedTricks || []), completedTrick],
    turn: nextTurn,
    score: newScore,
    phase: newPhase,
    handResults: handComplete ? [...state.handResults, handResult] : state.handResults,
  };

  return { newState, trickComplete: true, trickWinner, coatDetected: coatWinner, handComplete, handResult };
}

/**
 * Start a new hand (called after hand_complete, if players continue).
 */
function startNewHand(state) {
  const newDealerSeat = (state.dealerSeat + 1) % 4;
  const hands = deal();
  const trumpCallerSeat = (newDealerSeat + 1) % 4;

  return {
    ...state,
    phase: "trump_selection",
    dealerSeat: newDealerSeat,
    trumpCallerSeat,
    trump: null,
    turn: trumpCallerSeat,
    hands,
    currentTrick: { ledBy: null, cards: { 0: null, 1: null, 2: null, 3: null } },
    trickWinners: [],
    completedTricks: [],
  };
}

/**
 * Build the state payload to send to a specific player (hides other players' cards).
 */
function getPlayerView(state, seatIndex) {
  return {
    phase: state.phase,
    trump: state.trump,
    turn: state.turn,
    trumpCallerSeat: state.trumpCallerSeat,
    dealerSeat: state.dealerSeat,
    yourSeat: seatIndex,
    yourHand: state.hands[seatIndex],
    handSizes: state.hands.map((h) => h.length),
    currentTrick: state.currentTrick,
    trickWinners: state.trickWinners,
    completedTricks: state.completedTricks || [],
    score: state.score,
    seats: state.seats,
    lastHandResult: state.handResults[state.handResults.length - 1] || null,
  };
}

module.exports = { createGameState, declareTrump, playCard, startNewHand, getPlayerView };
