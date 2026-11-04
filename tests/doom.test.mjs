import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const load = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const site = load('index.html');
const player = load('doom.html');
const workflow = load('.github/workflows/static.yml');
const music = load('js/music.js');

test('DOOM shareware is a lazy-loaded XP game and a standalone tab', () => {
  assert.match(site, /id="xp-folder-games"[\s\S]*data-open-window="doom"/);
  assert.match(site, /data-window="doom" aria-labelledby="doom-heading"/);
  assert.match(site, /data-src="\.\/doom\.html\?embedded=1&amp;v=20261104-touch-fix"/);
  assert.match(site, /href="\.\/doom\.html\?fullscreen=1&amp;v=20261104-touch-fix" target="_blank"/);
  assert.match(site, /data-window="doom" aria-label="Restore DOOM"/);
  assert.match(load('js/window-manager.js'), /doom: \[925, 720\]/);
  assert.match(load('js/module-fullscreen.js'), /doom: 'DOOM'/);
});

test('engine is original shareware and self-hosted, with MIDI bypass', () => {
  assert.match(player, /Episode 1/);
  assert.match(player, /PRELOAD = \['doom1\.wad', 'default\.cfg'\]/);
  assert.match(player, /'assets\/doom\/' \+ f/);
  assert.match(player, /'-nomusic'/);
  assert.match(player, /'-iwad', 'doom1\.wad'/);
  assert.match(player, /assets\/doom\/websockets-doom\.js/);
  assert.match(workflow, /DOOM_ENGINE_REV=e0ba810/);
  assert.match(workflow, /DOOM_SHAREWARE_REV=dd321b5/);
  assert.match(workflow, /sha256sum --check --status/);
  assert.match(music, /event\.detail\?\.window !== 'doom'/);
});

test('on-screen controls send one keyboard event to window, not duplicate targets', () => {
  assert.match(player, /window\.dispatchEvent\(ev\)/);
  assert.doesNotMatch(player, /document\.dispatchEvent\(ev\)|canvas\.dispatchEvent\(ev\)/);
  assert.match(player, /addEventListener\('pointerdown', press\)/);
  assert.match(player, /addEventListener\('pointerup', release\)/);
  assert.match(player, /addEventListener\('pointercancel', release\)/);
  assert.doesNotMatch(player, /addEventListener\('touchstart'|addEventListener\('mousedown'/);
  assert.match(player, /data-key="Control"\s+type="button">FIRE/);
  assert.match(player, /data-key="Escape" type="button">MENU/);
});

test('DOOM save files remain in this browser', () => {
  assert.match(player, /localStorage\.setItem\(saveKey, serialized\)/);
  assert.match(player, /restoreSaves\(\)/);
  assert.match(player, /setInterval\(persistSaves, 2000\)/);
});
