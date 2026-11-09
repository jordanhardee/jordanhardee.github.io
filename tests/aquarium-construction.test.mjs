import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');

test('the construction sign and nail damage belong to the aquarium background', () => {
  const aquariumStart = html.indexOf('<div class="site-aquarium-background"');
  const sign = html.indexOf('class="aquarium-construction-sign"');
  const aquariumEnd = html.indexOf('<div class="ios-retro-icons nostalgia-layer"');
  assert.ok(aquariumStart >= 0 && sign > aquariumStart && sign < aquariumEnd);
  assert.match(html, /class="aquarium-construction-cracks"/);
  assert.match(html, /class="aquarium-construction-leak"/);
  assert.match(html, /assets\/under-construction-sign\.png/);
  assert.ok(statSync(new URL('../assets/under-construction-sign.png', import.meta.url)).size > 100_000);
});

test('only the square tap target is interactive and the decoration respects reduced motion', () => {
  assert.match(css, /\.aquarium-construction\s*\{[^}]*pointer-events:\s*none/s);
  assert.match(css, /@media\s*\(max-width:\s*600px\)\s*\{\s*\.aquarium-construction/s);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{\s*\.aquarium-water-current\s*\{\s*animation:\s*none/s);
  assert.match(css, /\.aquarium-glass-tap\s*\{[^}]*aspect-ratio:\s*1[^}]*pointer-events:\s*auto/s);
  const control = html.slice(html.indexOf('<div class="aquarium-construction-controls"'), html.indexOf('<div class="ios-retro-icons'));
  assert.match(control, /<button[^>]*type="button"[^>]*aria-label="Tap the cracked aquarium glass"/);
  assert.doesNotMatch(control, /aria-hidden="true"/);
});

const interaction = readFileSync(new URL('../js/aquarium-construction.js', import.meta.url), 'utf8');

function harness({ noAudio = false, brokenAudio = false, reduced = false } = {}) {
  function element() {
    const listeners = new Map();
    return {
      dataset: {}, attributes: {}, hidden: false, textContent: '',
      addEventListener(type, fn) { const list = listeners.get(type) || []; list.push(fn); listeners.set(type, list); },
      dispatchEvent(event) { for (const fn of listeners.get(event.type) || []) fn(event); },
      setAttribute(name, value) { this.attributes[name] = value; },
      removeAttribute(name) { delete this.attributes[name]; },
    };
  }
  const glass = element(), controls = element(), tap = element(), status = element(), canvas = element(), sign = element();
  canvas.hidden = true;
  let bumps = 0, now = 0, next = 0;
  const timers = new Map(), frames = new Map(), audioContexts = [];
  const drawing = new Proxy({}, { get: (_, key) => key === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => {} });
  canvas.getContext = () => drawing;
  sign.animate = () => { bumps++; return { cancel() {} }; };
  glass.getBoundingClientRect = () => ({ left: 950, top: 500, width: 300, height: 300 });
  glass.querySelector = selector => ({ '.aquarium-burst-canvas': canvas, '.aquarium-construction-sign': sign })[selector];
  controls.querySelector = selector => ({ '.aquarium-glass-tap': tap, '.aquarium-glass-status': status })[selector];
  const document = element(), window = element(), motion = element();
  document.hidden = false;
  document.querySelector = selector => ({ '.aquarium-construction': glass, '.aquarium-construction-controls': controls })[selector];
  motion.matches = reduced;
  window.matchMedia = () => motion;
  Object.assign(window, { innerWidth: 1366, innerHeight: 900, devicePixelRatio: 2 });
  class Parameter {
    value = 0;
    setValueAtTime(value) { this.value = value; }
    exponentialRampToValueAtTime(value) { this.value = value; }
    linearRampToValueAtTime(value) { this.value = value; }
    cancelScheduledValues() {}
  }
  class AudioNode {
    gain = new Parameter(); frequency = new Parameter();
    started = false; stopped = false; loop = false;
    connect(node) { return node; }
    disconnect() {}
    start() { this.started = true; }
    stop() { this.stopped = true; }
  }
  class AudioContext {
    constructor() {
      if (brokenAudio) throw new Error('Audio unavailable');
      this.state = 'suspended'; this.sampleRate = 8000; this.currentTime = 0;
      this.sources = []; this.destination = {}; audioContexts.push(this);
    }
    createGain() { return new AudioNode(); }
    createBiquadFilter() { return new AudioNode(); }
    createOscillator() { return new AudioNode(); }
    createBufferSource() { const node = new AudioNode(); this.sources.push(node); return node; }
    createBuffer(channels, count) { return { getChannelData: () => new Float32Array(count) }; }
    resume() { this.state = 'running'; return Promise.resolve(); }
    suspend() { this.state = 'suspended'; return Promise.resolve(); }
  }
  if (!noAudio) window.AudioContext = AudioContext;
  vm.runInNewContext(interaction, {
    window, document, performance: { now: () => now },
    CustomEvent: class { constructor(type) { this.type = type; } },
    setTimeout(fn, delay) { const id = ++next; timers.set(id, { fn, at: now + delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    requestAnimationFrame(fn) { const id = ++next; frames.set(id, fn); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
  });
  return {
    glass, controls, tap, status, canvas, document, window, motion, audioContexts, frames,
    get bumps() { return bumps; },
    click() { tap.dispatchEvent({ type: 'click' }); },
    event(type) { document.dispatchEvent({ type }); },
    advance(ms, paint = false) {
      now += ms;
      for (const [id, timer] of timers) if (timer.at <= now) { timers.delete(id); timer.fn(); }
      if (paint) { const ready = [...frames.values()]; frames.clear(); ready.forEach(fn => fn(now)); }
    },
  };
}

test('three taps deepen, deepen, then break; repair stops the waterfall and allows replay', () => {
  const h = harness();
  assert.equal(h.audioContexts.length, 0, 'visiting the page must not start audio');
  h.click();
  assert.equal(h.glass.dataset.damage, '1');
  assert.match(h.tap.attributes['aria-label'], /deepen/);
  h.click();
  assert.equal(h.glass.dataset.damage, '2');
  assert.equal(h.canvas.hidden, true);
  h.click();
  assert.equal(h.glass.dataset.damage, '3');
  assert.equal(h.controls.dataset.damage, '3');
  assert.equal(h.canvas.hidden, false);
  assert.equal(h.controls.dataset.sound, 'playing');
  const water = h.audioContexts[0].sources.find(source => source.loop);
  assert.ok(water?.started);
  h.click();
  assert.equal(h.glass.dataset.damage, '3', 'an extra fast tap must not cancel the break');
  h.advance(1200, true);
  h.click();
  assert.equal(h.glass.dataset.damage, '0');
  assert.equal(h.canvas.hidden, true);
  assert.ok(water.stopped);
  assert.equal(h.frames.size, 0);
  assert.equal(h.controls.dataset.sound, 'off');
  h.click(); h.click(); h.click();
  assert.equal(h.glass.dataset.damage, '3');
  assert.equal(h.audioContexts[0].sources.filter(source => source.loop && !source.stopped).length, 1);
});

test('audio failure cannot block the three-stage glass break', () => {
  for (const options of [{ noAudio: true }, { brokenAudio: true }]) {
    const h = harness(options);
    h.click(); h.click(); h.click();
    assert.equal(h.glass.dataset.damage, '3');
    h.advance(600, true);
    assert.equal(h.canvas.hidden, false);
    assert.match(h.status.textContent, /water rushes out/);
  }
});

test('waterfall audio yields to other site audio and pauses while the page is hidden', () => {
  const h = harness();
  h.click(); h.click(); h.click();
  h.event('xp:kali-playback-start');
  assert.equal(h.controls.dataset.sound, 'off');
  h.event('xp:happy-playback-start');
  h.event('xp:kali-playback-stop');
  assert.equal(h.controls.dataset.sound, 'off', 'a second playing source still has audio focus');
  h.event('xp:happy-playback-stop');
  assert.equal(h.controls.dataset.sound, 'playing');
  h.document.hidden = true;
  h.event('visibilitychange');
  assert.equal(h.controls.dataset.sound, 'off');
  assert.equal(h.frames.size, 0);
  h.document.hidden = false;
  h.event('visibilitychange');
  assert.equal(h.controls.dataset.sound, 'playing');
  assert.equal(h.audioContexts[0].sources.filter(source => source.loop && !source.stopped).length, 1);
});

test('reduced motion keeps the result but stops continuous waterfall animation', () => {
  const h = harness({ reduced: true });
  h.click(); h.click(); h.click();
  assert.equal(h.bumps, 0);
  h.advance(1200, true);
  assert.equal(h.canvas.hidden, false);
  assert.equal(h.frames.size, 0);
  assert.equal(h.glass.dataset.damage, '3');
});

test('glass has branching hairline cracks rather than one duplicated starburst', () => {
  assert.match(html, /id="aquarium-glass-primary"/);
  assert.match(html, /id="aquarium-glass-branches"/);
  assert.match(html, /class="aquarium-fracture-shadow"/);
  assert.match(html, /class="aquarium-fracture-light"/);
});

test('water is one contiguous stream that flows behind the taskbar to the viewport bottom', () => {
  assert.equal((html.match(/class="aquarium-water-stream"/g) || []).length, 1);
  assert.match(html, /class="aquarium-water-stream"[^>]*d="[^"]*790/);
  assert.match(html, /class="aquarium-water-current"/);
  assert.doesNotMatch(html, /aquarium-water-rivulet|<animateMotion\b/);
  assert.match(css, /\.aquarium-construction-leak\s*\{[^}]*overflow:\s*visible/s);
  assert.match(css, /\.xp-taskbar\s*\{[^}]*z-index:\s*10000/s);
});
