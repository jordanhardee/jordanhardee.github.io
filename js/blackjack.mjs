import { shuffledDeck, blackjackTotal, makeCardElement } from './cards-core.mjs';

// Casino presentation, actual blackjack rules, and strictly imaginary play chips.
// Nothing is purchased, transmitted, or stored between visits.
const playerArea = document.getElementById('blackjack-player-hand');
const dealerArea = document.getElementById('blackjack-dealer-hand');
const hit = document.getElementById('blackjack-hit');
const stand = document.getElementById('blackjack-stand');
const doubleButton = document.getElementById('blackjack-double');
const newHand = document.getElementById('blackjack-deal');
const refill = document.getElementById('blackjack-refill');
const message = document.getElementById('blackjack-message');
const record = document.getElementById('blackjack-record');
const playerScore = document.getElementById('blackjack-player-score');
const dealerScore = document.getElementById('blackjack-dealer-score');
const balanceDisplay = document.getElementById('blackjack-bankroll');
const betDisplay = document.getElementById('blackjack-bet-display');
const streakDisplay = document.getElementById('blackjack-streak');
const celebration = document.getElementById('blackjack-celebration');
const body = document.querySelector('.blackjack-body');
const chips = [...document.querySelectorAll('#blackjack-chips [data-bet]')];

if (playerArea && dealerArea && hit && stand && doubleButton && newHand && refill) {
  const fmt = value => new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
  const minimumBet = 25;
  let deck = [], dealer = [], player = [];
  let bankroll = 1000, chosenBet = 50, wager = 0;
  let active = false, resolving = false, revealed = false;
  let wins = 0, losses = 0, pushes = 0, streak = 0;
  let celebrationTimer = null, dealerTimer = null;

  function takeCard() {
    if (!deck.length) deck = shuffledDeck();
    return deck.pop();
  }

  function render() {
    playerArea.replaceChildren(...player.map(card => makeCardElement(card, { faceDown: false })));
    dealerArea.replaceChildren(...dealer.map((card, index) => makeCardElement(card, { faceDown: !revealed && index === 1 })));
    playerScore.textContent = player.length ? '— ' + blackjackTotal(player) : '—';
    dealerScore.textContent = dealer.length ? (!revealed ? '— ?' : '— ' + blackjackTotal(dealer)) : '—';
    hit.disabled = stand.disabled = !active;
    doubleButton.disabled = !active || player.length !== 2 || bankroll < wager;
    newHand.disabled = active || resolving || bankroll < chosenBet;
    refill.hidden = active || resolving || bankroll >= minimumBet;
    balanceDisplay.textContent = fmt(bankroll);
    betDisplay.textContent = fmt(active || resolving ? wager : chosenBet);
    streakDisplay.textContent = `${streak} 🔥`;
    record.textContent = `WINS ${wins}  ✦  LOSSES ${losses}  ✦  PUSHES ${pushes}  ·  Blackjack pays 3:2 · Dealer stands on 17`;
    chips.forEach(chip => {
      const amount = Number(chip.dataset.bet);
      chip.disabled = active || resolving || amount > bankroll;
      chip.classList.toggle('is-active', amount === chosenBet);
      chip.setAttribute('aria-pressed', String(amount === chosenBet));
    });
  }

  function flash(text, kind) {
    if (!celebration) return;
    window.clearTimeout(celebrationTimer);
    celebration.textContent = text;
    celebration.className = `blackjack-celebration is-showing is-${kind}`;
    celebrationTimer = window.setTimeout(() => celebration.className = 'blackjack-celebration', 1700);
  }

  function finish(outcome, text, blackjack = false) {
    active = false;
    resolving = false;
    revealed = true;
    window.clearTimeout(dealerTimer);
    let payout = 0;
    if (outcome === 'win') {
      payout = wager * (blackjack ? 2.5 : 2);
      wins += 1;
      streak += 1;
      flash(blackjack ? '★ BLACKJACK! 3:2 ★' : `★ WIN +${fmt(payout - wager)} ★`, 'win');
    } else if (outcome === 'push') {
      payout = wager;
      pushes += 1;
      flash('PUSH • CHIPS BACK', 'push');
    } else {
      losses += 1;
      streak = 0;
      flash('HOUSE WINS', 'loss');
    }
    bankroll += payout;
    wager = 0;
    if (bankroll < chosenBet && bankroll >= minimumBet) {
      chosenBet = [250, 100, 50, 25].find(amount => amount <= bankroll) || minimumBet;
    }
    message.textContent = `${text} ${outcome === 'win' ? '🎉' : outcome === 'push' ? '↔' : '♣'}`;
    body.dataset.outcome = outcome;
    render();
  }

  function dealerStep() {
    if (!resolving) return;
    if (blackjackTotal(dealer) < 17) {
      dealer.push(takeCard());
      render();
      dealerTimer = window.setTimeout(dealerStep, 420);
      return;
    }
    const theirs = blackjackTotal(dealer), yours = blackjackTotal(player);
    if (theirs > 21) finish('win', `Dealer busts at ${theirs}. You collect ${fmt(wager * 2)} chips!`);
    else if (yours > theirs) finish('win', `${yours} beats ${theirs}. You win!`);
    else if (yours < theirs) finish('loss', `Dealer takes it, ${theirs} to ${yours}.`);
    else finish('push', `Both have ${yours}. It's a push.`);
  }

  function settle() {
    if (!active) return;
    active = false;
    resolving = true;
    revealed = true;
    message.textContent = 'Dealer flips the hole card…';
    render();
    dealerTimer = window.setTimeout(dealerStep, 480);
  }

  function deal() {
    if (active || resolving || bankroll < chosenBet) return;
    bankroll -= chosenBet;
    wager = chosenBet;
    deck = shuffledDeck();
    // Deal alternately: player, dealer, player, dealer.
    player = [takeCard()];
    dealer = [takeCard()];
    player.push(takeCard());
    dealer.push(takeCard());
    active = true;
    revealed = false;
    body.dataset.outcome = '';
    message.textContent = 'Cards are live! Hit, stand, or double down.';
    const playerNatural = blackjackTotal(player) === 21;
    const dealerNatural = blackjackTotal(dealer) === 21;
    if (playerNatural && dealerNatural) finish('push', 'Double blackjack! Tie game.');
    else if (playerNatural) finish('win', `NATURAL 21! Paid ${fmt(wager * 2.5)} play chips.`, true);
    else if (dealerNatural) finish('loss', 'Dealer reveals a natural blackjack.');
    render();
  }

  chips.forEach(chip => chip.addEventListener('click', () => {
    const amount = Number(chip.dataset.bet);
    if (!active && !resolving && amount <= bankroll) {
      chosenBet = amount;
      render();
    }
  }));
  hit.addEventListener('click', () => {
    if (!active) return;
    player.push(takeCard());
    const total = blackjackTotal(player);
    if (total > 21) finish('loss', `BUST! ${total} is over 21.`);
    else if (total === 21) settle();
    else { message.textContent = `You're at ${total}. Feeling lucky?`; render(); }
  });
  stand.addEventListener('click', settle);
  doubleButton.addEventListener('click', () => {
    if (!active || player.length !== 2 || bankroll < wager) return;
    bankroll -= wager;
    wager *= 2;
    player.push(takeCard());
    const total = blackjackTotal(player);
    if (total > 21) finish('loss', `Double-down bust at ${total}!`);
    else settle(); // A double always gets exactly one card.
  });
  newHand.addEventListener('click', deal);
  refill.addEventListener('click', () => {
    if (active || resolving || bankroll >= minimumBet) return;
    bankroll = 1000;
    chosenBet = 50;
    message.textContent = 'Fresh 1,000-chip stack. The neon never sleeps.';
    render();
  });
  message.textContent = 'Pick a chip, place a pretend bet, and hit DEAL ME IN!';
  render();
}
