import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const html = readFileSync(new URL('index.html', root), 'utf8');
const css = readFileSync(new URL('css/style.css', root), 'utf8');

test('every title color change keeps neighboring letters different', () => {
  const title = html.match(/<h1 class="desktop-site-title"[\s\S]*?<\/h1>/)?.[0];
  assert.ok(title, 'Site title not found');
  const letters = [...title.matchAll(/class="rainbow-text(Red|Blue|Yellow|Green)"/g)].map(match => match[1]);
  assert.equal(letters.length, 'JordanHardee.com'.length);

  const palette = ['Red', 'Blue', 'Yellow', 'Green'];
  const phases = [0, 25, 50, 75, 100];
  const frames = new Map();
  for (const color of palette) {
    assert.match(css, new RegExp(`-webkit-animation:colorchange${color} 12s\\s*infinite alternate`));
    const start = css.indexOf(`@-webkit-keyframes colorchange${color} {`);
    assert.ok(start >= 0, `No animation for ${color}`);
    const end = css.indexOf('\n    }', start);
    assert.ok(end > start);
    const keyframes = [...css.slice(start, end).matchAll(/(25|50|75|100)%\s*\{\s*color:\s*(red|blue|yellow|green);/g)];
    assert.equal(keyframes.length, 4, `${color} must define every color phase`);
    frames.set(color, new Map([[0, color.toLowerCase()], ...keyframes.map(match => [Number(match[1]), match[2]])]));
  }

  for (const phase of phases) {
    assert.equal(new Set(palette.map(color => frames.get(color).get(phase))).size, 4,
      `The ${phase}% palette must be a one-to-one color mapping`);
    const displayedColors = letters.map(color => frames.get(color).get(phase));
    for (let i = 1; i < displayedColors.length; i++) {
      assert.notEqual(displayedColors[i], displayedColors[i - 1],
        `Letters ${i} and ${i + 1} match at ${phase}%`);
    }
  }

  assert.doesNotMatch(css, /\.desktop-site-title span:nth-child/,
    'Individual letter delays would desynchronize the palette');
  assert.match(css, /\.rainbow-textRed, \.rainbow-textBlue, \.rainbow-textYellow, \.rainbow-textGreen\s*\{[^}]*steps\(1, end\)/s,
    'Step timing ensures intermediate colors cannot overlap');
});
