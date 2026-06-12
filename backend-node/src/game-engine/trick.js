const { getSuit, getRankValue, isTrump } = require("./deck");

/**
 * Given a completed trick (all 4 cards played), determine who wins.
 * @param {Object} trick - { ledBy: seatIndex, cards: { 0: card, 1: card, ... } }
 * @param {string} trump - suit letter e.g. "H"
 * @returns {number} winning seat index
 */
function resolveTrick(trick, trump) {
  const { ledBy, cards } = trick;
  const ledSuit = getSuit(cards[ledBy]);

  let winningSeat = ledBy;
  let winningCard = cards[ledBy];

  for (const [seat, card] of Object.entries(cards)) {
    const seatInt = parseInt(seat);
    if (seatInt === ledBy) continue;

    if (beats(card, winningCard, ledSuit, trump)) {
      winningSeat = seatInt;
      winningCard = card;
    }
  }

  return winningSeat;
}

/**
 * Returns true if challenger beats current winner.
 */
function beats(challenger, currentWinner, ledSuit, trump) {
  const challengerTrump = getSuit(challenger) === trump;
  const winnerTrump = getSuit(currentWinner) === trump;

  // Trump beats non-trump
  if (challengerTrump && !winnerTrump) return true;
  if (!challengerTrump && winnerTrump) return false;

  // Both trump or both non-trump — compare by rank, but only if same suit
  if (getSuit(challenger) !== getSuit(currentWinner)) {
    // Different non-trump suits — challenger cannot beat current winner
    return false;
  }

  return getRankValue(challenger) > getRankValue(currentWinner);
}

/** Returns which team a seat belongs to. Seats 0&2 = Team A, seats 1&3 = Team B */
function getTeam(seat) {
  return parseInt(seat) % 2 === 0 ? "A" : "B";
}

module.exports = { resolveTrick, beats, getTeam };
