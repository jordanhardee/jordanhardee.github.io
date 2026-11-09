import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');

test('the construction sign and nail damage belong to the aquarium background', () => {
  const aquariumStart = html.indexOf('<div class="site-aquarium-background"');
  const sign = html.indexOf('class="aquarium-construction-sign"');
  const aquariumEnd = html.indexOf('<div class="ios-retro-icons nostalgia-layer"');
  assert.ok(aquariumStart >= 0 && sign > aquariumStart && sign < aquariumEnd);
  assert.match(html, /class="aquarium-construction-cracks"/);
  assert.match(html, /class="aquarium-construction-leak"/);
  assert.match(html, /assets\/under-construction-sign\.png/);
  assert.ok(statSync(new URL('../assets/under-construction-sign.png', import.meta.url)).size > 100_000);
});

test('the decoration is noninteractive, responsive, and respects reduced motion', () => {
  assert.match(css, /\.aquarium-construction\s*\{[^}]*pointer-events:\s*none/s);
  assert.match(css, /@media\s*\(max-width:\s*600px\)\s*\{\s*\.aquarium-construction/s);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{\s*\.aquarium-water-current\s*\{\s*animation:\s*none/s);
});

test('glass has branching hairline cracks rather than one duplicated starburst', () => {
  assert.match(html, /id="aquarium-glass-primary"/);
  assert.match(html, /id="aquarium-glass-branches"/);
  assert.match(html, /class="aquarium-fracture-shadow"/);
  assert.match(html, /class="aquarium-fracture-light"/);
});

test('water is one contiguous stream that flows behind the taskbar to the viewport bottom', () => {
  assert.equal((html.match(/class="aquarium-water-stream"/g) || []).length, 1);
  assert.match(html, /class="aquarium-water-stream"[^>]*d="[^"]*790/);
  assert.match(html, /class="aquarium-water-current"/);
  assert.doesNotMatch(html, /aquarium-water-rivulet|<animateMotion\b/);
  assert.match(css, /\.aquarium-construction-leak\s*\{[^}]*overflow:\s*visible/s);
  assert.match(css, /\.xp-taskbar\s*\{[^}]*z-index:\s*10000/s);
});
