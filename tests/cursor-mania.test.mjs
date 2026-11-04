import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const fromRoot = path => readFileSync(new URL(`../${path}`, import.meta.url));
const html = fromRoot('index.html').toString('utf8');
const css = fromRoot('css/style.css').toString('utf8');
const script = fromRoot('js/cursor-mania.js').toString('utf8');

test('only Cursor Mania receives a hotspot over the original MyWebSearch screenshot', () => {
  assert.match(html, /class="ie-nostalgia-toolbar-art"[\s\S]*?id="ie-cursor-mania"[^>]*aria-label="Cursor Mania — choose a cursor"/);
  assert.match(css, /\.ie-cursor-mania-hotspot\s*\{[^}]*left:69\.25%;[^}]*width:11\.5%/);
  assert.match(html, /data-window="cursor-mania"/);
  assert.match(html, /data-window="cursor-mania" aria-label="Restore Cursor Mania"/);
  assert.doesNotMatch(html, /id="ie-smiley-central"|id="ie-screensavers"/);
  assert.match(css, /html\.cursorphreak-active body \*\s*\{[^}]*cursor: var\(--cursorphreak-cursor\) !important;/);
});

test('curated CursorPhreak cursor images are genuine, small 32-pixel PNG assets', () => {
  const ids = [...script.matchAll(/\{ id: '([^']+)', name: '[^']+', x: \d+, y: \d+ \}/g)].map(match => match[1]);
  assert.equal(ids.length, 16);
  assert.equal(new Set(ids).size, 16);
  for (const id of ids) {
    const image = fromRoot(`assets/cursors/${id}.png`);
    assert.equal(image.subarray(1, 4).toString(), 'PNG', `${id}: invalid PNG`);
    assert.equal(image.readUInt32BE(16), 32, `${id}: invalid width`);
    assert.equal(image.readUInt32BE(20), 32, `${id}: invalid height`);
    assert.ok(image.byteLength < 8000, `${id}: oversized cursor`);
  }
  assert.match(fromRoot('assets/cursors/SOURCE.md').toString('utf8'), /CursorPhreak/);
  assert.match(fromRoot('assets/cursors/LICENSE').toString('utf8'), /GNU GENERAL PUBLIC LICENSE/);
});

test('clicking Cursor Mania opens XP picker; choice affects only this document and Reset undoes it', () => {
  function node() {
    return {
      children: [], listeners: {}, attributes: {},
      addEventListener(name, handler) { this.listeners[name] = handler; },
      append(...elements) { this.children.push(...elements); },
      appendChild(child) { this.children.push(child); },
      setAttribute(name, value) { this.attributes[name] = value; },
      getAttribute(name) { return this.attributes[name]; },
    };
  }
  const launcher = node();
  const grid = node();
  const reset = node();
  const status = node();
  const classes = new Set();
  const styles = new Map();
  const dispatched = [];
  const root = {
    classList: {
      add(name) { classes.add(name); },
      remove(name) { classes.delete(name); },
    },
    style: {
      setProperty(name, value) { styles.set(name, value); },
      removeProperty(name) { styles.delete(name); },
    },
  };
  const elements = {
    'ie-cursor-mania': launcher,
    'cursor-mania-grid': grid,
    'cursor-mania-reset': reset,
    'cursor-mania-status': status,
  };
  const document = {
    currentScript: { src: 'https://jordanhardee.com/js/cursor-mania.js' },
    documentElement: root,
    createElement: node,
    getElementById(id) { return elements[id]; },
    dispatchEvent(event) { dispatched.push(event); },
  };
  class CustomEvent { constructor(type, options) { this.type = type; this.detail = options.detail; } }
  vm.runInNewContext(script, { document, CustomEvent, URL, Map });
  assert.equal(grid.children.length, 16);
  assert.equal(classes.has('cursorphreak-active'), false);
  launcher.listeners.click();
  assert.equal(dispatched[0].type, 'xp:open-window');
  assert.equal(dispatched[0].detail.window, 'cursor-mania');

  grid.children[0].listeners.click();
  assert.equal(classes.has('cursorphreak-active'), true);
  assert.match(styles.get('--cursorphreak-cursor'), /assets\/cursors\/arrow-1\.png"\) 1 1, auto/);
  assert.equal(grid.children[0].getAttribute('aria-pressed'), 'true');
  assert.match(status.textContent, /Red Arrow selected/);

  grid.children[4].listeners.click();
  assert.match(styles.get('--cursorphreak-cursor'), /assets\/cursors\/cat-1\.png/);
  assert.equal(grid.children[0].getAttribute('aria-pressed'), 'false');
  assert.equal(grid.children[4].getAttribute('aria-pressed'), 'true');
  reset.listeners.click();
  assert.equal(classes.has('cursorphreak-active'), false);
  assert.equal(styles.has('--cursorphreak-cursor'), false);
  assert.ok(grid.children.every(button => button.getAttribute('aria-pressed') === 'false'));
  assert.doesNotMatch(script, /localStorage|sessionStorage|document\.cookie/);
});
