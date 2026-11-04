import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { clampToFloor, facingForVector, floorBounds, followWithGap, walkToward } from '../js/club-penguin-motion.mjs';

const fromRoot = name => readFileSync(new URL(`../${name}`, import.meta.url));
const html = fromRoot('index.html').toString('utf8');
const player = fromRoot('club-penguin.html').toString('utf8');
const script = fromRoot('js/club-penguin.js').toString('utf8');
const workflow = fromRoot('.github/workflows/static.yml').toString('utf8');
const manager = fromRoot('js/window-manager.js').toString('utf8');

test('original 2010 Coffee Shop and blue puffle assets are actually bundled', () => {
  const room = fromRoot('assets/clubpenguin/coffee.swf');
  const cachedRoomPath = fromRoot('assets/club-penguin/coffee.swf');
  const puffle = fromRoot('assets/club-penguin/blue-puffle.swf');
  const walk = fromRoot('assets/club-penguin/blue-puffle-walk.swf');
  const animation = fromRoot('assets/club-penguin/blue-puffle-idle.webp');
  assert.equal(room.subarray(0, 3).toString('ascii'), 'CWS');
  assert.deepEqual(cachedRoomPath, room);
  assert.equal(puffle.subarray(0, 3).toString('ascii'), 'CWS');
  assert.equal(walk.subarray(0, 3).toString('ascii'), 'CWS');
  assert.ok(room.byteLength > 80000);
  assert.equal(animation.subarray(0, 4).toString('ascii'), 'RIFF');
  assert.equal(animation.subarray(8, 12).toString('ascii'), 'WEBP');
  assert.ok(animation.includes(Buffer.from('ANIM')));
});

test('Club Penguin.exe opens as resizable XP app with dedicated full-tab player', () => {
  assert.match(html, /data-window="club-penguin"/);
  assert.match(html, /data-launch="club-penguin"/);
  assert.match(html, /data-src="\.\/club-penguin\.html\?embedded=1&amp;v=20261104-kali-audio-focus"/);
  assert.match(html, /href="\.\/club-penguin\.html\?fullscreen=1&amp;v=20261104-kali-audio-focus" target="_blank"/);
  assert.match(html, /allow="fullscreen" allowfullscreen/);
  assert.match(html, /data-window="club-penguin" aria-label="Restore Club Penguin"/);
  assert.match(manager, /'club-penguin': \[875, 655\]/);
  assert.match(player, /99,999,999,999/);
  assert.match(player, /blue-puffle-rest\.webp/);
  assert.match(player, /ruffle\/ruffle\.js/);
  assert.match(script, /RufflePlayer\?\.newest/);
  assert.match(script, /player\.ruffle\(\)\.load/);
  assert.match(script, /\/assets\/clubpenguin\/coffee\.swf/);
  assert.match(script, /scale: 'showAll'/);
  assert.match(script, /forceScale: true/);
  assert.match(script, /letterbox: 'on'/);
  assert.match(script, /contextMenu: 'off'/);
  assert.match(player, /club-penguin\.js\?v=20261104-kali-audio-focus/);
  assert.match(script, /cp-full-tab/);
  assert.match(player, /aspect-ratio: 760 \/ 480/);
  assert.match(player, /body\.cp-full-tab \.cp-game-viewport/);
  assert.match(script, /requestFullscreen/);
});

test('Ruffle is bundled at build time, with no account/server implementation', () => {
  assert.match(workflow, /npm pack --silent @ruffle-rs\/ruffle@0\.7\.1/);
  assert.match(workflow, /tar -xzf .*ruffle-rs-ruffle-0\.7\.1\.tgz/);
  assert.match(workflow, /test -s assets\/clubpenguin\/coffee\.swf/);
  assert.doesNotMatch(script, /fetch\(|XMLHttpRequest|WebSocket|login|signup|register/i);
});

test('original playable penguin is present with offline click and keyboard movement', () => {
  assert.match(player, /id="cp-avatar"/);
  assert.match(player, /CLICK \/ TAP TO WADDLE/);
  assert.match(player, /body\.cp-full-tab \.cp-notice \{ display: block/);
  assert.match(player, /club-penguin-avatar\.js\?v=20261104-puffle-follow/);
  assert.match(player, /type="module"/);
  const avatar = fromRoot('js/club-penguin-avatar.js').toString('utf8');
  assert.match(avatar, /club-penguin-motion\.mjs\?v=20261104-follow/);
  assert.match(avatar, /pointerdown/);
  assert.match(avatar, /contextmenu/);
  assert.match(avatar, /keydown/);
  assert.match(avatar, /stepX \* 12/);
  assert.match(avatar, /requestAnimationFrame/);
  assert.doesNotMatch(avatar, /fetch\(|XMLHttpRequest|WebSocket/);
  for (let direction = 1; direction <= 5; direction++) {
    const idle = fromRoot(`assets/clubpenguin/avatar/idle-${direction}.webp`);
    const walk = fromRoot(`assets/clubpenguin/avatar/walk-${direction}.webp`);
    assert.equal(idle.subarray(0, 4).toString('ascii'), 'RIFF');
    assert.equal(walk.subarray(8, 12).toString('ascii'), 'WEBP');
    assert.ok(walk.includes(Buffer.from('ANIM')), `walk-${direction} has genuine animated frames`);
  }
});

test('puffle waits when idle and follows the penguin using genuine slowed frames', () => {
  const rest = fromRoot('assets/club-penguin/blue-puffle-rest.webp');
  const walking = fromRoot('assets/club-penguin/blue-puffle-walk.webp');
  assert.equal(rest.subarray(8, 12).toString('ascii'), 'WEBP');
  assert.equal(walking.subarray(8, 12).toString('ascii'), 'WEBP');
  assert.ok(walking.includes(Buffer.from('ANIM')));
  assert.match(player, /id="cp-puffle"/);
  assert.match(player, /id="cp-puffle-sprite"/);
  assert.match(player, /width: 18%; aspect-ratio: 360 \/ 376/);
  const avatar = fromRoot('js/club-penguin-avatar.js').toString('utf8');
  assert.match(avatar, /followDistance = 78/);
  assert.match(avatar, /moving \? puffleWalk : puffleRest/);
  assert.match(avatar, /drawPuffle\(dt\)/);
});

test('orange nostalgia penguin is a tappable Club Penguin launcher', () => {
  assert.match(html, /class="club-penguin-dancers nostalgia-layer nostalgia-launcher" type="button" data-launch="club-penguin"/);
  const nostalgic = fromRoot('js/nostalgia-apps.js').toString('utf8');
  const style = fromRoot('css/style.css').toString('utf8');
  assert.match(nostalgic, /\.nostalgia-launcher\[data-launch\]/);
  assert.match(style, /\.club-penguin-dancers\.nostalgia-launcher \{/);
  assert.match(style, /pointer-events: auto/);
});

test('avatar moves toward clicks, respects the walkable floor, and faces eight directions', () => {
  assert.deepEqual(clampToFloor(0, 0), { x: 205, y: 260 });
  assert.deepEqual(clampToFloor(900, 900), { x: 728, y: 445 });
  assert.ok(floorBounds(380).left < floorBounds(300).left);
  assert.deepEqual(facingForVector(0, 1), { direction: 1, flip: false });
  assert.deepEqual(facingForVector(-1, 1), { direction: 2, flip: false });
  assert.deepEqual(facingForVector(1, 0), { direction: 3, flip: true });
  assert.deepEqual(facingForVector(-1, -1), { direction: 4, flip: false });
  assert.deepEqual(facingForVector(0, -1), { direction: 5, flip: false });
  const next = walkToward({ x: 300, y: 400 }, { x: 450, y: 400 }, 50);
  assert.ok(Math.abs(next.x - 350) < 0.01);
  assert.equal(next.arrived, false);
  assert.deepEqual(walkToward({ x: 300, y: 400 }, { x: 320, y: 400 }, 50),
    { x: 320, y: 400, arrived: true });
});

test('pet follows smoothly, preserves its trailing gap, and stops animating when caught up', () => {
  assert.deepEqual(followWithGap({ x: 425, y: 400 }, { x: 300, y: 400 }, 20, 78),
    { x: 405, y: 400, moved: true });
  assert.deepEqual(followWithGap({ x: 405, y: 400 }, { x: 300, y: 400 }, 50, 78),
    { x: 378, y: 400, moved: true });
  assert.deepEqual(followWithGap({ x: 378, y: 400 }, { x: 300, y: 400 }, 20, 78),
    { x: 378, y: 400, moved: false });
  assert.deepEqual(followWithGap({ x: 425, y: 400 }, { x: 300, y: 400 }, 0, 78),
    { x: 425, y: 400, moved: false });
});
