const { resolveTrick } = require("../src/game-engine/trick");
const { getLegalCards, isLegalPlay } = require("../src/game-engine/validator");
const { scoreHand, detectCoat, detectCourt } = require("../src/game-engine/scorer");
const { deal } = require("../src/game-engine/deck");
const { createGameState, declareTrump, playCard } = require("../src/game-engine/engine");

// ── Trick resolution ──────────────────────────────────────────────────────────

describe("resolveTrick", () => {
  test("highest card of led suit wins (no trump played)", () => {
    const trick = { ledBy: 0, cards: { 0: "KS", 1: "QS", 2: "JS", 3: "TS" } };
    expect(resolveTrick(trick, "H")).toBe(0); // King wins
  });

  test("trump beats highest led suit card", () => {
    const trick = { ledBy: 0, cards: { 0: "AS", 1: "2H", 2: "QS", 3: "JS" } };
    expect(resolveTrick(trick, "H")).toBe(1); // 2 of Hearts (trump) beats Ace of Spades
  });

  test("highest trump wins when multiple trumps played", () => {
    const trick = { ledBy: 0, cards: { 0: "AS", 1: "2H", 2: "KH", 3: "JS" } };
    expect(resolveTrick(trick, "H")).toBe(2); // KH beats 2H
  });

  test("off-suit non-trump card cannot steal trick", () => {
    const trick = { ledBy: 0, cards: { 0: "AS", 1: "KH", 2: "AH", 3: "2D" } };
    // Led spades, player 3 plays diamond (off suit, no trump) — Heart is trump, player 2 wins
    expect(resolveTrick(trick, "C")).toBe(0); // No trump played, AS wins (led suit)
  });
});

// ── Legal card validation ─────────────────────────────────────────────────────

describe("getLegalCards", () => {
  test("can play any card when leading", () => {
    const hand = ["AS", "KH", "2D"];
    const legal = getLegalCards(hand, { ledBy: null, cards: {} }, "H");
    expect(legal).toEqual(hand);
  });

  test("must follow suit", () => {
    const hand = ["AS", "KH", "2S"];
    const trick = { ledBy: 0, cards: { 0: "QS" } };
    const legal = getLegalCards(hand, trick, "H");
    expect(legal).toEqual(["AS", "2S"]); // only spades
  });

  test("can play anything if cannot follow suit", () => {
    const hand = ["KH", "2D"];
    const trick = { ledBy: 0, cards: { 0: "QS" } };
    const legal = getLegalCards(hand, trick, "H");
    expect(legal).toEqual(["KH", "2D"]);
  });

  test("no ace on ace rule: removes ace when ace is led", () => {
    const hand = ["AS", "KS", "2H"];
    const trick = { ledBy: 1, cards: { 1: "AC" } };
    // Led suit is Clubs, hand has no clubs — no restriction applies here
    const legal = getLegalCards(hand, trick, "H");
    expect(legal).toEqual(["AS", "KS", "2H"]); // can't follow clubs, anything goes
  });

  test("no ace on ace: ace of led suit blocked when ace led", () => {
    const hand = ["AS", "KS", "2H"];
    const trick = { ledBy: 1, cards: { 1: "AS" } }; // ace of spades led
    const legal = getLegalCards(hand, trick, "H", true);
    expect(legal).toEqual(["KS"]); // AS blocked, must play KS
  });
});

// ── Scoring ───────────────────────────────────────────────────────────────────

describe("detectCoat", () => {
  test("detects coat when team wins first 7 in a row", () => {
    const winners = [0, 2, 0, 2, 0, 2, 0]; // Team A (even seats) wins first 7
    expect(detectCoat(winners)).toBe("A");
  });

  test("no coat if first 7 are split", () => {
    const winners = [0, 1, 0, 0, 0, 0, 0];
    expect(detectCoat(winners)).toBeNull();
  });
});

describe("detectCourt", () => {
  test("detects court when all 13 won by one team", () => {
    const winners = [0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0]; // all Team A
    expect(detectCourt(winners)).toBe("A");
  });

  test("no court if any trick won by other team", () => {
    const winners = [0, 1, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0];
    expect(detectCourt(winners)).toBeNull();
  });
});

describe("scoreHand", () => {
  test("team winning 7 tricks wins the hand (1 point)", () => {
    const winners = [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1]; // Team A wins 7
    const result = scoreHand(winners);
    expect(result.winningTeam).toBe("A");
    expect(result.pointsA).toBe(1);
    expect(result.pointsB).toBe(0);
  });

  test("court gives 2 points and subtracts 2 from loser", () => {
    const winners = [0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0]; // Team A wins all 13
    const result = scoreHand(winners);
    expect(result.isCourt).toBe(true);
    expect(result.pointsA).toBe(2);
    expect(result.pointsB).toBe(-2);
  });
});

// ── Deal ─────────────────────────────────────────────────────────────────────

describe("deal", () => {
  test("deals 52 unique cards to 4 players", () => {
    const hands = deal();
    expect(hands).toHaveLength(4);
    hands.forEach((h) => expect(h).toHaveLength(13));
    const all = hands.flat();
    expect(new Set(all).size).toBe(52);
  });
});

// ── Game Loop Simulation ──────────────────────────────────────────────────────

describe("Game Loop Simulation", () => {
  test("full trick completion resets currentTrick ledBy to null", () => {
    const seats = [
      { userId: 1, username: "P1", isBot: false },
      { userId: 2, username: "P2", isBot: true },
      { userId: 3, username: "P3", isBot: true },
      { userId: 4, username: "P4", isBot: true },
    ];
    let state = createGameState(seats, 0); // Dealer is 0, caller is 1

    // Force trump selection phase to playing
    state = declareTrump(state, 1, "S");
    expect(state.phase).toBe("playing");
    expect(state.turn).toBe(1);

    // Mock hands to ensure controlled play
    state.hands = [
      ["AS", "KS"], // Seat 0
      ["QS", "JS"], // Seat 1
      ["TS", "9S"], // Seat 2
      ["8S", "7S"], // Seat 3
    ];

    // Play Trick 1
    // Player 1 leads
    let play1 = playCard(state, 1, "QS");
    state = play1.newState;
    expect(state.currentTrick.ledBy).toBe(1);

    // Player 2 follows
    let play2 = playCard(state, 2, "TS");
    state = play2.newState;

    // Player 3 follows
    let play3 = playCard(state, 3, "8S");
    state = play3.newState;

    // Player 0 follows
    let play4 = playCard(state, 0, "AS");
    state = play4.newState;

    // Trick 1 should be complete
    expect(play4.trickComplete).toBe(true);
    expect(play4.trickWinner).toBe(0); // Player 0 wins with AS

    // Current trick should reset ledBy to null
    expect(state.currentTrick.ledBy).toBeNull();
    expect(state.turn).toBe(0); // Winner leads next trick

    // Now let's try getting legal cards for Player 0 (leading next trick)
    const legalLead = getLegalCards(state.hands[0], state.currentTrick, state.trump);
    expect(legalLead).toEqual(["KS"]); // Only KS left

    // Play first card of second trick
    let play5 = playCard(state, 0, "KS");
    state = play5.newState;
    expect(state.currentTrick.ledBy).toBe(0); // Led by Player 0
  });
});
