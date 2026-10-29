import test from 'node:test';
import assert from 'node:assert/strict';
import { shuffledDeck, blackjackTotal, isRed, canStackTableau, canStackFoundation } from '../js/cards-core.mjs';

const card = (rank, suit = 0) => ({ rank, suit });

test('a new card deck has every rank/suit combination exactly once', () => {
  for (let run = 0; run < 20; run += 1) {
    const deck = shuffledDeck();
    assert.equal(deck.length, 52);
    assert.equal(new Set(deck.map(item => item.id)).size, 52);
    assert.equal(deck.filter(item => item.faceUp).length, 0);
  }
});

test('blackjack scores face cards and aces correctly', () => {
  assert.equal(blackjackTotal([card(1),card(13)]), 21);
  assert.equal(blackjackTotal([card(1),card(1),card(9)]), 21);
  assert.equal(blackjackTotal([card(1),card(1),card(9),card(9)]), 20);
  assert.equal(blackjackTotal([card(10),card(10),card(2)]), 22);
  assert.equal(blackjackTotal([card(1),card(1),card(1),card(1)]), 14);
});

test('solitaire red and black suit colors are disjoint', () => {
  assert.deepEqual([0,1,2,3].map(suit => isRed(card(1,suit))), [false,true,true,false]);
});

test('solitaire tableau needs descending alternating colors; only kings fill empty columns', () => {
  assert.equal(canStackTableau(card(13,0), undefined), true);
  assert.equal(canStackTableau(card(12,0), undefined), false);
  assert.equal(canStackTableau(card(6,1), card(7,0)), true);
  assert.equal(canStackTableau(card(6,2), card(7,1)), false);
  assert.equal(canStackTableau(card(8,1), card(7,0)), false);
});

test('solitaire foundations accept same-suit cards in order, starting with their ace', () => {
  assert.equal(canStackFoundation(card(1,2), undefined, 2), true);
  assert.equal(canStackFoundation(card(1,2), undefined, 1), false);
  assert.equal(canStackFoundation(card(2,2), card(1,2), 2), true);
  assert.equal(canStackFoundation(card(3,2), card(1,2), 2), false);
  assert.equal(canStackFoundation(card(2,1), card(1,2), 2), false);
});
