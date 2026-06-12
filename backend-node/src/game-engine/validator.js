const { getSuit, isAce, getRank } = require("./deck");

/**
 * Returns the legal cards a player can play given their hand and current trick state.
 * Enforces:
 *  - Must follow suit if possible
 *  - No Ace on Ace rule (ace cannot be played on led ace from same suit by following player)
 */
function getLegalCards(hand, currentTrick, trump, noAceOnAce = true) {
  if (!currentTrick || currentTrick.ledBy === null) {
    // Leading the trick — any card is legal
    return [...hand];
  }

  const ledCard = currentTrick.cards[currentTrick.ledBy];
  const ledSuit = getSuit(ledCard);

  // Cards that follow the led suit
  const suitCards = hand.filter((c) => getSuit(c) === ledSuit);

  if (suitCards.length === 0) {
    // Can't follow suit — play anything
    return [...hand];
  }

  let legal = suitCards;

  // No Ace on Ace: if the led card is an Ace, remove aces of the same suit
  if (noAceOnAce && isAce(ledCard)) {
    const filtered = suitCards.filter((c) => !isAce(c));
    // Only apply restriction if they have non-ace cards of that suit
    if (filtered.length > 0) {
      legal = filtered;
    }
    // If the ONLY card of that suit is an Ace, they must play it (no choice)
  }

  return legal;
}

/**
 * Returns true if the proposed card is legal for this player to play.
 */
function isLegalPlay(card, hand, currentTrick, trump, noAceOnAce = true) {
  if (!hand.includes(card)) return false;
  const legal = getLegalCards(hand, currentTrick, trump, noAceOnAce);
  return legal.includes(card);
}

module.exports = { getLegalCards, isLegalPlay };
