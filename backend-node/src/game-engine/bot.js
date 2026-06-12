const { getLegalCards } = require("./validator");
const { getSuit, getRankValue, isAce, isTrump } = require("./deck");
const { getTeam, resolveTrick } = require("./trick");

/**
 * Stateless rule-based bot. Given game state from bot's perspective, returns the card to play.
 */
function botChooseCard(hand, currentTrick, trump, seatIndex) {
  const legal = getLegalCards(hand, currentTrick, trump);

  // Leading the trick
  if (!currentTrick || currentTrick.ledBy === null) {
    return leadCard(legal, trump);
  }

  return followCard(legal, currentTrick, trump, seatIndex);
}

function leadCard(legal, trump) {
  // Prefer leading a high non-trump card
  const nonTrump = legal.filter((c) => !isTrump(c, trump));
  if (nonTrump.length > 0) {
    return highestCard(nonTrump);
  }
  return lowestCard(legal);
}

function followCard(legal, currentTrick, trump, seatIndex) {
  const partnerSeat = (seatIndex + 2) % 4;
  const partnerCard = currentTrick.cards[partnerSeat];

  // Is partner currently winning?
  const partnerIsWinning = partnerCard && isCurrentlyWinning(partnerSeat, currentTrick, trump);

  if (partnerIsWinning) {
    // Partner is winning — dump our lowest card
    return lowestCard(legal);
  }

  // Try to win the trick
  const winningCard = findLowestWinningCard(legal, currentTrick, trump);
  if (winningCard) return winningCard;

  // Can't win — dump lowest
  return lowestCard(legal);
}

function isCurrentlyWinning(seat, trick, trump) {
  const playedCards = Object.entries(trick.cards).filter(([, c]) => c !== null);
  if (playedCards.length === 0) return false;
  const ledSuit = getSuit(trick.cards[trick.ledBy]);

  let winningSeat = trick.ledBy;
  for (const [s, card] of playedCards) {
    if (parseInt(s) === trick.ledBy) continue;
    if (beats(card, trick.cards[winningSeat], ledSuit, trump)) {
      winningSeat = parseInt(s);
    }
  }
  return winningSeat === seat;
}

function beats(challenger, currentWinner, ledSuit, trump) {
  const ct = getSuit(challenger) === trump;
  const wt = getSuit(currentWinner) === trump;
  if (ct && !wt) return true;
  if (!ct && wt) return false;
  if (getSuit(challenger) !== getSuit(currentWinner)) return false;
  return getRankValue(challenger) > getRankValue(currentWinner);
}

function findLowestWinningCard(legal, trick, trump) {
  const ledSuit = getSuit(trick.cards[trick.ledBy]);
  const candidates = legal
    .filter((c) => {
      // Try to beat what's on the table
      const playedNonNull = Object.values(trick.cards).filter(Boolean);
      return playedNonNull.every((existing) => beats(c, existing, ledSuit, trump));
    })
    .sort((a, b) => getRankValue(a) - getRankValue(b));

  return candidates[0] || null;
}

function lowestCard(cards) {
  return [...cards].sort((a, b) => getRankValue(a) - getRankValue(b))[0];
}

function highestCard(cards) {
  return [...cards].sort((a, b) => getRankValue(b) - getRankValue(a))[0];
}

/**
 * Intelligent trump choice algorithm based on first 5 cards of the hand:
 * 1. Count cards of each suit.
 * 2. If ties exist, choose suit with highest card rank.
 * 3. If highest rank is same, choose suit with next highest (bigger lower) card rank.
 * 4. If all cards in candidate suits are identical, choose randomly between them.
 */
function botChooseTrump(hand) {
  const first5 = hand.slice(0, 5);

  const suitsData = {};
  for (const card of first5) {
    const suit = getSuit(card);
    const rankValue = getRankValue(card);
    if (!suitsData[suit]) {
      suitsData[suit] = { suit, count: 0, ranks: [] };
    }
    suitsData[suit].count += 1;
    suitsData[suit].ranks.push(rankValue);
  }

  // Sort ranks in descending order for lexicographical comparison
  for (const s in suitsData) {
    suitsData[s].ranks.sort((a, b) => b - a);
  }

  const list = Object.values(suitsData);
  let maxCount = 0;
  for (const item of list) {
    if (item.count > maxCount) {
      maxCount = item.count;
    }
  }

  const candidates = list.filter((item) => item.count === maxCount);

  // Sort candidates descending by element-by-element rank comparison
  candidates.sort((a, b) => {
    const len = a.ranks.length;
    for (let i = 0; i < len; i++) {
      if (a.ranks[i] !== b.ranks[i]) {
        return b.ranks[i] - a.ranks[i];
      }
    }
    return 0;
  });

  const winner = candidates[0];
  const ties = candidates.filter((item) => {
    if (item.ranks.length !== winner.ranks.length) return false;
    return item.ranks.every((val, idx) => val === winner.ranks[idx]);
  });

  const chosen = ties[Math.floor(Math.random() * ties.length)];
  return chosen.suit;
}

module.exports = { botChooseCard, botChooseTrump };
