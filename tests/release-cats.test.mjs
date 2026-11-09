import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

const script = readFileSync(new URL('../js/release-cats.js', import.meta.url), 'utf8');
const musicScript = readFileSync(new URL('../js/music.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
const windowManager = readFileSync(new URL('../js/window-manager.js', import.meta.url), 'utf8');
const fullscreenScript = readFileSync(new URL('../js/module-fullscreen.js', import.meta.url), 'utf8');

function makePage(width = 1200, webAudio = false) {
  const events = new Map();
  const catfishStates = [];
  const sounds = [];
  const sources = [];
  class Audio {
    constructor() { this.listeners = {}; this.playCount = 0; this.pauseCount = 0; sounds.push(this); }
    addEventListener(name, listener) { this.listeners[name] = listener; }
    play() { this.playCount++; return Promise.resolve(); }
    pause() { this.pauseCount++; }
  }
  class AudioContext {
    constructor() { this.destination = {}; this.resumeCount = 0; }
    resume() { this.resumeCount++; return Promise.resolve(); }
    decodeAudioData() { return Promise.resolve({ duration: 1.07 }); }
    createBufferSource() {
      const source = {
        started: false, stopped: false,
        connect() {}, disconnect() {},
        start() { this.started = true; },
        stop() { this.stopped = true; },
      };
      sources.push(source);
      return source;
    }
  }
  const element = () => ({
    hidden: true, children: [], listeners: {}, dataset: {},
    classList: {
      values: new Set(),
      contains(name) { return this.values.has(name); },
      add(name) { this.values.add(name); },
      remove(name) { this.values.delete(name); },
    },
    style: { values: {}, setProperty(name, value) { this.values[name] = value; } },
    addEventListener(type, handler) { this.listeners[type] = handler; },
    appendChild(child) { this.children.push(child); },
    replaceChildren() { this.children = []; },
  });
  const swarm = element(), runway = element(), status = { textContent: '' };
  const release = element(), recall = element(), hint = element();
  const panel = element(), happyPanel = element(), zoomPanel = element();
  panel.classList.add('module-closed');
  happyPanel.classList.add('module-closed');
  zoomPanel.classList.add('module-closed');
  const video = element();
  video.volume = 1;
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
    querySelector: selector => selector.includes('happy-exe') ? happyPanel
      : selector.includes('zoom-exe') ? zoomPanel : panel,
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
      if (event.type === 'xp:open-window' && event.detail.window === 'zoom-exe') {
        zoomPanel.classList.remove('module-closed', 'module-minimized');
      }
      if (event.type === 'xp:close-window' && event.detail.window === 'zoom-exe') {
        zoomPanel.classList.add('module-closed');
        document.dispatchEvent(new CustomEvent('xp:closed', { detail: { window: 'zoom-exe' } }));
      }
      for (const listener of events.get(event.type) || []) listener(event);
    },
  };
  const window = { innerWidth: width };
  if (webAudio) window.AudioContext = AudioContext;
  const fetch = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) });
  document.addEventListener('xp:cats-state', event => catfishStates.push(event.detail.released));
  vm.runInNewContext(script, { document, window, CustomEvent, Audio, fetch });
  const dispatch = (name, app = 'release-cats') => document.dispatchEvent(new CustomEvent(name, { detail: { window: app } }));
  return { swarm, runway, status, release, recall, panel, happyPanel, zoomPanel, video, hint, sounds, sources, catfishStates, dispatch };
}

test('Release the Cats also opens a draggable XP Zoom.exe window with the supplied nine-cat visual', () => {
  assert.match(html, /data-window="zoom-exe" aria-labelledby="zoom-heading"/);
  assert.match(html, /src="assets\/cats\/zoom-call\.jpg"/);
  assert.match(html, /data-window="zoom-exe" aria-label="Restore Zoom\.exe"/);
  assert.match(windowManager, /'zoom-exe': \[480, 520\]/);
  assert.match(fullscreenScript, /'zoom-exe': 'Zoom\.exe'/);
  const image = readFileSync(new URL('../assets/cats/zoom-call.jpg',import.meta.url));
  assert.equal(image.subarray(0,2).toString('hex'),'ffd8');
  const page = makePage();
  page.dispatch('xp:window-opened');
  assert.equal(page.zoomPanel.classList.contains('module-closed'),false);
  page.recall.listeners.click();
  assert.equal(page.zoomPanel.classList.contains('module-closed'),true);
  page.dispatch('xp:window-opened');
  assert.equal(page.zoomPanel.classList.contains('module-closed'),false);
});

test('happy.exe is a separate XP window with a looping, sound-capable, lazy video', () => {
  assert.match(html, /data-window="happy-exe"/);
  assert.match(html, /id="happy-video" controls loop playsinline preload="none"/);
  assert.match(html, /id="cats-recall"[^>]*>KITTY JAIL</);
  assert.match(html, /data-window="happy-exe" aria-label="Restore happy.exe"/);
  assert.match(html, /src="js\/release-cats\.js\?v=/);
  assert.doesNotMatch(html, /<video[^>]+autoplay/);
  assert.ok(existsSync(new URL('../assets/cats/happy.mp4', import.meta.url)));
});

test('happy.exe fills a proportional 512:910 video window as it changes size', () => {
  assert.match(css, /\.happy-body video\s*\{[^}]*object-fit:cover/);
  assert.match(css, /\.xp-app-window \.happy-body\s*\{[^}]*aspect-ratio:var\(--happy-video-ratio,512 \/ 910\)/);
  assert.match(css, /\.happy-panel\s*\{[^}]*height:auto!important/);
  assert.match(windowManager, /function boundedHappyRect\(/);
  assert.match(windowManager, /function happyHeight\(/);
  assert.match(fullscreenScript, /module\.classList\.toggle\('happy-enlarged'\)/);
  const page = makePage();
  page.video.videoWidth = 512;
  page.video.videoHeight = 910;
  page.video.listeners.loadedmetadata();
  assert.equal(page.happyPanel.style.values['--happy-video-ratio'], '512 / 910');
});

test('five distinct large cats, repeated taskbar jumpers, and one huh sound per release', () => {
  const page = makePage();
  assert.equal(page.swarm.children.length, 0);
  assert.equal(page.video.getAttribute('src'), null);
  page.dispatch('xp:window-opened');
  assert.equal(page.swarm.children.length, 5);
  assert.deepEqual(page.catfishStates, [true], 'fish switch to catfish when cats escape');
  assert.equal(page.runway.children.length, 6);
  assert.equal(page.swarm.hidden, false);
  assert.equal(page.video.playCount, 1);
  assert.equal(page.video.src, 'assets/cats/happy.mp4');
  assert.equal(page.happyPanel.classList.contains('module-closed'), false);
  const sources = page.swarm.children.map(child => child.children[0].src);
  assert.equal(new Set(sources).size, 5);
  assert.ok(sources.includes('assets/cats/huh-animated.webp'));
  assert.equal(page.sounds.length, 1);
  assert.equal(page.sounds[0].src, 'assets/cats/huh.mp3');
  assert.equal(page.sounds[0].playCount, 1);
  assert.equal(page.video.volume, 0.18, 'the huh sound temporarily ducks the video');
  page.release.listeners.click();
  assert.deepEqual(page.catfishStates, [true], 'repeated release does not retrigger the transformation');
  assert.equal(page.swarm.children.length, 5);
  assert.equal(page.runway.children.length, 6);
  assert.equal(page.video.playCount, 2);
  assert.equal(page.sounds[0].playCount, 1, 'huh does not repeat until KITTY JAIL');
  page.recall.listeners.click();
  assert.deepEqual(page.catfishStates, [true, false], 'KITTY JAIL restores ordinary fish');
  assert.equal(page.video.volume, 1, 'KITTY JAIL restores video volume');
  assert.equal(page.swarm.children.length, 0);
  assert.equal(page.runway.children.length, 0);
  assert.equal(page.swarm.hidden, true);
  assert.equal(page.video.getAttribute('src'), null);
  assert.equal(page.happyPanel.classList.contains('module-closed'), true);
  assert.ok(page.sounds[0].pauseCount >= 1);
  assert.match(page.status.textContent, /KITTY JAIL/);
  page.dispatch('xp:window-opened');
  assert.equal(page.swarm.children.length, 5);
  assert.equal(page.sounds[0].playCount, 2);
});

test('Web Audio starts the huh clip and stops it immediately for KITTY JAIL', async () => {
  const page = makePage(1200, true);
  page.dispatch('xp:window-opened');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(page.sources.length, 1);
  assert.equal(page.sources[0].started, true);
  assert.equal(page.panel.dataset.huhAudio, 'playing');
  assert.equal(page.video.volume, 0.18);
  page.recall.listeners.click();
  assert.equal(page.sources[0].stopped, true);
  assert.equal(page.panel.dataset.huhAudio, 'stopped');
  assert.equal(page.video.volume, 1);
  page.dispatch('xp:window-opened');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(page.sources.length, 2, 'a new sound plays after the cats are released again');
  assert.equal(page.sources[1].started, true);
  page.sources[1].onended();
  assert.equal(page.panel.dataset.huhAudio, 'ended');
  assert.equal(page.video.volume, 1);
});

test('cat cutouts are all transparent animated WebP; taskbar adds no vertical bounce', () => {
  for (const name of ['hands', 'feeding', 'hilarious', 'giphy', 'jump']) {
    const path = `assets/cats/${name}-transparent.webp`;
    assert.ok(script.includes(path), `${name} is displayed using its cutout`);
    const bytes = readFileSync(new URL(`../${path}`, import.meta.url));
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    assert.equal(bytes.toString('ascii', 12, 16), 'VP8X');
    assert.ok(bytes[20] & 0x10, `${name} has alpha transparency`);
    assert.ok(bytes.includes(Buffer.from('ANIM')), `${name} retains its animated frames`);
  }
  const huh = readFileSync(new URL('../assets/cats/huh-animated.webp', import.meta.url));
  assert.equal(huh.toString('ascii', 0, 4), 'RIFF');
  assert.equal(huh.toString('ascii', 12, 16), 'VP8X');
  assert.ok(huh[20] & 0x10, 'huh cat keeps transparent background');
  assert.ok(huh.includes(Buffer.from('ANIM')), 'huh cat actually animates');
  assert.ok(existsSync(new URL('../assets/cats/huh.mp3', import.meta.url)));
  assert.match(script, /window\.AudioContext \|\| window\.webkitAudioContext/, 'the huh sound uses Web Audio on iOS');
  assert.doesNotMatch(css, /xp-cat-hop/, 'no extra CSS hop on top of the original animation');
  assert.match(css, /\.xp-cat-runner\s*\{[^}]*animation:xp-cat-walk/, 'runners still cross the taskbar');
  assert.match(css, /\.xp-cat-runner\s*\{[^}]*width:136px; height:156px/, 'desktop taskbar cats are larger');
  assert.match(css, /@media\(max-width:650px\)[\s\S]*?\.xp-cat-runner\s*\{[^}]*width:112px; height:128px/, 'mobile taskbar cats are larger');
});

test('closing happy.exe stops its video without recalling the cats; closing cats recalls both', () => {
  const page = makePage();
  page.dispatch('xp:window-opened');
  page.dispatch('xp:closed', 'happy-exe');
  assert.equal(page.video.getAttribute('src'), null);
  assert.equal(page.swarm.children.length, 5);
  page.dispatch('xp:closed');
  assert.equal(page.swarm.children.length, 0);
  assert.equal(page.video.getAttribute('src'), null);
});

test('mobile still shows each main cat once and uses four taskbar jumpers', () => {
  const page = makePage(390);
  page.dispatch('xp:window-opened');
  assert.equal(page.swarm.children.length, 5);
  assert.equal(page.runway.children.length, 4);
});

test('background music pauses for happy.exe and resumes only when enabled', () => {
  const handlers = new Map();
  const elements = {
    'xp-music-toggle': { setAttribute() {}, addEventListener(type, handler) { this[type] = handler; } },
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
  assert.equal(audio.playCount, 0, 'no background autoplay on page load');
  handlers.get('xp:happy-playback-start')();
  assert.equal(audio.paused, true);
  handlers.get('xp:hack-playback-start')();
  handlers.get('xp:happy-playback-stop')();
  assert.equal(audio.paused, true, 'hack clip should keep music paused after happy.exe stops');
  handlers.get('xp:hack-playback-stop')();
  assert.equal(audio.playCount, 0, 'other sounds cannot enable background music');
  elements['xp-music-toggle'].click();
  assert.equal(audio.playCount, 1, 'visitor can start music manually');
  handlers.get('xp:happy-playback-start')();
  assert.match(elements['credits-music-status'].textContent, /Paused while a video plays/);
  handlers.get('xp:happy-playback-stop')();
  assert.equal(audio.playCount, 2);
  assert.equal(audio.paused, false);
});
