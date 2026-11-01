import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = new URL('../', import.meta.url).pathname;
const markup = readFileSync(join(root, 'index.html'), 'utf8');
const stylesheet = readFileSync(join(root, 'css/style.css'), 'utf8');

test('all 30 requested app icons and both Puffles have local, valid image files', () => {
  const requested = [...markup.matchAll(/src="(assets\/nostalgia\/[^"]+)"/g)].map(match => match[1]);
  assert.equal(requested.length, 32);
  assert.equal(new Set(requested).size, 32);
  for (const relativePath of requested) {
    assert.ok(existsSync(join(root, relativePath)), `${relativePath} is missing`);
    const bytes = readFileSync(join(root, relativePath));
    assert.ok(bytes.length > 100, `${relativePath} is empty`);
    assert.equal(bytes.toString('hex', 0, 4), '89504e47', `${relativePath} is not a PNG`);
  }
});

test('Floppa remains the first XP desktop shortcut, followed by the archive', () => {
  const floppa = markup.indexOf('id="floppa-exe-shortcut"');
  const icons = markup.indexOf('class="desktop-icon-museum"');
  assert.ok(floppa > 0 && icons > floppa);
  assert.ok(markup.includes('class="club-penguin-dancers"'));
});

test('the aquarium fish layer is above the classic iOS screen', () => {
  assert.match(stylesheet, /\.ios-retro-screen\s*\{[^}]*z-index:\s*1\s*;/s);
  assert.match(stylesheet, /#site-aquarium-canvas\s*\{[^}]*z-index:\s*2\s*;/s);
  assert.ok(markup.indexOf('class="ios-retro-screen"') < markup.indexOf('id="site-aquarium-canvas"'));
});
