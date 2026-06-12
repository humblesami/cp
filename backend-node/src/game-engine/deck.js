// Suits: S=Spades, H=Hearts, D=Diamonds, C=Clubs
// Ranks: 2-9, T=10, J=Jack, Q=Queen, K=King, A=Ace
// Card format: "AS" = Ace of Spades, "TH" = Ten of Hearts

const SUITS = ["S", "H", "D", "C"];
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
const RANK_VALUES = Object.fromEntries(RANKS.map((r, i) => [r, i])); // 2=0, A=12

function makeDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(rank + suit);
    }
  }
  return deck;
}

function shuffle(deck) {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

/** Deal 13 cards to each of 4 players. Returns array of 4 hands. */
function deal() {
  const deck = shuffle(makeDeck());
  return [
    deck.slice(0, 13),
    deck.slice(13, 26),
    deck.slice(26, 39),
    deck.slice(39, 52),
  ];
}

function getSuit(card) { return card[1]; }
function getRank(card) { return card[0]; }
function getRankValue(card) { return RANK_VALUES[getRank(card)]; }
function isAce(card) { return getRank(card) === "A"; }
function isTrump(card, trump) { return getSuit(card) === trump; }

module.exports = { makeDeck, shuffle, deal, getSuit, getRank, getRankValue, isAce, isTrump, SUITS, RANKS };
