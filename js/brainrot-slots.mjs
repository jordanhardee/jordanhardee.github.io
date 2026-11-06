import { SYMBOLS, LINES, makeBoard, drawSymbol, evaluateBoard } from './slots-core.mjs';
import { createSlotsOracle } from './slots-oracle.mjs?v=20261106-male-general';

const panel = document.querySelector('[data-window="brainrot-slots"]');
const reelRack = document.getElementById('slots-reels');
const spinButton = document.getElementById('slots-spin');
const balanceLabel = document.getElementById('slots-balance');
const betLabel = document.getElementById('slots-wager');
const freeLabel = document.getElementById('slots-free-spins');
const message = document.getElementById('slots-message');
const winLabel = document.getElementById('slots-last-win');
const spinCount = document.getElementById('slots-count');
const banner = document.getElementById('slots-banner');
const betButtons = [...document.querySelectorAll('.slots-bet[data-bet]')];
const muteButton = document.getElementById('slots-mute');
const volumeSlider = document.getElementById('slots-volume');
const volumeLabel = document.getElementById('slots-volume-label');
const turboButton = document.getElementById('slots-turbo');
const refillButton = document.getElementById('slots-refill');
const paytableButton = document.getElementById('slots-paytable-toggle');
const paytable = document.getElementById('slots-paytable');
const lever = document.getElementById('slots-lever');
const summonButton = document.getElementById('slots-summon');
const coinShower = document.getElementById('slots-coin-shower');

if (panel && reelRack && spinButton) {
  const symbols = new Map(SYMBOLS.map(symbol => [symbol.id, symbol]));
  const fmt = number => number.toLocaleString('en-US');
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const state = { balance: 2500, bet: 50, freeSpins: 0, spins: 0, lastWin: 0, spinning: false, turbo: false };
  let board = makeBoard();
  let resultBoard = null;
  let spinWager = 0;
  let spinInterval = 0;
  let stopTimers = [];
  let revealTimer = 0;
  let audioContext = null;
  let volume = 0.6;
  let muted = false;
  let focus = false;
  let kaliActive = false;
  const reels = [];
  const oracle = createSlotsOracle({ canSpeak: () => !muted && volume > 0 && focus && !kaliActive, getVolume: () => volume });
  let coinTimer = 0;

  function showerCoins(amount) {
    if (!coinShower || prefersReducedMotion?.matches) return;
    window.clearTimeout(coinTimer);
    coinShower.replaceChildren();
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < amount; i += 1) {
      const coin = document.createElement('span');
      coin.className = 'slots-coin';
      coin.textContent = '★';
      coin.style.setProperty('--x', `${Math.random() * 100}%`);
      coin.style.setProperty('--drift', `${(Math.random() - .5) * 220}px`);
      coin.style.setProperty('--spin', `${Math.random() * 1000 - 500}deg`);
      coin.style.setProperty('--duration', `${1.5 + Math.random() * 1.4}s`);
      coin.style.setProperty('--delay', `${Math.random() * 1.0}s`);
      fragment.appendChild(coin);
    }
    coinShower.appendChild(fragment);
    coinTimer = window.setTimeout(() => coinShower.replaceChildren(), 3900);
  }

  function makeReel() {
    const reel = document.createElement('div');
    reel.className = 'slots-reel';
    for (let row = 0; row < 3; row += 1) {
      const cell = document.createElement('div');
      cell.className = 'slots-cell';
      const art = document.createElement('span');
      art.className = 'slots-emoji';
      art.setAttribute('aria-hidden', 'true');
      const text = document.createElement('span');
      text.className = 'slots-cell-label';
      cell.append(art, text);
      reel.appendChild(cell);
    }
    reelRack.appendChild(reel);
    return reel;
  }
  for (let i = 0; i < 5; i += 1) reels.push(makeReel());

  function paintCell(reelIndex, row, id) {
    const cell = reels[reelIndex].children[row];
    const symbol = symbols.get(id);
    cell.querySelector('.slots-emoji').textContent = symbol.emoji;
    cell.querySelector('.slots-cell-label').textContent = symbol.label;
    cell.dataset.symbol = id;
  }

  function paintReel(index, values) {
    values.forEach((id, row) => paintCell(index, row, id));
  }

  function paintBoard() {
    board.forEach((values, index) => paintReel(index, values));
  }

  function update() {
    balanceLabel.textContent = fmt(state.balance);
    betLabel.textContent = fmt(state.bet);
    freeLabel.textContent = fmt(state.freeSpins);
    winLabel.textContent = fmt(state.lastWin);
    spinCount.textContent = fmt(state.spins);
    const available = state.freeSpins > 0 || state.balance >= state.bet;
    spinButton.disabled = state.spinning || !available;
    if (lever) lever.disabled = state.spinning || !available;
    spinButton.textContent = state.spinning ? '⚡ REELS GO BRRR…' : state.freeSpins ? '🎁 FREE SPIN!' : '⚡ SEND IT · SPIN ⚡';
    refillButton.hidden = state.spinning || available;
    betButtons.forEach(button => {
      const amount = Number(button.dataset.bet);
      button.disabled = state.spinning || (!state.freeSpins && amount > state.balance);
      button.classList.toggle('is-active', amount === state.bet);
      button.setAttribute('aria-pressed', String(amount === state.bet));
    });
  }

  // Synthesize all sound locally; no downloads or copyrighted sound samples.
  function audio() {
    if (muted || volume === 0 || !focus || kaliActive) return null;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    if (!audioContext) audioContext = new AudioContext();
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    return audioContext;
  }

  function tone(frequency, duration = 0.075, type = 'sine', loudness = 0.12, delay = 0) {
    const context = audio();
    if (!context) return;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, loudness * volume), start + 0.009);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(envelope).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.01);
  }

  function sound(effect) {
    if (effect === 'start') {
      tone(160, 0.14, 'sawtooth', 0.12);
      tone(320, 0.09, 'square', 0.08, 0.07);
    } else if (effect === 'tick') tone(210 + Math.random() * 90, 0.027, 'square', 0.035);
    else if (effect === 'stop') {
      tone(110, 0.11, 'triangle', 0.15);
      tone(700, 0.05, 'sine', 0.05);
    } else if (effect === 'miss') {
      tone(200, 0.13, 'triangle', 0.09);
      tone(140, 0.22, 'triangle', 0.08, 0.1);
    } else if (effect === 'win') {
      [523, 659, 784, 1046].forEach((note, i) => tone(note, 0.20, 'triangle', 0.13, i * 0.10));
      for (let i = 0; i < 7; i += 1) tone(900 + i * 85, 0.06, 'sine', 0.08, 0.37 + i * 0.06);
    } else if (effect === 'jackpot') {
      [392, 523, 659, 784, 1046, 1318, 1568, 2093].forEach((note, i) => {
        tone(note, 0.29, 'triangle', 0.15, i * 0.10);
        tone(note / 2, 0.22, 'sine', 0.07, i * 0.10);
      });
      for (let i = 0; i < 16; i += 1) tone(950 + Math.random() * 1000, 0.055, 'sine', 0.07, 0.4 + i * 0.07);
    }
  }

  function flash(text, jackpot) {
    window.clearTimeout(revealTimer);
    banner.textContent = text;
    banner.className = `slots-banner is-visible${jackpot ? ' is-jackpot' : ''}`;
    panel.classList.toggle('slots-jackpot-active', jackpot);
    revealTimer = window.setTimeout(() => {
      banner.className = 'slots-banner';
      panel.classList.remove('slots-jackpot-active');
    }, jackpot ? 2800 : 1800);
  }

  function highlightWins(wins) {
    reels.forEach(reel => [...reel.children].forEach(cell => cell.classList.remove('is-winning')));
    wins.forEach(win => {
      for (let reel = 0; reel < win.count; reel += 1) {
        reels[reel].children[LINES[win.line][reel]].classList.add('is-winning');
      }
    });
  }

  function clearSpinTimers() {
    window.clearInterval(spinInterval);
    stopTimers.forEach(timer => window.clearTimeout(timer));
    stopTimers = [];
    spinInterval = 0;
  }

  function finishSpin(silent = false) {
    if (!state.spinning || !resultBoard) return;
    clearSpinTimers();
    board = resultBoard;
    resultBoard = null;
    paintBoard();
    state.spinning = false;
    const result = evaluateBoard(board, spinWager);
    state.balance += result.payout;
    state.freeSpins += result.freeSpins;
    state.lastWin = result.payout;
    highlightWins(result.wins);
    reels.forEach(reel => reel.classList.remove('is-spinning'));
    const jackpot = result.payout >= spinWager * 8;
    if (result.payout > 0) {
      message.textContent = `+${fmt(result.payout)} COINS! ${result.wins.length} paying line${result.wins.length === 1 ? '' : 's'}${result.freeSpins ? ' · +2 FREE SPINS!' : ''}`;
      if (!silent) {
        sound(jackpot ? 'jackpot' : 'win');
        flash(jackpot ? '🚨 MAXIMUM BRAINROT 🚨' : '✨ RIZZ WIN ✨', jackpot);
        showerCoins(jackpot ? 100 : 38);
        if (!oracle.visible && (jackpot || state.spins % 3 === 0)) oracle.announce(jackpot ? 'jackpot' : 'win', { automatic: true });
      }
    } else if (result.freeSpins) {
      message.textContent = '🧠🧠🧠 BRAINROT BONUS! +2 FREE SPINS!';
      if (!silent) { sound('win'); flash('🧠 FREE SPINS 🧠', false); }
    } else {
      message.textContent = 'L + RATIO. Try another spin?';
      if (!silent) sound('miss');
      if (!silent && !oracle.visible && state.spins % 4 === 0) oracle.announce('miss', { automatic: true });
    }
    if (state.balance < state.bet && state.balance >= 25 && !state.freeSpins) {
      state.bet = [250, 100, 50, 25].find(bet => bet <= state.balance) || 25;
    }
    update();
  }

  function spin() {
    if (state.spinning || (state.freeSpins === 0 && state.balance < state.bet)) return;
    if (lever) {
      lever.classList.remove('is-pulled');
      // Restart the full physical pull, even on rapid consecutive spins.
      void lever.offsetWidth;
      lever.classList.add('is-pulled');
      window.setTimeout(() => lever.classList.remove('is-pulled'), 740);
    }
    if (state.freeSpins) state.freeSpins -= 1;
    else state.balance -= state.bet;
    spinWager = state.bet;
    state.spins += 1;
    state.spinning = true;
    state.lastWin = 0;
    resultBoard = makeBoard();
    message.textContent = 'THE ALGORITHM IS COOKING…';
    highlightWins([]);
    banner.className = 'slots-banner';
    panel.classList.remove('slots-jackpot-active');
    window.clearTimeout(revealTimer);
    reels.forEach(reel => reel.classList.add('is-spinning'));
    sound('start');
    if (state.spins === 1) oracle.announce('greeting', { automatic: true });
    update();
    const settled = Array(5).fill(false);
    const quick = state.turbo || prefersReducedMotion?.matches;
    const duration = quick ? 220 : 1120;
    spinInterval = window.setInterval(() => {
      settled.forEach((done, index) => {
        if (!done) paintReel(index, [drawSymbol(), drawSymbol(), drawSymbol()]);
      });
      if (!quick) sound('tick');
    }, quick ? 70 : 88);
    for (let i = 0; i < 5; i += 1) {
      stopTimers.push(window.setTimeout(() => {
        settled[i] = true;
        paintReel(i, resultBoard[i]);
        reels[i].classList.remove('is-spinning');
        sound('stop');
        if (i === 4) finishSpin();
      }, duration + i * (quick ? 68 : 225)));
    }
  }

  function setFocus(active) {
    if (focus === active) return;
    focus = active;
    document.dispatchEvent(new CustomEvent(active ? 'xp:slots-playback-start' : 'xp:slots-playback-stop'));
    if (!active) {
      finishSpin(true);
      oracle.hide();
      window.clearTimeout(coinTimer);
      coinShower?.replaceChildren();
      audioContext?.suspend?.().catch(() => {});
    }
  }

  betButtons.forEach(button => button.addEventListener('click', () => {
    const chosen = Number(button.dataset.bet);
    if (state.spinning || (!state.freeSpins && chosen > state.balance)) return;
    state.bet = chosen;
    tone(590, 0.045, 'sine', 0.09);
    update();
  }));
  spinButton.addEventListener('click', spin);
  lever?.addEventListener('click', spin);
  summonButton?.addEventListener('click', () => oracle.announce('greeting'));
  refillButton.addEventListener('click', () => {
    if (state.spinning || state.balance >= state.bet || state.freeSpins) return;
    state.balance = 2500;
    message.textContent = 'FREE IMAGINARY COINS RESTOCKED. GO OFF, KING.';
    tone(880, 0.15, 'triangle', 0.12);
    oracle.announce('refill');
    update();
  });
  muteButton.addEventListener('click', () => {
    muted = !muted;
    muteButton.textContent = muted ? '🔇 MUTED' : '🔊 SOUND ON';
    muteButton.setAttribute('aria-pressed', String(!muted));
    if (muted) oracle.hide();
    if (!muted) tone(880, 0.12, 'sine', 0.12);
  });
  volumeSlider.addEventListener('input', () => {
    volume = Number(volumeSlider.value) / 100;
    volumeLabel.textContent = `${volumeSlider.value}%`;
  });
  turboButton.addEventListener('click', () => {
    state.turbo = !state.turbo;
    turboButton.setAttribute('aria-pressed', String(state.turbo));
    turboButton.textContent = state.turbo ? '⚡ TURBO ON' : '⚡ TURBO OFF';
  });
  paytableButton.addEventListener('click', () => {
    paytable.hidden = !paytable.hidden;
    paytableButton.setAttribute('aria-expanded', String(!paytable.hidden));
  });
  document.addEventListener('xp:window-opened', event => {
    if (event.detail?.window === 'brainrot-slots') setFocus(true);
  });
  document.addEventListener('xp:restored', event => {
    if (event.detail?.window === 'brainrot-slots') setFocus(true);
  });
  for (const eventName of ['xp:closed', 'xp:minimized']) {
    document.addEventListener(eventName, event => {
      if (event.detail?.window === 'brainrot-slots') setFocus(false);
    });
  }
  document.addEventListener('xp:kali-playback-start', () => {
    kaliActive = true;
    oracle.hide();
    audioContext?.suspend?.().catch(() => {});
  });
  document.addEventListener('xp:kali-playback-stop', () => { kaliActive = false; });

  // A dynamic import may finish after the XP window's opening event fired.
  if (!panel.classList.contains('module-closed') && !panel.classList.contains('module-minimized')) setFocus(true);
  paintBoard();
  update();
}
