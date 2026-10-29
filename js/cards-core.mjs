// Shared, original playing-card utilities for the site's two small games.
export const SUITS = ['♠', '♥', '♦', '♣'];
export const SUIT_NAMES = ['spades', 'hearts', 'diamonds', 'clubs'];
export const RANK_NAMES = ['','Ace','2','3','4','5','6','7','8','9','10','Jack','Queen','King'];

export function shuffledDeck() {
  const deck = [];
  for (let suit = 0; suit < SUITS.length; suit += 1) {
    for (let rank = 1; rank <= 13; rank += 1) deck.push({ id: `${suit}-${rank}`, suit, rank, faceUp: false });
  }
  const random = new Uint32Array(1);
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const limit = 0x100000000 - (0x100000000 % (i + 1));
    do { crypto.getRandomValues(random); } while (random[0] >= limit);
    const j = random[0] % (i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function rankShort(rank) { return rank === 1 ? 'A' : rank === 11 ? 'J' : rank === 12 ? 'Q' : rank === 13 ? 'K' : String(rank); }
export function isRed(card) { return card.suit === 1 || card.suit === 2; }

export function makeCardElement(card, { faceDown = !card?.faceUp, interactive = false } = {}) {
  const el = document.createElement(interactive ? 'button' : 'div');
  if (interactive) el.type = 'button';
  el.className = `playing-card${faceDown ? ' is-back' : isRed(card) ? ' is-red' : ''}`;
  if (faceDown) {
    const pattern = document.createElement('span');
    pattern.className = 'playing-card-back-mark';
    pattern.textContent = '✦';
    el.append(pattern);
    el.setAttribute('aria-label', 'Face-down card');
  } else {
    const label = `${RANK_NAMES[card.rank]} of ${SUIT_NAMES[card.suit]}`;
    el.setAttribute('aria-label', label);
    const top = document.createElement('span');
    top.className = 'playing-card-corner';
    top.textContent = `${rankShort(card.rank)}${SUITS[card.suit]}`;
    const suit = document.createElement('span');
    suit.className = 'playing-card-center';
    suit.textContent = SUITS[card.suit];
    const bottom = document.createElement('span');
    bottom.className = 'playing-card-corner is-bottom';
    bottom.textContent = `${rankShort(card.rank)}${SUITS[card.suit]}`;
    el.append(top, suit, bottom);
  }
  return el;
}

export function blackjackTotal(hand) {
  let total = 0, aces = 0;
  for (const card of hand) {
    if (card.rank === 1) { total += 11; aces += 1; }
    else total += Math.min(card.rank, 10);
  }
  while (total > 21 && aces) { total -= 10; aces -= 1; }
  return total;
}

export function canStackTableau(moving, top) {
  if (!moving) return false;
  return top
    ? moving.rank === top.rank - 1 && isRed(moving) !== isRed(top)
    : moving.rank === 13;
}

export function canStackFoundation(moving, top, suit) {
  if (!moving) return false;
  return top
    ? moving.suit === top.suit && moving.rank === top.rank + 1
    : moving.rank === 1 && moving.suit === suit;
}
