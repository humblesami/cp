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

// ── Double Sir Game Loop Simulation ───────────────────────────────────────────

describe("Double Sir Game Loop Simulation", () => {
  test("Double Sir rules verification", () => {
    const seats = [
      { userId: 1, username: "P1", isBot: false },
      { userId: 2, username: "P2", isBot: true },
      { userId: 3, username: "P3", isBot: true },
      { userId: 4, username: "P4", isBot: true },
    ];
    let state = createGameState(seats, 0); // Dealer is 0, caller is 1
    state = declareTrump(state, 1, "S");

    // Mock hands to ensure controlled play
    state.hands = [
      ["AS", "KS", "2D", "3D"], // Seat 0
      ["QS", "JS", "4D", "5D"], // Seat 1
      ["TS", "9S", "6D", "7D"], // Seat 2
      ["8S", "7S", "8D", "9D"], // Seat 3
    ];

    // --- Trick 0 (first trick) ---
    // Player 1 leads with QS
    let p1 = playCard(state, 1, "QS"); state = p1.newState;
    // Player 2 follows with TS
    let p2 = playCard(state, 2, "TS"); state = p2.newState;
    // Player 3 follows with 8S
    let p3 = playCard(state, 3, "8S"); state = p3.newState;
    // Player 0 follows with AS
    let p4 = playCard(state, 0, "AS"); state = p4.newState;

    expect(p4.trickComplete).toBe(true);
    // Under Double Sir, first trick winner is null (ignored)
    expect(p4.trickWinner).toBeNull();
    // But Player 0 kept senior, so Player 0 leads next trick
    expect(state.turn).toBe(0);
    expect(state.trickWinners[0]).toBeNull();

    // --- Trick 1 ---
    // Player 0 leads with KS
    p1 = playCard(state, 0, "KS"); state = p1.newState;
    // Player 1 follows with JS
    p2 = playCard(state, 1, "JS"); state = p2.newState;
    // Player 2 follows with 9S
    p3 = playCard(state, 2, "9S"); state = p3.newState;
    // Player 3 follows with 7S
    p4 = playCard(state, 3, "7S"); state = p4.newState;

    expect(p4.trickComplete).toBe(true);
    // Trick 1 completed. Senior is Player 0.
    // However, since Trick 0 was ignored, Player 0 has only kept senior once starting from Trick 1.
    // So trickWinner is still null.
    expect(p4.trickWinner).toBeNull();
    expect(state.turn).toBe(0);

    // --- Trick 2 ---
    // Player 0 leads with 2D (off-suit)
    p1 = playCard(state, 0, "2D"); state = p1.newState;
    // Player 1 plays 4D
    p2 = playCard(state, 1, "4D"); state = p2.newState;
    // Player 2 plays 6D
    p3 = playCard(state, 2, "6D"); state = p3.newState;
    // Player 3 plays 8D
    p4 = playCard(state, 3, "8D"); state = p4.newState;

    expect(p4.trickComplete).toBe(true);
    // Senior of Trick 2 is Player 3 (8D beats 6D, 4D, 2D).
    // Streak is broken. No one won the pile.
    expect(p4.trickWinner).toBeNull();
    expect(state.turn).toBe(3); // Player 3 leads next

    // --- Trick 3 ---
    // Player 3 leads with 9D
    p1 = playCard(state, 3, "9D"); state = p1.newState;
    // Player 0 plays 3D
    p2 = playCard(state, 0, "3D"); state = p2.newState;
    // Player 1 plays 5D
    p3 = playCard(state, 1, "5D"); state = p3.newState;
    // Player 2 plays 7D
    p4 = playCard(state, 2, "7D"); state = p4.newState;

    expect(p4.trickComplete).toBe(true);
    // Senior is Player 3 (9D is highest).
    // Player 3 was senior of Trick 2 AND Trick 3!
    // 9D is a non-Ace card, so it is allowed to win.
    // Player 3 should win/collect the pile (tricks 0, 1, 2, 3)!
    expect(p4.trickWinner).toBe(3);
    expect(state.trickWinners[0]).toBe(3);
    expect(state.trickWinners[1]).toBe(3);
    expect(state.trickWinners[2]).toBe(3);
    expect(state.trickWinners[3]).toBe(3);
    expect(state.turn).toBe(3);
  });

  test("Ace after Ace is demoted to rank value -1", () => {
    // Test that playing an Ace in adjacent tricks by same player demotes the second one
    const trick1 = { ledBy: 0, cards: { 0: "AH", 1: "2H", 2: "3H", 3: "4H" } };
    // Player 0 plays AH in trick 1.
    // In trick 2:
    const trick2 = { ledBy: 0, cards: { 0: "AS", 1: "2S", 2: "3S", 3: "4S" } };
    // Player 0 plays AS in trick 2.
    // Let's resolve trick 2 with trick1 as lastTrick:
    const winner = resolveTrick(trick2, "D", trick1);
    // Since AS is demoted to rank value -1, 4S (rank value 2) should beat it.
    // So Player 3 should win trick 2!
    expect(winner).toBe(3);
  });

  test("Ace winning consecutive trick does not collect the pile", () => {
    const seats = [
      { userId: 1, username: "P1", isBot: false },
      { userId: 2, username: "P2", isBot: true },
      { userId: 3, username: "P3", isBot: true },
      { userId: 4, username: "P4", isBot: true },
    ];
    let state = createGameState(seats, 0);
    state = declareTrump(state, 1, "S");

    // Mock hands to ensure controlled play
    state.hands = [
      ["AH", "KH", "AD", "KD"], // Seat 0
      ["QH", "JH", "QD", "JD"], // Seat 1
      ["TH", "9H", "TD", "9D"], // Seat 2
      ["8H", "7H", "8D", "7D"], // Seat 3
    ];

    // --- Trick 0 (first trick) ---
    // Player 1 leads with QH, Player 2 follows with TH, Player 3 follows with 8H, Player 0 follows with KH
    // Player 0 is senior (KH beats QH, TH, 8H). First trick ignored.
    let p1 = playCard(state, 1, "QH"); state = p1.newState;
    let p2 = playCard(state, 2, "TH"); state = p2.newState;
    let p3 = playCard(state, 3, "8H"); state = p3.newState;
    let p4 = playCard(state, 0, "KH"); state = p4.newState;

    expect(p4.trickWinner).toBeNull();
    expect(state.turn).toBe(0);

    // --- Trick 1 ---
    // Player 0 leads with KD, Player 1 follows with QD, Player 2 follows with TD, Player 3 follows with 8D
    // Player 0 is senior. Trick 1 complete, winner null.
    p1 = playCard(state, 0, "KD"); state = p1.newState;
    p2 = playCard(state, 1, "QD"); state = p2.newState;
    p3 = playCard(state, 2, "TD"); state = p3.newState;
    p4 = playCard(state, 3, "8D"); state = p4.newState;

    expect(p4.trickWinner).toBeNull();
    expect(state.turn).toBe(0);

    // --- Trick 2 ---
    // Player 0 leads with AD (Ace). Player 1 plays JD, Player 2 plays 9D, Player 3 plays 7D.
    // Player 0 is senior.
    // Player 0 has kept senior twice consecutively (Trick 1 and Trick 2).
    // But since Trick 2 is won by AD (Ace), Player 0 CANNOT collect the pile!
    p1 = playCard(state, 0, "AD"); state = p1.newState;
    p2 = playCard(state, 1, "JD"); state = p2.newState;
    p3 = playCard(state, 2, "9D"); state = p3.newState;
    p4 = playCard(state, 3, "7D"); state = p4.newState;

    expect(p4.trickWinner).toBeNull(); // Still null because of Ace rule!
    expect(state.turn).toBe(0);
  });
});
