import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

const script = readFileSync(new URL('../js/release-cats.js', import.meta.url), 'utf8');
const musicScript = readFileSync(new URL('../js/music.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function makePage(width = 1200) {
  const events = new Map();
  const element = () => ({
    hidden: true, children: [], listeners: {},
    classList: {
      values: new Set(),
      contains(name) { return this.values.has(name); },
      add(name) { this.values.add(name); },
      remove(name) { this.values.delete(name); },
    },
    style: { setProperty() {} },
    addEventListener(type, handler) { this.listeners[type] = handler; },
    appendChild(child) { this.children.push(child); },
    replaceChildren() { this.children = []; },
  });
  const swarm = element(), runway = element(), status = { textContent: '' };
  const release = element(), recall = element(), hint = element();
  const panel = element(), happyPanel = element();
  panel.classList.add('module-closed');
  happyPanel.classList.add('module-closed');
  const video = element();
  video.attributes = {};
  video.playCount = 0;
  video.pauseCount = 0;
  video.getAttribute = key => video.attributes[key] ?? null;
  video.removeAttribute = key => { delete video.attributes[key]; };
  Object.defineProperty(video, 'src', {
    set(value) { video.attributes.src = value; },
    get() { return video.attributes.src; },
  });
  video.play = () => { video.playCount++; return Promise.resolve(); };
  video.pause = () => { video.pauseCount++; };
  video.load = () => {};
  const nodes = {
    'xp-cat-swarm': swarm, 'xp-cat-runway': runway, 'cats-status': status,
    'cats-release': release, 'cats-recall': recall,
    'happy-video': video, 'happy-playback-hint': hint,
  };
  const CustomEvent = class {
    constructor(type, options) { this.type = type; this.detail = options.detail; }
  };
  const document = {
    querySelector: selector => selector.includes('happy-exe') ? happyPanel : panel,
    getElementById: id => nodes[id] || null,
    createElement: element,
    addEventListener(name, listener) {
      if (!events.has(name)) events.set(name, []);
      events.get(name).push(listener);
    },
    dispatchEvent(event) {
      if (event.type === 'xp:open-window' && event.detail.window === 'happy-exe') {
        happyPanel.classList.remove('module-closed', 'module-minimized');
      }
      if (event.type === 'xp:close-window' && event.detail.window === 'happy-exe') {
        happyPanel.classList.add('module-closed');
        document.dispatchEvent(new CustomEvent('xp:closed', { detail: { window: 'happy-exe' } }));
      }
      for (const listener of events.get(event.type) || []) listener(event);
    },
  };
  vm.runInNewContext(script, { document, window: { innerWidth: width }, CustomEvent });
  const dispatch = (name, app = 'release-cats') => document.dispatchEvent(new CustomEvent(name, { detail: { window: app } }));
  return { swarm, runway, status, release, recall, panel, happyPanel, video, hint, dispatch };
}

test('happy.exe is a separate XP window with a looping, sound-capable, lazy video', () => {
  assert.match(html, /data-window="happy-exe"/);
  assert.match(html, /id="happy-video" controls loop playsinline preload="none"/);
  assert.match(html, /id="cats-recall"[^>]*>KITTY JAIL</);
  assert.match(html, /data-window="happy-exe" aria-label="Restore happy.exe"/);
  assert.match(html, /src="js\/release-cats\.js\?v=/);
  assert.doesNotMatch(html, /<video[^>]+autoplay/);
  assert.ok(existsSync(new URL('../assets/cats/happy.mp4', import.meta.url)));
});

test('only four distinct large cats, with repeated taskbar jumpers; KITTY JAIL clears everything', () => {
  const page = makePage();
  assert.equal(page.swarm.children.length, 0);
  assert.equal(page.video.getAttribute('src'), null);
  page.dispatch('xp:window-opened');
  assert.equal(page.swarm.children.length, 4);
  assert.equal(page.runway.children.length, 6);
  assert.equal(page.swarm.hidden, false);
  assert.equal(page.video.playCount, 1);
  assert.equal(page.video.src, 'assets/cats/happy.mp4');
  assert.equal(page.happyPanel.classList.contains('module-closed'), false);
  const sources = page.swarm.children.map(child => child.children[0].src);
  assert.equal(new Set(sources).size, 4);
  page.release.listeners.click();
  assert.equal(page.swarm.children.length, 4);
  assert.equal(page.runway.children.length, 6);
  assert.equal(page.video.playCount, 2);
  page.recall.listeners.click();
  assert.equal(page.swarm.children.length, 0);
  assert.equal(page.runway.children.length, 0);
  assert.equal(page.swarm.hidden, true);
  assert.equal(page.video.getAttribute('src'), null);
  assert.equal(page.happyPanel.classList.contains('module-closed'), true);
  assert.match(page.status.textContent, /KITTY JAIL/);
  page.dispatch('xp:window-opened');
  assert.equal(page.swarm.children.length, 4);
});

test('closing happy.exe stops its video without recalling the cats; closing cats recalls both', () => {
  const page = makePage();
  page.dispatch('xp:window-opened');
  page.dispatch('xp:closed', 'happy-exe');
  assert.equal(page.video.getAttribute('src'), null);
  assert.equal(page.swarm.children.length, 4);
  page.dispatch('xp:closed');
  assert.equal(page.swarm.children.length, 0);
  assert.equal(page.video.getAttribute('src'), null);
});

test('mobile still shows each main cat once and uses four taskbar jumpers', () => {
  const page = makePage(390);
  page.dispatch('xp:window-opened');
  assert.equal(page.swarm.children.length, 4);
  assert.equal(page.runway.children.length, 4);
});

test('background music pauses for happy.exe and resumes only when enabled', () => {
  const handlers = new Map();
  const elements = {
    'xp-music-toggle': { setAttribute() {}, addEventListener() {} },
    'credits-music-toggle': { setAttribute() {}, addEventListener() {} },
    'credits-music-status': { textContent: '' },
  };
  const document = {
    getElementById: id => elements[id],
    addEventListener: (type, callback) => handlers.set(type, callback),
  };
  const audio = {
    paused: true, src: '', playCount: 0, pauseCount: 0,
    addEventListener() {},
    play() { this.playCount++; this.paused = false; return Promise.resolve(); },
    pause() { this.pauseCount++; this.paused = true; },
  };
  vm.runInNewContext(musicScript, {
    document, Audio: function () { return audio; },
    localStorage: { getItem() { return null; }, setItem() {} },
    Element: class {},
  });
  assert.equal(audio.playCount, 1);
  handlers.get('xp:happy-playback-start')();
  assert.equal(audio.paused, true);
  assert.match(elements['credits-music-status'].textContent, /Paused while a video plays/);
  handlers.get('xp:hack-playback-start')();
  handlers.get('xp:happy-playback-stop')();
  assert.equal(audio.paused, true, 'hack clip should keep music paused after happy.exe stops');
  handlers.get('xp:hack-playback-stop')();
  assert.equal(audio.playCount, 2);
  assert.equal(audio.paused, false);
});
