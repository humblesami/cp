const { getSuit, getRankValue, isTrump, isAce } = require("./deck");

/**
 * Determines the effective rank value of a card, checking if it is an Ace played
 * immediately after another Ace by the same player in adjacent tricks.
 */
function getEffectiveRankValue(card, seatIndex, lastTrick) {
  if (isAce(card) && lastTrick && lastTrick.cards && isAce(lastTrick.cards[seatIndex])) {
    return -1; // Treated as 1 (minimum card of a suit, below '2' which has rank value 0)
  }
  return getRankValue(card);
}

/**
 * Given a completed trick (all 4 cards played), determine who wins.
 * @param {Object} trick - { ledBy: seatIndex, cards: { 0: card, 1: card, ... } }
 * @param {string} trump - suit letter e.g. "H"
 * @param {Object} [lastTrick] - the previous trick, if any
 * @returns {number} winning seat index
 */
function resolveTrick(trick, trump, lastTrick) {
  const { ledBy, cards } = trick;
  const ledSuit = getSuit(cards[ledBy]);

  let winningSeat = ledBy;
  let winningCard = cards[ledBy];

  for (const [seat, card] of Object.entries(cards)) {
    const seatInt = parseInt(seat);
    if (seatInt === ledBy) continue;

    if (beats(card, seatInt, winningCard, winningSeat, ledSuit, trump, lastTrick)) {
      winningSeat = seatInt;
      winningCard = card;
    }
  }

  return winningSeat;
}

/**
 * Returns true if challenger beats current winner.
 */
function beats(challenger, challengerSeat, currentWinner, winnerSeat, ledSuit, trump, lastTrick) {
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

  const chalVal = getEffectiveRankValue(challenger, challengerSeat, lastTrick);
  const winVal = getEffectiveRankValue(currentWinner, winnerSeat, lastTrick);

  return chalVal > winVal;
}

/** Returns which team a seat belongs to. Seats 0&2 = Team A, seats 1&3 = Team B */
function getTeam(seat) {
  if (seat === null || seat === undefined) return null;
  return parseInt(seat) % 2 === 0 ? "A" : "B";
}

module.exports = { resolveTrick, beats, getTeam, getEffectiveRankValue };
