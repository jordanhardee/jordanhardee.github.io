import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SYMBOLS, LINES, drawSymbol, makeBoard, evaluateBoard } from '../js/slots-core.mjs';
import { ORACLE_LINES, GONG_DURATION, createSlotsOracle } from '../js/slots-oracle.mjs';

const blank = () => Array.from({ length: 5 }, () => Array(3).fill('ohio'));

test('a spin has five reels with three weighted symbols each', () => {
  assert.equal(LINES.length, 5);
  for (let i = 0; i < 100; i += 1) {
    const board = makeBoard();
    assert.equal(board.length, 5);
    board.forEach(reel => {
      assert.equal(reel.length, 3);
      reel.forEach(id => assert.ok(SYMBOLS.some(s => s.id === id)));
    });
  }
  assert.equal(drawSymbol(() => 0), 'skibidi');
  assert.equal(drawSymbol(() => 0.999999), 'wild');
});

test('wins pay from left on five defined paylines', () => {
  const board = blank();
  // Top line: four rizz symbols (4× multiplier 7), then an ohio blocker.
  for (let reel = 0; reel < 4; reel += 1) board[reel][0] = 'rizz';
  const result = evaluateBoard(board, 50);
  assert.ok(result.wins.some(win => win.line === 1 && win.symbol === 'rizz' && win.count === 4 && win.payout === 70));
  assert.ok(result.payout >= 70);
});

test('wild substitutes for a paying symbol and all-wild is the maximum pay', () => {
  const board = blank();
  board[0][1] = 'wild';
  board[1][1] = 'rizz';
  board[2][1] = 'rizz';
  board[3][1] = 'sigma';
  const result = evaluateBoard(board, 50);
  assert.ok(result.wins.some(win => win.line === 0 && win.symbol === 'rizz' && win.count === 3 && win.payout === 30));
  const allWild = Array.from({ length: 5 }, () => ['wild', 'wild', 'wild']);
  assert.equal(evaluateBoard(allWild, 50).payout, 5 * 10 * 250);
});

test('three brainrot scatters award two free spins regardless of line', () => {
  const board = blank();
  board[0][0] = 'brain';
  board[2][2] = 'brain';
  board[4][1] = 'brain';
  assert.equal(evaluateBoard(board, 25).freeSpins, 2);
  board[4][1] = 'ohio';
  assert.equal(evaluateBoard(board, 25).freeSpins, 0);
});

test('nonpaying pairs do not count as wins; inputs are validated', () => {
  const board = blank();
  board[2] = ['rizz', 'sigma', 'aura'];
  board[3] = ['brain', 'rizz', 'skibidi'];
  board[4] = ['sixseven', 'wild', 'brain'];
  const result = evaluateBoard(board, 50);
  assert.equal(result.payout, 0);
  assert.deepEqual(result.wins, []);
  assert.throws(() => evaluateBoard([], 50), TypeError);
  assert.throws(() => evaluateBoard(board, 0), RangeError);
});

test('XP integration exposes a Games entry, taskbar entry, module, controls and audio focus', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const menu = readFileSync(new URL('../js/start-menu.js', import.meta.url), 'utf8');
  const music = readFileSync(new URL('../js/music.js', import.meta.url), 'utf8');
  const script = readFileSync(new URL('../js/brainrot-slots.mjs', import.meta.url), 'utf8');
  assert.match(html, /data-window="brainrot-slots" aria-labelledby="slots-heading"/);
  assert.match(html, /data-open-window="brainrot-slots"/);
  assert.match(html, /id="slots-volume"[^>]+type="range"/);
  assert.match(html, /id="slots-refill"/);
  assert.match(menu, /'brainrot-slots': new URL\('\.\/brainrot-slots\.mjs/);
  assert.match(music, /'slots'/);
  assert.match(script, /xp:slots-playback-start/);
  assert.match(script, /xp:slots-playback-stop/);
  assert.match(html, /id="slots-lever"/);
  assert.match(html, /id="slots-summon"/);
  assert.match(html, /id="slots-coin-shower"/);
  assert.match(script, /showerCoins/);
  assert.match(script, /createSlotsOracle/);
});

test('General Tso keeps the captions but replaces the recordings with an original gong', () => {
  const source = readFileSync(new URL('../js/slots-oracle.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /new Audio\(|speechSynthesis|SpeechSynthesisUtterance|announcer-.*\.mp3/);
  assert.match(source, /RING THE GONG/);
  assert.match(source, /createOscillator/);
  assert.match(source, /createBufferSource/);
  assert.ok(GONG_DURATION > 3);
  assert.match(ORACLE_LINES.jackpot, /imaginary gold/i);
  assert.equal(Object.keys(ORACLE_LINES).length,6);
});

test('General Tso rings a resonant gong on summon and fades it when dismissed', () => {
  const events = {};
  const close = {focus(){},addEventListener:(event,handler)=>{events[event]=handler;}};
  const caption = {textContent:''};
  const replay = {hidden:true};
  const overlay = {
    hidden:true,
    classList:{toggle(){}},
    setAttribute(){},
    addEventListener(){},
    querySelector:selector=>({'.slots-oracle-close':close,'.slots-oracle-caption':caption,'.slots-oracle-replay':replay})[selector],
  };
  const started = [];
  let fades = 0;
  const param = value => ({
    value,
    setValueAtTime(next){this.value=next;},
    exponentialRampToValueAtTime(next){this.value=next;},
    cancelScheduledValues(){fades++;}
  });
  const connectable = () => ({connect(next){return next;}});
  class AudioContextMock {
    currentTime=1;
    sampleRate=8000;
    state='running';
    destination={};
    createGain(){return {...connectable(),gain:param(1)};}
    createOscillator(){return {...connectable(),frequency:param(100),start:()=>started.push('tone'),stop(){}};}
    createBufferSource(){return {...connectable(),start:()=>started.push('strike'),stop(){}};}
    createBiquadFilter(){return {...connectable(),frequency:param(1000),Q:param(1)};}
    createBuffer(){return {getChannelData:()=>new Float32Array(1040)};}
  }
  const documentMock = {
    body:{appendChild(){}},activeElement:null,
    createElement:()=>overlay,addEventListener(){},
  };
  const windowMock = {AudioContext:AudioContextMock,clearTimeout(){},setTimeout:()=>42};
  const oldDocument=globalThis.document;
  const oldWindow=globalThis.window;
  const oldAudio=globalThis.Audio;
  try {
    globalThis.document=documentMock;
    globalThis.window=windowMock;
    globalThis.Audio=class {constructor(){throw Error('Old announcer must not play');}};
    const oracle=createSlotsOracle({canSpeak:()=>true,getVolume:()=>0.6});
    oracle.announce('jackpot');
    assert.equal(started.filter(type=>type==='tone').length,7);
    assert.equal(started.filter(type=>type==='strike').length,1);
    assert.equal(overlay.hidden,false);
    assert.equal(caption.textContent,ORACLE_LINES.jackpot);
    oracle.hide();
    assert.ok(fades>0);
    assert.equal(overlay.hidden,true);
  } finally {
    globalThis.document=oldDocument;
    globalThis.window=oldWindow;
    globalThis.Audio=oldAudio;
  }
});
