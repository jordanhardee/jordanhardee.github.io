import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const script = readFileSync(new URL('../js/start-menu.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function makePage(fullscreenSupported = true) {
  const listeners = new Map();
  const emitted = [];
  const start = { addEventListener() {}, setAttribute() {}, contains: () => false };
  const menu = { hidden: true, querySelectorAll: () => [], contains: () => false, setAttribute() {} };
  const button = { addEventListener(type, callback) { listeners.set(`button:${type}`, callback); } };
  const overlay = {
    hidden: true,
    addEventListener(type, callback) { listeners.set(`overlay:${type}`, callback); },
  };
  if (fullscreenSupported) overlay.requestFullscreen = () => Promise.resolve();
  const video = {
    plays: 0, pauses: 0, loads: 0, src: '', controls: false,
    addEventListener(type, callback) { listeners.set(`video:${type}`, callback); },
    play() { this.plays++; return Promise.resolve(); },
    pause() { this.pauses++; },
    load() { this.loads++; },
    removeAttribute(name) { if (name === 'src') this.src = ''; },
  };
  const close = { addEventListener(type, callback) { listeners.set(`close:${type}`, callback); } };
  const elements = {
    'xp-start-button': start,
    'xp-start-menu': menu,
    'xp-hack-planet': button,
    'xp-hack-video-overlay': overlay,
    'xp-hack-video': video,
    'xp-hack-video-close': close,
  };
  const document = {
    currentScript: { src: 'https://example.test/js/start-menu.js' },
    getElementById: id => elements[id] || null,
    addEventListener(type, callback) { listeners.set(`document:${type}`, callback); },
    dispatchEvent(event) { emitted.push(event.type); },
    fullscreenElement: null,
  };
  const window = {};
  vm.runInNewContext(script, {
    document, window, URL, console,
    CustomEvent: class { constructor(type) { this.type = type; } },
  });
  return { listeners, emitted, overlay, video, document, click: () => listeners.get('button:click')() };
}

test('Hack the Planet loads the compact MP4 and starts audible playback on click', () => {
  assert.match(html, /<video id="xp-hack-video"[^>]*playsinline/);
  assert.doesNotMatch(html, /xp-hack-gif/);
  assert.ok(statSync(new URL('../assets/hack-the-planet.mp4', import.meta.url)).size < 1_000_000);
  const page = makePage();
  page.click();
  assert.equal(page.overlay.hidden, false);
  assert.equal(page.video.plays, 1);
  assert.equal(page.video.muted, false);
  assert.equal(page.video.volume, 1);
  assert.match(page.video.src, /\/assets\/hack-the-planet\.mp4\?v=/);
  assert.deepEqual(page.emitted, ['xp:hack-playback-start']);
  page.listeners.get('video:ended')();
  assert.equal(page.overlay.hidden, true);
  assert.equal(page.video.pauses, 1);
  assert.equal(page.video.src, '');
  assert.deepEqual(page.emitted, ['xp:hack-playback-start', 'xp:hack-playback-stop']);
});

test('fullscreen fallback still plays, and the close button stops playback', () => {
  const page = makePage(false);
  page.click();
  assert.equal(page.video.plays, 1);
  assert.equal(page.overlay.hidden, false);
  page.listeners.get('close:click')();
  assert.equal(page.overlay.hidden, true);
  assert.equal(page.video.pauses, 1);
});
