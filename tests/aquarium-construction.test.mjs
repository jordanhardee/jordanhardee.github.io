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

function harness({ noAudio = false, brokenAudio = false, blockedResume = false, reduced = false, withFish = false } = {}) {
  function element() {
    const listeners = new Map();
    return {
      dataset: {}, attributes: {}, hidden: false, textContent: '',
      addEventListener(type, fn) { const list = listeners.get(type) || []; list.push(fn); listeners.set(type, list); },
      dispatchEvent(event) { for (const fn of listeners.get(event.type) || []) fn(event); },
      setAttribute(name, value) { this.attributes[name] = value; },
      removeAttribute(name) { delete this.attributes[name]; if (name === 'hidden') this.hidden = false; },
    };
  }
  const glass = element(), controls = element(), tap = element(), repair = element(), warningSign = element(), status = element(), canvas = element(), sign = element();
  canvas.hidden = true;
  repair.hidden = warningSign.hidden = true;
  let bumps = 0, now = 0, next = 0;
  const timers = new Map(), frames = new Map(), audioContexts = [];
  const glassPaint = [];
  const drawing = new Proxy({}, { get: (target, key) => {
    if (key === 'createLinearGradient') return () => ({ addColorStop() {} });
    if (key === 'clearRect') return () => { glassPaint.length = 0; };
    if (key === 'fill') return () => glassPaint.push({ fill: target.fillStyle });
    if (key === 'translate') return (x, y) => glassPaint.push({ x, y });
    return () => {};
  } });
  canvas.getContext = () => drawing;
  const painted = [];
  let translated = { x: 0, y: 0 };
  const fishDrawing = new Proxy({}, { get: (_, key) => {
    if (key === 'createLinearGradient') return () => ({ addColorStop() {} });
    if (key === 'clearRect') return () => { painted.length = 0; };
    if (key === 'translate') return (x, y) => { translated = { x, y }; };
    if (key === 'drawImage') return (image, ...args) => {
      if (image.src.includes('fish-atlas')) painted.push({ id: `${image.src}:${args[0]},${args[1]}`, ...translated });
    };
    return () => {};
  } });
  const fishCanvas = { dataset: {}, clientWidth: 1366, clientHeight: 900, getContext: () => fishDrawing };
  sign.animate = () => { bumps++; return { cancel() {} }; };
  glass.getBoundingClientRect = () => ({ left: 950, top: 500, width: 300, height: 300 });
  glass.querySelector = selector => ({ '.aquarium-burst-canvas': canvas, '.aquarium-construction-sign': sign })[selector];
  controls.querySelector = selector => ({ '.aquarium-glass-tap': tap, '.aquarium-glass-repair': repair, '.aquarium-glass-status': status })[selector];
  const document = element(), window = element(), motion = element();
  document.hidden = false;
  document.querySelector = selector => ({ '.aquarium-construction': glass, '.aquarium-construction-controls': controls, '.aquarium-fish-killer-sign': warningSign })[selector];
  document.getElementById = id => id === 'site-aquarium-canvas' ? fishCanvas : null;
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
    resume() {
      if (blockedResume) return Promise.reject(new Error('Playback blocked'));
      this.state = 'running'; return Promise.resolve();
    }
    suspend() { this.state = 'suspended'; return Promise.resolve(); }
  }
  if (!noAudio) window.AudioContext = AudioContext;
  const sandbox = vm.createContext({
    window, document, performance: { now: () => now },
    Image: class { naturalWidth = 1536; naturalHeight = 1024; src = ''; },
    CustomEvent: class { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } },
    setTimeout(fn, delay) { const id = ++next; timers.set(id, { fn, at: now + delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    requestAnimationFrame(fn) { const id = ++next; frames.set(id, fn); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
  });
  if (withFish) vm.runInContext(readFileSync(new URL('../js/aquarium-background.js', import.meta.url), 'utf8'), sandbox);
  vm.runInContext(interaction, sandbox);
  return {
    glass, controls, tap, status, canvas, document, window, motion, audioContexts, frames, repairButton: repair, warningSign, fishCanvas, painted, glassPaint,
    get bumps() { return bumps; },
    click() { tap.dispatchEvent({ type: 'click' }); },
    repair() { repair.dispatchEvent({ type: 'click' }); },
    event(type, detail) { document.dispatchEvent({ type, detail }); },
    advance(ms, paint = false) {
      now += ms;
      for (const [id, timer] of timers) if (timer.at <= now) { timers.delete(id); timer.fn(); }
      if (paint) { const ready = [...frames.values()]; frames.clear(); ready.forEach(fn => fn(now)); }
    },
  };
}

test('three taps break the glass and the separate repair button stops the waterfall and allows replay', () => {
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
  h.repair();
  assert.equal(h.glass.dataset.damage, '0');
  assert.equal(h.canvas.hidden, true);
  assert.ok(water.stopped);
  assert.equal(h.frames.size, 0);
  assert.equal(h.controls.dataset.sound, 'off');
  h.click(); h.click(); h.click();
  assert.equal(h.glass.dataset.damage, '3');
  assert.equal(h.audioContexts[0].sources.filter(source => source.loop && !source.stopped).length, 1);
});

test('the fourth tap lowers the water to the crack, removes upper fish and accelerates the lower fish', () => {
  const h = harness({ withFish: true });
  h.click(); h.click(); h.click();
  h.advance(1200, true);
  h.click();
  assert.equal(h.glass.dataset.damage, '4');
  h.click();
  assert.equal(h.glass.dataset.damage, '4', 'wait for the water to reach the crack before the final tap');
  h.advance(3250, true);
  h.advance(50, true);
  assert.equal(h.fishCanvas.dataset.phase, 'lowering');
  assert.ok(Number(h.fishCanvas.dataset.waterLevel) > 0);
  assert.ok(Number(h.fishCanvas.dataset.fishRemaining) < 12);
  h.advance(3500, true);
  assert.equal(h.fishCanvas.dataset.phase, 'low');
  assert.ok(Number(h.fishCanvas.dataset.fishRemaining) >= 3);
  assert.ok(Number(h.fishCanvas.dataset.fishRemaining) < 12);
  assert.equal(h.tap.attributes['aria-disabled'], undefined);
  h.advance(50, true);
  const before = new Map(h.painted.map(f => [f.id, f.x]));
  h.advance(50, true);
  const distances = h.painted.filter(f => before.has(f.id)).map(f => Math.abs(f.x - before.get(f.id)));
  assert.ok(Math.max(...distances) > 6, 'the remaining fish really move faster, beyond just a status flag');
});

test('the final tap empties the tank; repair refills it and leaves the fish killer sign', () => {
  const h = harness({ withFish: true });
  h.click(); h.click(); h.click(); h.advance(1200, true);
  h.click(); h.advance(7000, true);
  h.click();
  assert.equal(h.glass.dataset.damage, '5');
  h.advance(5000, true);
  assert.equal(h.controls.dataset.flow, 'dry');
  assert.equal(h.fishCanvas.dataset.phase, 'dry');
  assert.equal(h.fishCanvas.dataset.fishRemaining, '0');
  assert.equal(h.fishCanvas.dataset.fishEscaped, '12');
  assert.ok(Number(h.fishCanvas.dataset.waterLevel) >= 1);
  assert.equal(h.controls.dataset.sound, 'off');
  assert.equal(h.frames.size, 0, 'an empty tank does not keep animating or making water noise');
  assert.equal(h.warningSign.hidden, true, 'the scenery sign appears after repair');
  h.repair();
  assert.equal(h.glass.dataset.damage, '0');
  assert.equal(h.fishCanvas.dataset.fishRemaining, '12');
  assert.equal(h.fishCanvas.dataset.phase, 'full');
  assert.equal(h.warningSign.hidden, false);
  h.click(); h.repair();
  assert.equal(h.warningSign.hidden, false, 'later repairs keep the earned sign');
});

test('the final break keeps the outlet anchored and releases glass across the whole pane', () => {
  const h = harness();
  const states = [];
  h.document.addEventListener('xp:aquarium-drain', event => states.push(event.detail));
  h.click(); h.click(); h.click(); h.advance(1200, true);
  h.click(); h.advance(7000, true);
  const opening = states.at(-1).outlet;
  assert.ok(h.glassPaint.some(p => p.fill === 'rgba(0, 23, 42, .73)'), 'the initial local hole is visible');
  h.click(); h.advance(50, true);
  const fragments = h.glassPaint.filter(p => p.x !== undefined);
  assert.ok(fragments.some(p => p.x < 400), 'the far side of the pane also breaks');
  assert.ok(fragments.some(p => p.y < 300), 'the upper pane also breaks');
  assert.ok(!h.glassPaint.some(p => p.fill === 'rgba(0, 23, 42, .73)'), 'a total break leaves no floating dark hole');
  h.advance(2200, true);
  assert.equal(h.glassPaint.filter(p => p.x !== undefined).length, 0, 'detached glass leaves the scene');
  h.advance(2500, true);
  for (const state of states.filter(state => state.stage === 5)) {
    assert.equal(state.outlet.x, opening.x);
    assert.equal(state.outlet.y, opening.y, 'lowering the water must never lower the hole');
  }
  assert.equal(h.glassPaint.length, 0, 'the dry tank has no remaining hole or falling glass');
});

test('the remaining fish spill from their own positions when the whole front pane opens', () => {
  const h = harness({ withFish: true });
  h.click(); h.click(); h.click(); h.advance(1200, true);
  h.click(); h.advance(7000, true); h.advance(50, true);
  const before = new Map(h.painted.map(f => [f.id, f]));
  h.click(); h.advance(1700, true); h.advance(50, true);
  const escaping = h.painted.filter(f => before.has(f.id));
  assert.ok(escaping.length >= 3);
  for (const f of escaping) {
    assert.ok(Math.abs(f.x - before.get(f.id).x) < 100, 'fish do not converge on the old opening');
    assert.ok(f.y > before.get(f.id).y, 'fish fall outward with the lower pool');
  }
});

test('repair during draining cancels the sequence and cannot remove the restored fish later', () => {
  const h = harness({ withFish: true });
  h.click(); h.click(); h.click(); h.advance(1200, true);
  h.click(); h.advance(1500, true);
  h.repair(); h.advance(20000, true);
  assert.equal(h.glass.dataset.damage, '0');
  assert.equal(h.fishCanvas.dataset.phase, 'full');
  assert.equal(h.fishCanvas.dataset.fishRemaining, '12');
  assert.equal(h.warningSign.hidden, true);
  assert.equal(h.controls.dataset.sound, 'off');
});

test('reduced motion can drain and refill catfish without continuous fish or waterfall animation', () => {
  const h = harness({ withFish: true, reduced: true });
  h.event('xp:cats-state', { released: true });
  h.click(); h.click(); h.click(); h.advance(1200, true);
  h.click(); h.advance(50, true);
  assert.equal(h.fishCanvas.dataset.phase, 'low');
  h.click(); h.advance(50, true);
  assert.equal(h.fishCanvas.dataset.phase, 'dry');
  assert.equal(h.frames.size, 0);
  h.repair();
  assert.equal(h.fishCanvas.dataset.fishRemaining, '12');
  assert.equal(h.warningSign.hidden, false);
  assert.ok(h.painted.every(f => f.id.includes('catfish-atlas')));
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

test('rejected audio playback releases focus without interrupting the visual effect', async () => {
  const h = harness({ blockedResume: true });
  h.click(); h.click(); h.click();
  await Promise.resolve();
  assert.equal(h.glass.dataset.damage, '3');
  assert.equal(h.canvas.hidden, false);
  assert.equal(h.controls.dataset.sound, 'unavailable');
  assert.equal(h.audioContexts[0].sources.filter(source => source.loop && !source.stopped).length, 0);
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
