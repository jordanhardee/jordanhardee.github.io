import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
const terminals = readFileSync(new URL('../js/nostalgia-apps.js', import.meta.url), 'utf8');
const penguin = readFileSync(new URL('../js/club-penguin.js', import.meta.url), 'utf8');
const manager = readFileSync(new URL('../js/window-manager.js', import.meta.url), 'utf8');

test('retro launchers have actual windows, inputs, and taskbar buttons', () => {
  for (const id of ['cmd-terminal', 'kali-terminal', 'club-penguin']) {
    assert.ok(html.includes(`data-window="${id}"`), `${id} window absent`);
    assert.ok(html.includes(`class="xp-task-button module-task-hidden" type="button" data-window="${id}"`), `${id} taskbar missing`);
    assert.ok(manager.includes(`'${id}': [`), `${id} lacks default dimensions`);
  }
  assert.match(html, /id="cmd-shortcut" data-launch="cmd-terminal"/);
  assert.match(html, /id="openssh-shortcut" data-launch="kali-terminal"/);
  assert.match(html, /id="club-penguin-shortcut"/);
  assert.match(css, /\.club-penguin-dancers\s*\{\s*pointer-events:\s*auto;/);
  assert.match(css, /\.terminal-output\s*\{[^}]*overflow-y:\s*auto/);
  assert.match(css, /#penguin-game\s*\{[^}]*touch-action:\s*none/);
});

test('fake CMD and Kali accept commands but safely render input as text', () => {
  const events = new Map();
  const listeners = new Map();
  const dispatched = [];
  class Element {
    constructor(id) { this.id = id; this.children = []; this.value = ''; this.attributes = {}; this.dataset = {}; this.textContent = ''; this.scrollTop = 0; this.scrollHeight = 800; }
    addEventListener(name, fn) { listeners.set(`${this.id}:${name}`, fn); }
    append(node) { this.children.push(node); }
    replaceChildren() { this.children.length = 0; }
    get firstElementChild() { return { remove: () => this.children.shift() }; }
    focus() { /* okay */ }
  }
  const nodes = Object.fromEntries(['cmd-form', 'cmd-input', 'cmd-output', 'cmd-prompt', 'kali-form', 'kali-input', 'kali-output', 'kali-prompt'].map(id => [id, new Element(id)]));
  const launcher = new Element('cmd-shortcut');
  launcher.dataset.launch = 'cmd-terminal';
  const document = {
    querySelectorAll(selector) { return selector.includes('nostalgia-launcher') ? [launcher] : []; },
    getElementById(id) { return nodes[id] || null; },
    createElement(name) { assert.equal(name, 'p'); return new Element('line'); },
    addEventListener(name, fn) { events.set(name, [...(events.get(name) || []), fn]); },
    dispatchEvent(event) { dispatched.push(event.detail.window); },
  };
  const FakeEvent = class { constructor(type, options) { this.type = type; this.detail = options.detail; } };
  vm.runInNewContext(terminals, { document, CustomEvent: FakeEvent, Date, console });
  listeners.get('cmd-shortcut:click')();
  assert.deepEqual(dispatched, ['cmd-terminal']);
  events.get('xp:window-opened').forEach(fn => fn({ detail: { window: 'cmd-terminal' } }));
  assert.ok(nodes['cmd-output'].children.length > 0);
  nodes['cmd-input'].value = '<img src=x onerror=alert(1)>';
  listeners.get('cmd-form:submit')({ preventDefault() {} });
  const text = nodes['cmd-output'].children.map(node => node.textContent).join('\n');
  assert.ok(text.includes('<img src=x onerror=alert(1)>'));
  assert.ok(nodes['cmd-output'].children.every(node => node.innerHTML === undefined));
  events.get('xp:window-opened').forEach(fn => fn({ detail: { window: 'kali-terminal' } }));
  nodes['kali-input'].value = 'nmap example.org';
  listeners.get('kali-form:submit')({ preventDefault() {} });
  assert.ok(nodes['kali-output'].children.some(node => /no network traffic/i.test(node.textContent)));
});

test('penguin minigame uses a local canvas, multiple rooms, movement and collection', () => {
  assert.match(html, /<canvas id="penguin-game"[^>]*tabindex="0"/);
  for (const room of ['town', 'rink', 'hill']) assert.ok(html.includes(`data-penguin-room="${room}"`));
  assert.match(penguin, /canvas\.addEventListener\('pointerdown'/);
  assert.match(penguin, /canvas\.addEventListener\('keydown'/);
  assert.match(penguin, /points \+= 1/);
  assert.match(penguin, /requestAnimationFrame\(tick\)/);
  assert.match(penguin, /cancelAnimationFrame\(frameId\)/);
  assert.doesNotMatch(penguin, /fetch\(|eval\(|new Function\(/);
});
