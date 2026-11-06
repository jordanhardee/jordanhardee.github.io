import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const manager = readFileSync(new URL('../js/module-fullscreen.js', import.meta.url), 'utf8');
const menu = readFileSync(new URL('../js/start-menu.js', import.meta.url), 'utf8');

function makeHarness() {
  const events = new Map();
  const emitted = [];
  let document;
  function node(id, initialClasses = []) {
    const classes = new Set(initialClasses);
    const handlers = new Map();
    return {
      id, dataset: {}, hidden: false, disabled: false, checked: false,
      classList: {
        contains: name => classes.has(name),
        add: (...names) => names.forEach(name => classes.add(name)),
        remove: (...names) => names.forEach(name => classes.delete(name)),
        toggle(name, force) {
          const add = force ?? !classes.has(name);
          if (add) classes.add(name); else classes.delete(name);
          return add;
        },
      },
      addEventListener(type, handler) { handlers.set(type, handler); },
      trigger(type, extra = {}) { handlers.get(type)?.({ target: this, ...extra }); },
      setAttribute() {},
      querySelector() { return null; },
      focus() { document.activeElement = this; },
    };
  }
  const blackjack = node('blackjack', ['module-closed']);
  blackjack.dataset.window = 'blackjack';
  const slots = node('slots', ['module-closed']);
  slots.dataset.window = 'brainrot-slots';
  const solitaire = node('solitaire', ['module-closed']);
  solitaire.dataset.window = 'solitaire';
  const panels = [blackjack, slots, solitaire];
  const tasks = panels.map(panel => {
    const task = node(`${panel.id}-task`);
    task.dataset.window = panel.dataset.window;
    return task;
  });
  const gate = node('casino-gate');
  gate.hidden = true;
  const checkbox = node('casino-gate-checkbox');
  const enter = node('casino-gate-enter');
  enter.disabled = true;
  const cancel = node('casino-gate-cancel');
  const gameName = node('casino-gate-game');
  const nodes = new Map([gate, checkbox, enter, cancel, gameName].map(item => [item.id, item]));
  document = {
    activeElement: node('original-focus'),
    body: node('body'),
    fullscreenElement: null,
    getElementById: id => nodes.get(id) || null,
    querySelectorAll(selector) { return selector === '.xp-task-button' ? tasks : panels; },
    addEventListener(type, handler) {
      events.set(type, [...(events.get(type) || []), handler]);
    },
    dispatchEvent(event) {
      emitted.push(event);
      (events.get(event.type) || []).forEach(handler => handler(event));
    },
  };
  const window = { setInterval() {}, matchMedia: () => ({ matches: false }) };
  class CustomEvent {
    constructor(type, options) { this.type = type; this.detail = options?.detail; }
  }
  vm.runInNewContext(manager, { document, window, CustomEvent, console });
  const request = name => document.dispatchEvent(new CustomEvent('xp:open-window', { detail: { window: name } }));
  const close = name => document.dispatchEvent(new CustomEvent('xp:close-window', { detail: { window: name } }));
  const opened = () => emitted.filter(event => event.type === 'xp:window-opened').map(event => event.detail.window);
  return { blackjack, slots, solitaire, tasks, gate, checkbox, enter, cancel, gameName, request, close, opened };
}

test('casino acknowledgment is explicit and required for each opening, even from the taskbar', () => {
  const h = makeHarness();
  h.request('blackjack');
  assert.equal(h.gate.hidden, false);
  assert.equal(h.gameName.textContent, 'Blackjack');
  assert.equal(h.enter.disabled, true);
  assert.equal(h.blackjack.classList.contains('module-closed'), true);
  assert.deepEqual(h.opened(), []);

  h.enter.trigger('click'); // Programmatic click without checking must fail too.
  assert.deepEqual(h.opened(), []);
  h.checkbox.checked = true;
  h.checkbox.trigger('change');
  assert.equal(h.enter.disabled, false);
  h.enter.trigger('click');
  assert.deepEqual(h.opened(), ['blackjack']);
  assert.equal(h.gate.hidden, true);
  assert.equal(h.checkbox.checked, false);

  h.tasks[0].trigger('click'); // Open Blackjack minimizes without a second gate.
  assert.equal(h.blackjack.classList.contains('module-minimized'), true);
  h.tasks[0].trigger('click');
  assert.equal(h.gate.hidden, true);
  h.request('blackjack'); // Already opened is not a new acknowledgment.
  assert.equal(h.gate.hidden, true);
});

test('closing a casino resets acknowledgment; cancel leaves it closed', () => {
  const h = makeHarness();
  h.request('brainrot-slots');
  h.checkbox.checked = true;
  h.checkbox.trigger('change');
  h.enter.trigger('click');
  h.close('brainrot-slots');
  assert.equal(h.slots.classList.contains('module-closed'), true);
  h.request('brainrot-slots');
  assert.equal(h.enter.disabled, true);
  assert.equal(h.checkbox.checked, false);
  h.cancel.trigger('click');
  h.request('blackjack');
  assert.equal(h.gate.hidden, false);
  h.cancel.trigger('click');
  assert.equal(h.blackjack.classList.contains('module-closed'), true);

  // A closed game may also be opened from its taskbar item.
  h.tasks[0].trigger('click');
  assert.equal(h.gate.hidden, false);
  assert.equal(h.checkbox.checked, false);
  assert.equal(h.enter.disabled, true);
  h.cancel.trigger('click');
  assert.deepEqual(h.opened(), ['brainrot-slots']);
});

test('non-casino games do not receive an acknowledgment', () => {
  const h = makeHarness();
  h.request('solitaire');
  assert.deepEqual(h.opened(), ['solitaire']);
  assert.equal(h.gate.hidden, true);
});

test('casino UI is present and lazy game imports happen only after opening', () => {
  assert.match(html, /id="casino-gate-checkbox" type="checkbox" required/);
  assert.match(html, /never had, a gambling problem/);
  assert.match(html, /id="casino-gate-enter" disabled/);
  assert.match(manager, /const casinoApps = new Set\(\['blackjack', 'brainrot-slots'\]\)/);
  assert.match(menu, /document\.addEventListener\('xp:window-opened'/);
});
