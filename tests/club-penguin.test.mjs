import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const fromRoot = name => readFileSync(new URL(`../${name}`, import.meta.url));
const html = fromRoot('index.html').toString('utf8');
const player = fromRoot('club-penguin.html').toString('utf8');
const script = fromRoot('js/club-penguin.js').toString('utf8');
const workflow = fromRoot('.github/workflows/static.yml').toString('utf8');
const manager = fromRoot('js/window-manager.js').toString('utf8');

test('original 2010 Coffee Shop and blue puffle assets are actually bundled', () => {
  const room = fromRoot('assets/club-penguin/coffee.swf');
  const puffle = fromRoot('assets/club-penguin/blue-puffle.swf');
  const walk = fromRoot('assets/club-penguin/blue-puffle-walk.swf');
  const animation = fromRoot('assets/club-penguin/blue-puffle-idle.webp');
  assert.equal(room.subarray(0, 3).toString('ascii'), 'CWS');
  assert.equal(puffle.subarray(0, 3).toString('ascii'), 'CWS');
  assert.equal(walk.subarray(0, 3).toString('ascii'), 'CWS');
  assert.ok(room.byteLength > 80000);
  assert.equal(animation.subarray(0, 4).toString('ascii'), 'RIFF');
  assert.equal(animation.subarray(8, 12).toString('ascii'), 'WEBP');
  assert.ok(animation.includes(Buffer.from('ANIM')));
});

test('Club Penguin.exe opens as resizable XP app with dedicated full-tab player', () => {
  assert.match(html, /data-window="club-penguin"/);
  assert.match(html, /data-open-window="club-penguin"/);
  assert.match(html, /data-src="\.\/club-penguin\.html\?embedded=1"/);
  assert.match(html, /href="\.\/club-penguin\.html" target="_blank"/);
  assert.match(html, /data-window="club-penguin" aria-label="Restore Club Penguin"/);
  assert.match(manager, /'club-penguin': \[875, 655\]/);
  assert.match(player, /99,999,999,999/);
  assert.match(player, /blue-puffle-idle\.webp/);
  assert.match(player, /ruffle\/ruffle\.js/);
  assert.match(script, /RufflePlayer\?\.newest/);
  assert.match(script, /player\.ruffle\(\)\.load/);
  assert.match(script, /assets\/club-penguin\/coffee\.swf/);
  assert.match(script, /requestFullscreen/);
});

test('Ruffle is bundled at build time, with no account/server implementation', () => {
  assert.match(workflow, /npm pack --silent @ruffle-rs\/ruffle@0\.7\.1/);
  assert.match(workflow, /tar -xzf .*ruffle-rs-ruffle-0\.7\.1\.tgz/);
  assert.doesNotMatch(script, /fetch\(|XMLHttpRequest|WebSocket|login|signup|register/i);
});
