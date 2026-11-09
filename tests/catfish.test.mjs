import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import vm from 'node:vm';

const script = readFileSync(new URL('../js/aquarium-background.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('the alternate atlas is a real, lightweight transparent WebP with all nine fish', () => {
  const bytes = readFileSync(new URL('../assets/catfish-atlas.webp', import.meta.url));
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
  assert.ok(statSync(new URL('../assets/catfish-atlas.webp', import.meta.url)).size < 1_000_000);
  assert.match(html, /js\/aquarium-background\.js\?v=20261108-catfish/);
  assert.match(html, /js\/release-cats\.js\?v=20261108-catfish/);
});

test('catfish replace the same swimming sprites and KITTY JAIL restores them, even with reduced motion', () => {
  const painted = [];
  const handlers = new Map();
  const context = {
    setTransform() {}, clearRect() { painted.length = 0; }, save() {}, restore() {},
    translate() {}, scale() {}, beginPath() {}, arc() {}, stroke() {},
    drawImage(image) { painted.push(image.src); },
  };
  const canvas = { clientWidth: 1000, clientHeight: 650, getContext: () => context };
  class Image {
    naturalWidth = 1536;
    naturalHeight = 1024;
    src = '';
  }
  const document = {
    getElementById: id => id === 'site-aquarium-canvas' ? canvas : null,
    addEventListener: (name, handler) => handlers.set(name, handler),
  };
  const window = {
    devicePixelRatio: 1,
    matchMedia: () => ({ matches: true }),
    addEventListener() {},
  };
  vm.runInNewContext(script, { document, window, Image, performance: { now: () => 0 } });
  assert.ok(painted.includes('assets/fish-atlas-clean.webp'));
  assert.ok(!painted.includes('assets/catfish-atlas.webp'));

  handlers.get('xp:cats-state')({ detail: { released: true } });
  assert.ok(painted.includes('assets/catfish-atlas.webp'));
  assert.ok(!painted.includes('assets/fish-atlas-clean.webp'));

  handlers.get('xp:cats-state')({ detail: { released: false } });
  assert.ok(painted.includes('assets/fish-atlas-clean.webp'));
  assert.ok(!painted.includes('assets/catfish-atlas.webp'));
});
