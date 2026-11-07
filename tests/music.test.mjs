import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const script = readFileSync(new URL('../js/music.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function harness() {
  const listeners = new Map();
  function button(id) {
    return {
      id, handlers: {},
      addEventListener(type, callback) { this.handlers[type] = callback; },
      setAttribute(key, value) { this[key] = value; },
    };
  }
  const tray = button('xp-music-toggle');
  const credits = button('credits-music-toggle');
  const status = { textContent:'' };
  let playCount = 0;
  let pauseCount = 0;
  class Audio {
    constructor() { this.paused = true; this.src = ''; this.handlers = {}; }
    addEventListener(type,callback) { this.handlers[type] = callback; }
    play() { playCount++; this.paused = false; return Promise.resolve(); }
    pause() { pauseCount++; this.paused = true; }
  }
  const document = {
    getElementById:id => ({'xp-music-toggle':tray,'credits-music-toggle':credits,'credits-music-status':status})[id],
    addEventListener:(type,callback) => listeners.set(type,callback),
  };
  // Previously saved autoplay choices must not start the music on page load.
  const localStorage = {getItem:()=>'on',setItem:()=>{ throw Error('Music should not save autoplay preferences'); }};
  vm.runInNewContext(script,{Audio,document,localStorage});
  return { tray,credits,status,listeners,plays:()=>playCount,pauses:()=>pauseCount };
}

test('background music never autoplays, even if an old preference said on', () => {
  const page = harness();
  assert.equal(page.plays(),0);
  assert.equal(page.tray['aria-pressed'],'false');
  assert.equal(page.tray['aria-label'],'Play background music');
  assert.match(page.status.textContent,/Music is off/);
  assert.match(html,/id="xp-music-toggle"[^>]*aria-pressed="false"/);
});

test('taskbar and Credits controls can opt in and pause as before', async () => {
  const page = harness();
  page.tray.handlers.click();
  await Promise.resolve();
  assert.equal(page.plays(),1);
  assert.equal(page.tray['aria-pressed'],'true');
  assert.equal(page.credits['aria-pressed'],'true');
  page.listeners.get('xp:floppa-playback-start')();
  assert.equal(page.pauses(),1);
  page.listeners.get('xp:floppa-playback-stop')();
  assert.equal(page.plays(),2);
  page.credits.handlers.click();
  assert.equal(page.tray['aria-pressed'],'false');
  assert.match(page.status.textContent,/Music is off/);
});
