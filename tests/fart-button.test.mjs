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
    setAttribute() {},
    querySelectorAll() { return []; },
    contains() { return false; },
  };
  const startLabel = { textContent: 'start' };
  class AudioMock {
    pause() {}
    play() {sounds++;return Promise.resolve();}
  }
  const document = {
    currentScript: { src: 'https://example.test/js/start-menu.js' },
    getElementById(id) { return id === 'xp-start-button' ? start : id === 'xp-start-menu' ? menu : id === 'xp-start-label' ? startLabel : null; },
    addEventListener() {},
  };
  const window = {};
  vm.runInNewContext(script, { document, window, URL, console, Math, ...(withAudio ? {Audio:AudioMock} : {}) });
  return { open: () => clicks(), menu, attributes, startLabel, getSounds: () => sounds };
}

test('fart plays on opening but not closing the XP menu', () => {
  const page = makePage(true);
  page.open();
  assert.equal(page.menu.hidden, false);
  assert.equal(page.getSounds(), 1);
  assert.equal(page.attributes['aria-expanded'], 'true');
  assert.equal(page.startLabel.textContent, 'fart');
  page.open();
  assert.equal(page.menu.hidden, true);
  assert.equal(page.getSounds(), 1);
  page.open();
  assert.equal(page.getSounds(), 2);
  assert.equal(page.startLabel.textContent, 'fart');
});

test('menu still opens if the browser has no Web Audio API', () => {
  const page = makePage(false);
  page.open();
  assert.equal(page.menu.hidden, false);
  assert.equal(page.getSounds(), 0);
});
