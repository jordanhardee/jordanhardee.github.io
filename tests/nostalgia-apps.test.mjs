import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
const terminals = readFileSync(new URL('../js/nostalgia-apps.js', import.meta.url), 'utf8');
const manager = readFileSync(new URL('../js/window-manager.js', import.meta.url), 'utf8');

test('retro terminal launchers have actual windows, inputs, and taskbar buttons', () => {
  for (const id of ['cmd-terminal', 'kali-terminal']) {
    assert.ok(html.includes(`data-window="${id}"`), `${id} window absent`);
    assert.ok(html.includes(`class="xp-task-button module-task-hidden" type="button" data-window="${id}"`), `${id} taskbar missing`);
    assert.ok(manager.includes(`'${id}': [`), `${id} lacks default dimensions`);
  }
  assert.match(html, /id="cmd-shortcut" data-launch="cmd-terminal"/);
  assert.match(html, /id="openssh-shortcut" data-launch="kali-terminal"/);
  assert.match(css, /\.terminal-output\s*\{[^}]*overflow-y:\s*auto/);
  assert.match(html, /data-window="club-penguin"/);
  assert.match(html, /data-open-window="club-penguin"/);
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
  nodes['kali-input'].value = 'help';
  listeners.get('kali-form:submit')({ preventDefault() {} });
  assert.ok(nodes['kali-output'].children.some(node => /msfconsole.*sqlmap.*wireshark/s.test(node.textContent)));
  nodes['kali-input'].value = 'uname -a';
  listeners.get('kali-form:submit')({ preventDefault() {} });
  assert.ok(nodes['kali-output'].children.some(node => /4\.0\.0-kali1-amd64/.test(node.textContent)));

  const runKali = command => {
    nodes['kali-input'].value = command;
    listeners.get('kali-form:submit')({ preventDefault() {} });
    return nodes['kali-output'].children.at(-1)?.textContent || '';
  };
  const demos = [
    ['nmap -sV 192.0.2.42', /21\/tcp\s+open\s+ftp/],
    ['aircrack-ng demo.cap', /KEY FOUND!.*coffee-shop-demo/],
    ['airmon-ng start wlan0', /wlan0mon/],
    ['john hashes.txt', /John the Ripper.*hunter2/s],
    ['hydra -l demo -p demo 192.0.2.42 ssh', /Hydra v8\.1.*password: letmein/s],
    ['sqlmap -u training.example', /parameter 'id'.*injectable/s],
    ['nikto -h 192.0.2.42', /Nikto v2\.1\.6/],
    ['wireshark', /Wireshark 1\.12.*Cannot open/s],
    ['nc -v 192.0.2.42 80', /netcat-traditional.*HTTP\/1\.1 200 OK/s],
    ['macchanger -r wlan0', /New MAC:.*02:11:22:33:44:55/],
    ['searchsploit apache', /Exploit Database|Exploit Title/],
  ];
  for (const [command, expected] of demos) {
    const response = runKali(command);
    assert.match(response, expected, `${command} did not render its mock output`);
    assert.match(response, /no network traffic/i, `${command} omitted the simulation warning`);
  }
  assert.match(runKali('nmap --help'), /SYN scan/);
  assert.match(runKali('nmap --version'), /Nmap 6\.49BETA4/);
  assert.match(runKali('whoami'), /^root$/);
  assert.match(runKali('ls /usr/bin'), /searchsploit.*sqlmap/s);
  assert.match(runKali('fortune'), /nostalgia/);
  assert.match(runKali('history'), /nmap -sV/);
  assert.match(runKali('msfconsole'), /metasploit v4\.11/);
  assert.equal(nodes['kali-prompt'].textContent, 'msf > ');
  assert.match(runKali('search smb'), /ms08_067_netapi/);
  assert.match(runKali('use exploit/windows/smb/ms08_067_netapi'), /simulated module/);
  assert.match(nodes['kali-prompt'].textContent, /msf exploit\(ms08_067_netapi\)/);
  assert.match(runKali('exploit'), /IN YOUR IMAGINATION/);
  assert.match(runKali('exit'), /Leaving the simulated Metasploit console/);
  assert.equal(nodes['kali-prompt'].textContent, 'root@kali:~# ');
  runKali('<img src=x onerror=alert(1)>');
  assert.ok(nodes['kali-output'].children.every(node => node.innerHTML === undefined));
  runKali('clear');
  assert.equal(nodes['kali-output'].children.length, 0);
});

