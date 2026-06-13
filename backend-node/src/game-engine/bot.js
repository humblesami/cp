const { getLegalCards } = require("./validator");
const { getSuit, getRankValue, isAce, isTrump } = require("./deck");
const { beats, getEffectiveRankValue } = require("./trick");

/**
 * Stateless rule-based bot. Given game state from bot's perspective, returns the card to play.
 */
function botChooseCard(hand, currentTrick, trump, seatIndex, lastTrick) {
  const legal = getLegalCards(hand, currentTrick, trump);

  // Leading the trick
  if (!currentTrick || currentTrick.ledBy === null) {
    return leadCard(legal, hand, seatIndex, lastTrick);
  }

  return followCard(legal, currentTrick, trump, seatIndex, lastTrick);
}

function leadCard(legal, hand, seatIndex, lastTrick) {
  // Go for the max (of all) card except ace
  const nonAces = legal.filter((c) => !isAce(c));
  const candidates = nonAces.length > 0 ? nonAces : legal;

  // Find max rank value
  const maxRankVal = Math.max(...candidates.map((c) => getEffectiveRankValue(c, seatIndex, lastTrick)));
  const maxRankCards = candidates.filter((c) => getEffectiveRankValue(c, seatIndex, lastTrick) === maxRankVal);

  if (maxRankCards.length === 1) {
    return maxRankCards[0];
  }

  // Count cards of each suit in the hand
  const suitCounts = {};
  for (const card of hand) {
    const suit = getSuit(card);
    suitCounts[suit] = (suitCounts[suit] || 0) + 1;
  }

  // If more than one cards have max but equal rank, play the one having more cards of same suit
  maxRankCards.sort((a, b) => suitCounts[getSuit(b)] - suitCounts[getSuit(a)]);

  return maxRankCards[0];
}

function followCard(legal, currentTrick, trump, seatIndex, lastTrick) {
  const partnerSeat = (seatIndex + 2) % 4;
  const partnerCard = currentTrick.cards[partnerSeat];
  const partnerIsWinning = partnerCard && isCurrentlyWinning(partnerSeat, currentTrick, trump, lastTrick);

  const ledCard = currentTrick.cards[currentTrick.ledBy];
  const ledSuit = getSuit(ledCard);

  // 1. Play card of the same suit as the lead player had started with if available
  const sameSuitCards = legal.filter((c) => getSuit(c) === ledSuit);

  if (partnerIsWinning) {
    // Rule 2: If partner is senior and has played a card
    if (sameSuitCards.length > 0) {
      // play card of same suit (lowest card to conserve high cards)
      return lowestCard(sameSuitCards, seatIndex, lastTrick);
    } else {
      // give a non trump card if same suit card is not available
      const nonTrumpCards = legal.filter((c) => !isTrump(c, trump));
      if (nonTrumpCards.length > 0) {
        return lowestCard(nonTrumpCards, seatIndex, lastTrick);
      } else {
        // but if only trump cards available then play min trump
        return lowestCard(legal, seatIndex, lastTrick);
      }
    }
  } else {
    // Rule 3: If any of opponents is senior then do exactly opposite
    const winningSeat = getWinningSeat(currentTrick, trump, lastTrick);
    const winningCard = currentTrick.cards[winningSeat];

    if (sameSuitCards.length > 0) {
      // Play card of same suit, but try to win the trick (beat current winning card)
      const winningCardsOfSameSuit = sameSuitCards.filter((c) => beats(c, seatIndex, winningCard, winningSeat, ledSuit, trump, lastTrick));
      if (winningCardsOfSameSuit.length > 0) {
        return lowestCard(winningCardsOfSameSuit, seatIndex, lastTrick); // Lowest winning card
      } else {
        return lowestCard(sameSuitCards, seatIndex, lastTrick); // Can't win, play lowest card of same suit
      }
    } else {
      // Give a trump card if same suit card is not available to win the trick
      const trumps = legal.filter((c) => isTrump(c, trump));
      if (trumps.length > 0) {
        const winningTrumps = trumps.filter((c) => beats(c, seatIndex, winningCard, winningSeat, ledSuit, trump, lastTrick));
        if (winningTrumps.length > 0) {
          return lowestCard(winningTrumps, seatIndex, lastTrick); // Lowest winning trump
        } else {
          return lowestCard(trumps, seatIndex, lastTrick); // Play min trump if can't beat it
        }
      } else {
        // Only non-trump cards available, play lowest non-trump card
        return lowestCard(legal, seatIndex, lastTrick);
      }
    }
  }
}

function getWinningSeat(trick, trump, lastTrick) {
  const playedCards = Object.entries(trick.cards).filter(([, c]) => c !== null);
  if (playedCards.length === 0) return null;
  const ledSuit = getSuit(trick.cards[trick.ledBy]);

  let winningSeat = trick.ledBy;
  for (const [s, card] of playedCards) {
    const seatInt = parseInt(s);
    if (seatInt === trick.ledBy) continue;
    if (beats(card, seatInt, trick.cards[winningSeat], winningSeat, ledSuit, trump, lastTrick)) {
      winningSeat = seatInt;
    }
  }
  return winningSeat;
}

function isCurrentlyWinning(seat, trick, trump, lastTrick) {
  return getWinningSeat(trick, trump, lastTrick) === seat;
}

function lowestCard(cards, seatIndex, lastTrick) {
  return [...cards].sort((a, b) => getEffectiveRankValue(a, seatIndex, lastTrick) - getEffectiveRankValue(b, seatIndex, lastTrick))[0];
}

function highestCard(cards, seatIndex, lastTrick) {
  return [...cards].sort((a, b) => getEffectiveRankValue(b, seatIndex, lastTrick) - getEffectiveRankValue(a, seatIndex, lastTrick))[0];
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
