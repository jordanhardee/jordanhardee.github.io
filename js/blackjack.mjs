import { shuffledDeck, blackjackTotal, makeCardElement } from './cards-core.mjs';

// Classic one-player Blackjack: the browser is the dealer. No wagers or money.
const playerArea = document.getElementById('blackjack-player-hand');
const dealerArea = document.getElementById('blackjack-dealer-hand');
const hit = document.getElementById('blackjack-hit');
const stand = document.getElementById('blackjack-stand');
const newHand = document.getElementById('blackjack-deal');
const message = document.getElementById('blackjack-message');
const record = document.getElementById('blackjack-record');
const playerScore = document.getElementById('blackjack-player-score');
const dealerScore = document.getElementById('blackjack-dealer-score');

if (playerArea && dealerArea && hit && stand && newHand) {
  let deck = [], dealer = [], player = [], active = false;
  let wins = 0, losses = 0, pushes = 0;

  function render() {
    playerArea.replaceChildren(...player.map(card => makeCardElement(card, { faceDown: false })));
    dealerArea.replaceChildren(...dealer.map((card, index) => makeCardElement(card, { faceDown: active && index === 1 })));
    playerScore.textContent = `— ${blackjackTotal(player)}`;
    dealerScore.textContent = active ? '— ?' : `— ${blackjackTotal(dealer)}`;
    hit.disabled = stand.disabled = !active;
    record.textContent = `Wins ${wins} · Losses ${losses} · Pushes ${pushes}`;
  }

  function finish(outcome, text) {
    active = false;
    if (outcome === 'win') wins += 1;
    else if (outcome === 'loss') losses += 1;
    else pushes += 1;
    message.textContent = text;
    render();
  }

  function settle() {
    while (blackjackTotal(dealer) < 17) dealer.push(deck.pop());
    const theirs = blackjackTotal(dealer), yours = blackjackTotal(player);
    if (theirs > 21) finish('win', `Dealer busts with ${theirs}. You win!`);
    else if (yours > theirs) finish('win', `${yours} beats ${theirs}. You win!`);
    else if (yours < theirs) finish('loss', `Dealer wins, ${theirs} to ${yours}.`);
    else finish('push', `Both have ${yours}. Push (tie).`);
  }

  function deal() {
    deck = shuffledDeck();
    player = [deck.pop(), deck.pop()];
    dealer = [deck.pop(), deck.pop()];
    active = true;
    message.textContent = 'Your turn. Hit or stand.';
    const playerNatural = blackjackTotal(player) === 21;
    const dealerNatural = blackjackTotal(dealer) === 21;
    if (playerNatural && dealerNatural) finish('push', 'Two blackjacks — push!');
    else if (playerNatural) finish('win', 'Blackjack! You win!');
    else if (dealerNatural) finish('loss', 'Dealer has blackjack.');
    render();
  }

  hit.addEventListener('click', () => {
    if (!active) return;
    player.push(deck.pop());
    const value = blackjackTotal(player);
    if (value > 21) finish('loss', `You bust with ${value}. Dealer wins.`);
    else if (value === 21) settle();
    else render();
  });
  stand.addEventListener('click', () => { if (active) settle(); });
  newHand.addEventListener('click', deal);
  deal();
}
