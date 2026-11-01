import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const startMenu = readFileSync(new URL('../js/start-menu.js', import.meta.url), 'utf8');
const guestbook = readFileSync(new URL('../js/guestbook.mjs', import.meta.url), 'utf8');

test('Guestbook.exe is a normal XP window in the Start menu and taskbar', () => {
  assert.match(html, /data-window="guestbook" aria-labelledby="guestbook-heading"/);
  assert.match(html, /Leave a note\? \(Sorry requires a GitHub account\)/);
  assert.match(html, /data-open-window="guestbook"/);
  assert.match(html, /class="xp-task-button module-task-hidden"[^>]*data-window="guestbook"/);
  assert.match(startMenu, /guestbook: new URL\('\.\/guestbook\.mjs/);
  assert.doesNotMatch(html, /<script[^>]*src="https:\/\/giscus\.app\/client\.js"/);
});

test('CAPTCHA gates the giscus embed and retrieves the actual repository category', async () => {
  const handlers = new Map();
  const element = id => ({
    hidden: false,
    value: '',
    textContent: '',
    dataset: {},
    children: [],
    addEventListener(event, handler) { handlers.set(`${id}:${event}`, handler); },
    appendChild(child) { this.children.push(child); },
    replaceChildren() { this.children.length = 0; },
    querySelector() { return null; },
  });
  const ids = [
    'guestbook-captcha-gate', 'guestbook-captcha-image', 'guestbook-captcha-math',
    'guestbook-captcha-answer', 'guestbook-captcha-feedback', 'guestbook-captcha-submit',
    'guestbook-captcha-refresh', 'guestbook-captcha-alternate', 'guestbook-unlocked',
    'guestbook-status', 'guestbook-discussions', 'guestbook-fallback',
  ];
  const nodes = Object.fromEntries(ids.map(id => [id, element(id)]));
  const context = {
    createLinearGradient() { return { addColorStop() {} }; },
    fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
    save() {}, restore() {}, translate() {}, rotate() {}, fillText() {}, bezierCurveTo() {},
  };
  nodes['guestbook-captcha-image'].width = 340;
  nodes['guestbook-captcha-image'].height = 112;
  nodes['guestbook-captcha-image'].getContext = () => context;
  const panel = element('panel');
  const document = {
    querySelector(selector) { return selector === '[data-window="guestbook"]' ? panel : null; },
    getElementById(id) { return nodes[id] || null; },
    createElement(tag) { return { tag, dataset: {}, addEventListener() {}, remove() {} }; },
    addEventListener(event, handler) { handlers.set(`document:${event}`, handler); },
  };
  let fetchCount = 0;
  const fetch = async url => {
    fetchCount += 1;
    assert.match(url, /giscus\.app\/api\/discussions\/categories\?repo=/);
    return { ok: true, json: async () => ({
      repositoryId: 'MDEwOlJlcG9zaXRvcnkzMDg2ODQ2ODk=',
      categories: [{ id: 'DIC_general', name: 'General' }],
    }) };
  };
  // Fixed entropy makes the initial five-character image challenge "22222".
  const crypto = { getRandomValues(array) { array[0] = 0; return array; } };
  vm.runInNewContext(guestbook, { document, fetch, crypto, console, Uint32Array });

  nodes['guestbook-captcha-answer'].value = 'wrong';
  handlers.get('guestbook-captcha-submit:click')();
  assert.equal(fetchCount, 0, 'bad answers must not contact giscus');
  assert.match(nodes['guestbook-captcha-feedback'].textContent, /Incorrect/);

  nodes['guestbook-captcha-answer'].value = '22222';
  handlers.get('guestbook-captcha-submit:click')();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(fetchCount, 1);
  assert.equal(nodes['guestbook-captcha-gate'].hidden, true);
  assert.equal(nodes['guestbook-unlocked'].hidden, false);
  const script = panel.children[0];
  assert.equal(script.src, 'https://giscus.app/client.js');
  assert.equal(script.dataset.categoryId, 'DIC_general');
  assert.equal(script.dataset.term, 'JordanHardee.com Guestbook');

  handlers.get('document:xp:closed')({ detail: { window: 'guestbook' } });
  assert.equal(nodes['guestbook-captcha-gate'].hidden, false);
  assert.equal(nodes['guestbook-unlocked'].hidden, true);
});
