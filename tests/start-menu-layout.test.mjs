import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
const script = readFileSync(new URL('../js/start-menu.js', import.meta.url), 'utf8');

test('Start menu has the classic two columns, header, and footer', () => {
  assert.match(html, /class="xp-menu-user"/);
  assert.match(html, /class="xp-menu-columns"/);
  assert.match(html, /class="xp-menu-main"/);
  assert.match(html, /class="xp-menu-side"/);
  assert.match(html, /class="xp-menu-bottom"/);
  assert.match(html, /id="xp-all-programs-toggle"[^>]*aria-expanded="false"/);
  assert.match(html, /id="xp-nostalgia-toggle"[^>]*role="switch"/);
  assert.match(html, /js\/start-menu\.js\?v=20261101-guestbook/);
  assert.match(css, /\.xp-menu-columns\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:/s);
  assert.match(css, /\.xp-menu-side\s*\{[^}]*background:\s*linear-gradient/s);
});

test('All Programs switches the left pane, preserves the right pane, and resets on reopening', () => {
  const handlers = new Map();
  function node(id, extra = {}) {
    return {
      hidden: false,
      attributes: {},
      addEventListener(type, handler) { handlers.set(`${id}:${type}`, handler); },
      setAttribute(name, value) { this.attributes[name] = value; },
      getAttribute(name) { return this.attributes[name]; },
      contains() { return false; },
      ...extra,
    };
  }
  const start = node('start');
  const menu = node('menu', { hidden: true, querySelectorAll() { return []; } });
  const programs = node('programs', { hidden: true });
  const home = node('home');
  const toggle = node('all', { attributes: { 'aria-expanded': 'false' } });
  const label = node('label', { textContent: 'All Programs' });
  const dismiss = node('dismiss');
  const nodes = {
    'xp-start-button': start,
    'xp-start-menu': menu,
    'xp-program-list': programs,
    'xp-menu-home': home,
    'xp-all-programs-toggle': toggle,
    'xp-all-programs-label': label,
    'xp-menu-dismiss': dismiss,
  };
  const document = {
    currentScript: { src: 'https://example.test/js/start-menu.js' },
    getElementById(id) { return nodes[id] || null; },
    addEventListener() {},
  };
  vm.runInNewContext(script, { document, URL, console, Math });
  handlers.get('start:click')();
  assert.equal(menu.hidden, false);
  assert.equal(home.hidden, false);
  assert.equal(programs.hidden, true);
  handlers.get('all:click')();
  assert.equal(toggle.attributes['aria-expanded'], 'true');
  assert.equal(home.hidden, true);
  assert.equal(programs.hidden, false);
  assert.equal(label.textContent, 'Back');
  handlers.get('dismiss:click')();
  assert.equal(menu.hidden, true);
  handlers.get('start:click')();
  assert.equal(menu.hidden, false);
  assert.equal(home.hidden, false);
  assert.equal(programs.hidden, true);
  assert.equal(label.textContent, 'All Programs');
});
