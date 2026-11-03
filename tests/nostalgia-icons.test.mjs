import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = new URL('../', import.meta.url).pathname;
const markup = readFileSync(join(root, 'index.html'), 'utf8');
const stylesheet = readFileSync(join(root, 'css/style.css'), 'utf8');
const startMenu = readFileSync(join(root, 'js/start-menu.js'), 'utf8');

test('all vintage app icons, Floppa, and the orange penguin use local PNG artwork', () => {
  const requested = [...markup.matchAll(/src="(assets\/nostalgia\/[^"]+)"/g)].map(match => match[1].split('?')[0]);
  // The Club Penguin app reuses the original orange-penguin image in its
  // title bar, Start menu, and taskbar without introducing a new imitation.
  assert.equal(requested.length, 35);
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
  const xpGrid = markup.indexOf('class="nostalgia-icon-grid"');
  const limewire = markup.indexOf('src="assets/nostalgia/xp/limewire.png"');
  assert.ok(xpGrid > 0 && floppa > xpGrid && floppa < limewire);
  assert.ok(markup.includes('club-penguin/orange-penguin.png'));
  assert.ok(!markup.includes('puffle-clean.png'));
  assert.ok(!markup.includes('<h2>Windows XP</h2>'));
  assert.ok(!markup.includes('<h2>Mac OS X</h2>'));
});

test('iOS icons remain free-floating but are clickable above decorative aquarium', () => {
  assert.match(stylesheet, /\.ios-retro-icons\s*\{[^}]*z-index:\s*20\s*;/s);
  assert.match(stylesheet, /#site-aquarium-canvas\s*\{[^}]*z-index:\s*2\s*;/s);
  assert.ok(markup.indexOf('class="ios-retro-icons nostalgia-layer"') > markup.indexOf('id="site-aquarium-canvas"'));
  assert.match(markup, /id="openssh-shortcut"[^>]*data-launch="kali-terminal"/);
  assert.ok(!markup.includes('ios-retro-screen'));
  assert.ok(!markup.includes('ios-retro-status'));
});

test('nostalgia icons default to hidden and have a persistent Start menu switch', () => {
  assert.match(stylesheet, /\.nostalgia-layer\s*\{\s*display:\s*none\s*!important;/);
  assert.match(markup, /id="xp-nostalgia-toggle"[^>]*role="switch"[^>]*aria-checked="false"/);
  assert.match(startMenu, /localStorage\.getItem\(nostalgiaPreference\) === 'on'/);
  assert.match(startMenu, /setNostalgiaMode\(nostalgiaEnabled\)/);
  assert.match(startMenu, /localStorage\.setItem\(nostalgiaPreference/);
  assert.match(stylesheet, /html, body\s*\{\s*height:\s*100%;\s*overflow:\s*hidden;/);
});
