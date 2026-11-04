import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url));
const html = read('index.html').toString();
const css = read('css/style.css').toString();
const script = read('js/cursor-phreak.js').toString();

test('MyWebSearch retains its art and displays the era-accurate Cursor Mania label', () => {
  assert.match(html, /class="ie-nostalgia-toolbar-art"[\s\S]*?id="ie-cursor-phreak"[^>]*aria-label="Cursor Mania — choose a cursor"/);
  assert.match(css, /\.ie-cursor-phreak-hotspot\s*\{[^}]*left:69\.25%;[^}]*width:11\.5%/);
  assert.match(html, /class="ie-cursor-phreak-label"[^>]*>Cursor Mania<\/span>/);
  assert.match(html, /id="ie-cursor-phreak-preview"[^>]*src="assets\/cursors\/arrow-2.png"/);
  assert.match(css, /\.ie-nostalgia-toolbar-art\s*\{[^}]*width:801px/);
  assert.match(css, /\.ie-nostalgia-toolbar-art > img\s*\{[^}]*width:801px;[^}]*image-rendering:pixelated/);
  assert.match(html, /assets\/cursors\/logo\.png"[^>]*alt="CursorPhreak"/);
  assert.doesNotMatch(html, /id="ie-smiley-central"|id="ie-screensavers"/);
  assert.match(html, /data-window="cursor-phreak"/);
  assert.match(css, /html\.cursorphreak-active body \*\s*\{[^}]*cursor: var\(--cursorphreak-cursor\) !important;/);
});

test('CursorPhreak has original category browsing and both copy-as-code choices', () => {
  for (const id of [
    'cursor-phreak-tree', 'cursor-phreak-grid', 'cursor-phreak-current-img',
    'cursor-phreak-code', 'cursor-phreak-css', 'cursor-phreak-js',
    'cursor-phreak-favorite', 'cursor-phreak-reset', 'cursor-phreak-help',
    'cursor-phreak-friend', 'cursor-phreak-new',
  ]) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(css, /\.cm-panels\s*\{[^}]*grid-template-columns/);
  assert.match(css, /\.cm-grid\s*\{[^}]*grid-template-columns:repeat\(auto-fill/);
  assert.match(script, /function makeSnippets\(cursor\)/);
  assert.match(script, /DecompressionStream\('deflate'\)/);
  assert.match(script, /function stopAnimation\(\)/);
  assert.match(script, /function resetCursor\(\)/);
  assert.match(script, /navigator\.clipboard\?\.writeText/);
  assert.match(script, /function legacyCopy\(text\)/);
  assert.match(script, /field\.focus\(\{ preventScroll: true \}\)/);
  assert.match(script, /field\.setSelectionRange\(0, text\.length\)/);
  assert.match(script, /if \(legacyCopy\(text\)\) return true;/);
  assert.match(script, /const id = selectedId, text = snippets\[next\]/);
  assert.match(script, /pendingId !== null/);
  assert.match(script, /toolbarPreview\.src = url/);
  assert.match(script, /'cursor-phreak-favorites'/);
  assert.doesNotMatch(script, /setItem\(['"](?:selected-cursor|cursor-phreak-active)/);
});

test('all 11,145 cursors are sourced from the exact pinned CursorPhreak archive', () => {
  assert.match(script, /c04b94cfeed1f12d6aa580ce7e8c669e4d671c02/);
  assert.match(script, /raw\.githubusercontent\.com\/jordanhardee\/CursorPhreak/);
  assert.match(script, /Range: `bytes=\$\{start\}-\$\{start \+ length - 1\}`/);
  assert.match(script, /response\.status === 206/);
  assert.match(script, /data\.cats\.length !== 23/);
  assert.match(script, /Object\.keys\(data\.c \|\| \{\}\)\.length !== 11145/);
  assert.match(read('assets/cursors/SOURCE.md').toString(), /pinned upstream archive/);
  assert.match(read('assets/cursors/LICENSE').toString(), /GNU GENERAL PUBLIC LICENSE/);
});

test('copy keeps the user gesture for the Safari fallback and uses Clipboard API when needed', async () => {
  const start = script.indexOf('function legacyCopy(text)');
  const end = script.indexOf('  async function copyFormat(next)', start);
  assert.ok(start > 0 && end > start);
  const calls = [];
  let legacyWorks = true;
  const previousFocus = { isConnected: true, focus() { calls.push('restore-focus'); } };
  const field = {
    style: {},
    focus() { calls.push('focus'); },
    select() { calls.push('select'); },
    setSelectionRange(start, end) { calls.push(`range:${start}-${end}`); },
    remove() { calls.push('remove'); },
  };
  const document = {
    activeElement: previousFocus,
    createElement(tag) { assert.equal(tag, 'textarea'); return field; },
    body: { appendChild() { calls.push('append'); } },
    execCommand(command) { assert.equal(command, 'copy'); calls.push('legacy-copy'); return legacyWorks; },
  };
  const navigator = { clipboard: { async writeText(value) { calls.push(`modern-copy:${value}`); } } };
  const context = { document, navigator };
  vm.runInNewContext(`${script.slice(start, end)}\nthis.testCopy = copy;`, context);

  assert.equal(await context.testCopy('hello'), true);
  assert.deepEqual(calls, ['append', 'focus', 'select', 'range:0-5', 'legacy-copy', 'remove', 'restore-focus']);
  calls.length = 0;
  legacyWorks = false;
  assert.equal(await context.testCopy('hello'), true);
  assert.equal(calls.at(-1), 'modern-copy:hello');
});
