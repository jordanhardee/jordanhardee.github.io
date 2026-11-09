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
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{\s*\.aquarium-water-sheen/s);
  assert.match(css, /\.aquarium-leak-drop\s*\{\s*display:\s*none/s);
});

test('glass has branching hairline cracks rather than one duplicated starburst', () => {
  assert.match(html, /id="aquarium-glass-primary"/);
  assert.match(html, /id="aquarium-glass-branches"/);
  assert.match(html, /class="aquarium-fracture-shadow"/);
  assert.match(html, /class="aquarium-fracture-light"/);
});

test('water is translucent with multiple continuous rivulets and moving droplets', () => {
  assert.match(html, /class="aquarium-wet-film"/);
  assert.match(html, /class="aquarium-water-rivulet aquarium-water-main"/);
  assert.match(html, /class="aquarium-water-rivulet aquarium-water-fork"/);
  assert.match(html, /class="aquarium-water-rivulet aquarium-water-thread"/);
  assert.equal((html.match(/<animateMotion\b/g) || []).length, 3);
  assert.doesNotMatch(css, /\.aquarium-water-main\s*\{[^}]*stroke-dasharray/s);
});
