import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const script = readFileSync(new URL('../js/start-menu.js', import.meta.url), 'utf8');

function makePage(withAudio) {
  let clicks = 0;
  let sounds = 0;
  const attributes = {};
  const start = {
    addEventListener(type, handler) { if (type === 'click') clicks = handler; },
    setAttribute(name, value) { attributes[name] = value; },
    contains() { return false; },
  };
  const menu = {
    hidden: true,
    querySelectorAll() { return []; },
    contains() { return false; },
  };
  class AudioContextMock {
    state = 'running';
    currentTime = 0;
    sampleRate = 22050;
    destination = {};
    createBuffer(_channels, count) { return { getChannelData() { return new Float32Array(count); } }; }
    createBufferSource() { return { connect() {}, start() { sounds++; } }; }
    createBiquadFilter() {
      return { frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} };
    }
    createGain() { return { gain: { value: 0 }, connect() {} }; }
  }
  const document = {
    currentScript: { src: 'https://example.test/js/start-menu.js' },
    getElementById(id) { return id === 'xp-start-button' ? start : id === 'xp-start-menu' ? menu : null; },
    addEventListener() {},
  };
  const window = withAudio ? { AudioContext: AudioContextMock } : {};
  vm.runInNewContext(script, { document, window, URL, console, Math });
  return { open: () => clicks(), menu, attributes, getSounds: () => sounds };
}

test('fart plays on opening but not closing the XP menu', () => {
  const page = makePage(true);
  page.open();
  assert.equal(page.menu.hidden, false);
  assert.equal(page.getSounds(), 1);
  assert.equal(page.attributes['aria-expanded'], 'true');
  page.open();
  assert.equal(page.menu.hidden, true);
  assert.equal(page.getSounds(), 1);
  page.open();
  assert.equal(page.getSounds(), 2);
});

test('menu still opens if the browser has no Web Audio API', () => {
  const page = makePage(false);
  page.open();
  assert.equal(page.menu.hidden, false);
  assert.equal(page.getSounds(), 0);
});
