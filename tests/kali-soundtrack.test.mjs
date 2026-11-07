import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const load = name => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
const html = load('index.html');
const soundtrack = load('js/kali-soundtrack.js');
const music = load('js/music.js');

function page() {
  const listeners = new Map();
  const audios = [];
  const elements = new Map();
  const node = () => ({
    textContent: '', attributes: {}, listeners: {},
    classList: { closed: new Set(), contains(name) { return this.closed.has(name); } },
    addEventListener(kind, listener) { this.listeners[kind] = listener; },
    setAttribute(name, value) { this.attributes[name] = value; },
  });
  for (const id of ['kali-sound-toggle', 'kali-sound-status', 'xp-music-toggle', 'credits-music-toggle', 'credits-music-status']) {
    elements.set(id, node());
  }
  const panel = node();
  panel.classList.closed.add('module-closed');
  class Audio {
    constructor() {
      this.paused = true;
      this.ended = false;
      this.currentTime = 0;
      this.src = '';
      this.playCount = 0;
      this.pauseCount = 0;
      this.handlers = {};
      audios.push(this);
    }
    addEventListener(name, listener) { this.handlers[name] = listener; }
    play() { this.playCount++; this.paused = false; return Promise.resolve(); }
    pause() { this.pauseCount++; this.paused = true; }
    emit(name) { this.handlers[name]?.(); }
  }
  class CustomEvent {
    constructor(type, data) { this.type = type; this.detail = data?.detail; }
  }
  const document = {
    querySelector: value => value === '[data-window="kali-terminal"]' ? panel : null,
    getElementById: id => elements.get(id),
    addEventListener(name, listener) {
      if (!listeners.has(name)) listeners.set(name, []);
      listeners.get(name).push(listener);
    },
    dispatchEvent(event) { for (const listener of listeners.get(event.type) || []) listener(event); },
  };
  const localStorage = { getItem: () => 'on' };
  vm.runInNewContext(music, { Audio, document, localStorage, Element: class Element {} });
  vm.runInNewContext(soundtrack, { Audio, document, CustomEvent });
  const emit = (type, window = 'kali-terminal') => document.dispatchEvent(new CustomEvent(type, { detail: { window } }));
  return { panel, audios, elements, emit };
}

test('OpenSSH keeps Kali as a nostalgia-only Easter egg and offers an audio fallback', () => {
  assert.match(html, /id="openssh-shortcut" data-launch="kali-terminal"/);
  assert.match(html, /id="kali-sound-toggle"/);
  assert.match(html, /js\/kali-soundtrack\.js\?v=20261104-voodoo-people/);
  assert.doesNotMatch(html.slice(html.indexOf('id="xp-program-list"'), html.indexOf('id="xp-task-list"')), /data-open-window="kali-terminal"/);
  assert.match(soundtrack, /audio\.preload = 'none'/);
  assert.match(soundtrack, /audio\.loop = false/);
  assert.match(soundtrack, /archive\.org\/download\/prodigydisco_202004/);
});

test('Kali audio takes priority and returns audio focus on minimize, restore and close', async () => {
  const { panel, audios, elements, emit } = page();
  const [sm64, voodoo] = audios;
  assert.equal(sm64.playCount, 0, 'background music is opt-in');
  elements.get('xp-music-toggle').listeners.click();
  assert.equal(sm64.playCount, 1);
  panel.classList.closed.delete('module-closed');
  emit('xp:window-opened');
  assert.equal(voodoo.playCount, 1, 'playing begins synchronously within the opening click');
  assert.equal(sm64.paused, true);
  assert.ok(voodoo.src.includes('Voodoo%20People.mp3'));
  await Promise.resolve();
  assert.match(elements.get('kali-sound-status').textContent, /VOODOO PEOPLE/);
  panel.classList.closed.add('module-minimized');
  emit('xp:minimized');
  assert.equal(voodoo.paused, true);
  assert.equal(sm64.paused, false);
  panel.classList.closed.delete('module-minimized');
  emit('xp:restored');
  assert.equal(voodoo.playCount, 2);
  assert.equal(sm64.paused, true);
  emit('xp:closed');
  assert.equal(voodoo.paused, true);
  assert.equal(voodoo.currentTime, 0);
  assert.equal(sm64.paused, false);
});

test('Kali sound may be stopped and replayed, and releases focus when track ends', async () => {
  const { panel, audios, elements, emit } = page();
  const [sm64, voodoo] = audios;
  const toggle = elements.get('kali-sound-toggle');
  elements.get('xp-music-toggle').listeners.click();
  panel.classList.closed.delete('module-closed');
  emit('xp:window-opened');
  toggle.listeners.click();
  assert.equal(voodoo.paused, true);
  assert.equal(sm64.paused, false);
  toggle.listeners.click();
  assert.equal(voodoo.playCount, 2);
  assert.equal(sm64.paused, true);
  voodoo.emit('ended');
  assert.equal(sm64.paused, false);
  assert.equal(toggle.textContent, '▶ REPLAY');
  await Promise.resolve();
});

test('a browser autoplay denial restores the original background sound and offers retry', async () => {
  const { panel, audios, elements, emit } = page();
  const [sm64, voodoo] = audios;
  elements.get('xp-music-toggle').listeners.click();
  voodoo.play = () => Promise.reject(Object.assign(new Error('gesture required'), { name: 'NotAllowedError' }));
  panel.classList.closed.delete('module-closed');
  emit('xp:window-opened');
  assert.equal(sm64.paused, true);
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(sm64.paused, false);
  assert.equal(elements.get('kali-sound-toggle').textContent, '▶ PLAY');
  assert.match(elements.get('kali-sound-status').textContent, /TAP PLAY/);
});

test('all automatically played site sounds yield to the Kali track', () => {
  const startMenu = load('js/start-menu.js');
  const cats = load('js/release-cats.js');
  const floppa = load('js/floppa-friday.js');
  for (const source of [startMenu, cats, floppa]) {
    assert.match(source, /xp:kali-playback-start/);
    assert.match(source, /xp:kali-playback-stop/);
  }
  assert.match(music, /'floppa', 'kali'/);
  assert.match(startMenu, /if \(!fartAudio \|\| kaliSoundActive\) return/);
  assert.match(startMenu, /hackVideo\?\.pause\(\)/);
  assert.match(cats, /if \(kaliSoundActive\) return/);
  assert.match(cats, /video\.pause\(\)/);
  assert.match(floppa, /audioSource\.stop\(\)/);
  assert.match(soundtrack, /tellEmbeddedGames\(true\)/);
  assert.match(soundtrack, /tellEmbeddedGames\(false\)/);
  assert.match(load('js/club-penguin.js'), /api\.volume = 0/);
  assert.match(load('doom.html'), /context\.suspend\(\)/);
});
