import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const fromRoot = path => readFileSync(new URL(`../${path}`, import.meta.url));
const html = fromRoot('index.html').toString('utf8');
const css = fromRoot('css/style.css').toString('utf8');
const script = fromRoot('js/cursor-mania.js').toString('utf8');

test('original MyWebSearch toolbar launches a complete category and grid interface', () => {
  assert.match(html, /class="ie-nostalgia-toolbar-art"[\s\S]*?id="ie-cursor-mania"[^>]*aria-label="Cursor Mania — choose a cursor"/);
  assert.match(css, /\.ie-cursor-mania-hotspot\s*\{[^}]*left:69\.25%;[^}]*width:11\.5%/);
  assert.match(html, /id="cursor-mania-tree"/);
  assert.match(html, /id="cursor-mania-grid"/);
  assert.match(html, /data-window="cursor-mania" aria-label="Restore Cursor Mania"/);
  assert.doesNotMatch(html, /id="ie-smiley-central"|id="ie-screensavers"/);
  assert.match(css, /html\.cursorphreak-active body \*\s*\{[^}]*cursor: var\(--cursorphreak-cursor\) !important;/);
  assert.match(css, /\.cursor-mania-browser\s*\{[^}]*grid-template-columns:/);
});

test('original art and the 11,145-item pinned CursorPhreak binary catalog are used', () => {
  const logo = fromRoot('assets/cursors/logo.png');
  assert.equal(logo.subarray(1, 4).toString(), 'PNG');
  assert.equal(logo.readUInt32BE(16), 264);
  assert.equal(logo.readUInt32BE(20), 21);
  assert.match(script, /11145/);
  assert.match(script, /c04b94cfeed1f12d6aa580ce7e8c669e4d671c02/);
  assert.match(script, /previews\.pak/);
  assert.match(script, /frames\.pak/);
  assert.match(script, /headers:\s*\{\s*Range:/);
  assert.match(script, /IntersectionObserver/);
  assert.match(script, /new DecompressionStream\('deflate'\)/);
  assert.doesNotMatch(script, /localStorage|sessionStorage|document\.cookie/);
  assert.match(fromRoot('assets/cursors/LICENSE').toString('utf8'), /GNU GENERAL PUBLIC LICENSE/);
});

test('open, browse, select, favorite, browse What\'s New and reset without persistent state', async () => {
  class Element {
    constructor() {
      this.children = []; this.listeners = {}; this.attributes = {};
      this.dataset = {}; this.className = ''; this.value = ''; this.hidden = false;
      this.classes = new Set(); this.isConnected = true;
      this.classList = {
        add: name => this.classes.add(name), remove: name => this.classes.delete(name),
        toggle: (name, yes) => yes ? this.classes.add(name) : this.classes.delete(name),
      };
    }
    addEventListener(name, listener) { this.listeners[name] = listener; }
    appendChild(child) { this.children.push(...(child instanceof Fragment ? child.children : [child])); return child; }
    replaceChildren(...children) { this.children = children; }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    getAttribute(name) { return this.attributes[name]; }
    removeAttribute(name) { delete this.attributes[name]; }
    get firstElementChild() { return this.children[0]; }
    querySelectorAll(selector) {
      const result = [];
      const visit = item => {
        if (selector === '.cursor-mania-choice' && item.className === 'cursor-mania-choice'
          || selector === '.cursor-mania-tree-expander' && item.className === 'cursor-mania-tree-expander') result.push(item);
        item.children.forEach(visit);
      };
      this.children.forEach(visit);
      return result;
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
    getContext() { return { drawImage() {} }; }
    toDataURL() { return 'data:image/png;base64,dGVzdA=='; }
  }
  class Fragment { constructor() { this.children = []; } appendChild(child) { this.children.push(child); } }
  class Image { async decode() {} }
  class IntersectionObserver { observe() {} unobserve() {} disconnect() {} }
  class CustomEvent { constructor(type, options) { this.type = type; this.detail = options.detail; } }

  const ids = ['ie-cursor-mania', 'cursor-mania-tree', 'cursor-mania-grid', 'cursor-mania-count',
    'cursor-mania-status', 'cursor-mania-current-preview', 'cursor-mania-code', 'cursor-mania-favorite',
    'cursor-mania-copy', 'cursor-mania-reset', 'cursor-mania-new', 'cursor-mania-share',
    'cursor-mania-help', 'cursor-mania-help-button', 'cursor-mania-help-close'];
  const elements = Object.fromEntries(ids.map(id => [id, new Element()]));
  const classes = new Set(); const styles = new Map(); const events = []; const requests = [];
  const catalog = {
    size: 32,
    c: Object.fromEntries(Array.from({ length: 11145 }, (_, i) => [`cursor-${i}`, [0, 8, 0, 0, 8, 1, 2, 3, [100]]])),
    cats: [
      { n: 'Most Popular', k: 'most-popular', i: ['cursor-0', 'cursor-1'], c: [
        { n: 'New & Featured', k: 'most-popular-new-featured', i: ['cursor-2'], c: [] },
      ] },
      { n: 'Animals', k: 'animals', i: ['cursor-3'], c: [] },
    ],
  };
  let serial = 0;
  const document = {
    documentElement: {
      classList: { add: name => classes.add(name), remove: name => classes.delete(name) },
      style: { setProperty: (name, value) => styles.set(name, value), removeProperty: name => styles.delete(name) },
    },
    createElement: () => new Element(), createDocumentFragment: () => new Fragment(),
    getElementById: id => elements[id], dispatchEvent: event => events.push(event),
  };
  const fetch = async (url, options) => {
    requests.push({ url, options });
    if (url.endsWith('/catalog.json')) return { ok: true, json: async () => catalog };
    assert.match(options.headers.Range, /^bytes=\d+-\d+$/);
    return { status: 206, arrayBuffer: async () => new Uint8Array(8).buffer };
  };
  const URL = { createObjectURL: () => `blob:preview-${++serial}`, revokeObjectURL() {} };
  const window = { location: { href: 'https://jordanhardee.com/' }, addEventListener() {} };
  vm.runInNewContext(script, { document, window, fetch, URL, Blob, Image, IntersectionObserver, CustomEvent, navigator: {} });
  const waitFor = async predicate => {
    for (let i = 0; i < 20; i++) {
      if (predicate()) return;
      await new Promise(resolve => setImmediate(resolve));
    }
    assert.fail('Cursor action did not settle.');
  };

  elements['ie-cursor-mania'].listeners.click();
  const grid = elements['cursor-mania-grid'];
  await waitFor(() => grid.children.length === 2);
  assert.equal(events[0].type, 'xp:open-window');
  assert.equal(events[0].detail.window, 'cursor-mania');
  assert.match(elements['cursor-mania-count'].textContent, /11,145 cursors/);
  assert.equal(elements['cursor-mania-tree'].children.length, 3);

  const animals = elements['cursor-mania-tree'].children[2];
  animals.firstElementChild.children[1].listeners.click();
  assert.equal(grid.children[0].dataset.cursorId, 'cursor-3');
  const chosen = grid.children[0];
  grid.listeners.click({ target: { closest: () => chosen } });
  await waitFor(() => classes.has('cursorphreak-active'));
  assert.match(styles.get('--cursorphreak-cursor'), /url\("data:image\/png;base64,dGVzdA=="\) 2 3, auto/);
  assert.equal(chosen.getAttribute('aria-selected'), 'true');
  assert.match(elements['cursor-mania-status'].textContent, /cursor-3 selected/);
  assert.match(elements['cursor-mania-code'].value, /html body \*/);
  assert.equal(requests.find(request => request.url.endsWith('previews.pak')).options.headers.Range, 'bytes=0-7');

  elements['cursor-mania-favorite'].listeners.click();
  assert.equal(elements['cursor-mania-favorite'].getAttribute('aria-pressed'), 'true');
  assert.equal(chosen.classes.has('is-favorite'), true);
  elements['cursor-mania-tree'].children[0].children[1].listeners.click();
  assert.equal(grid.children[0].dataset.cursorId, 'cursor-3');
  elements['cursor-mania-new'].listeners.click();
  assert.equal(grid.children[0].dataset.cursorId, 'cursor-2');

  elements['cursor-mania-reset'].listeners.click();
  assert.equal(classes.has('cursorphreak-active'), false);
  assert.equal(styles.has('--cursorphreak-cursor'), false);
  assert.equal(elements['cursor-mania-code'].value, '');
});
