import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');
const script = readFileSync(new URL('../js/internet-explorer.js', import.meta.url), 'utf8');
const image = readFileSync(new URL('../assets/nostalgia/xp/mywebsearch-toolbar.png', import.meta.url));
const ieIcon = readFileSync(new URL('../assets/nostalgia/xp/internet-explorer-6.png', import.meta.url));

test('Internet Explorer uses the ordinary XP window lifecycle with a lazy SmolNet iframe', () => {
  assert.match(html, /class="xp-app-window internet-explorer-panel module-closed" data-window="internet-explorer"/);
  assert.match(html, /data-open-window="internet-explorer"/);
  assert.match(html, /data-window="internet-explorer" aria-label="Restore Internet Explorer"/);
  assert.match(html, /id="ie-portal-frame"[^>]+data-src="https:\/\/portal\.mozz\.us\/"/);
  assert.doesNotMatch(html.match(/<iframe id="ie-portal-frame"[^>]+>/)?.[0] || '', /\ssrc=/);
  assert.match(html, /js\/internet-explorer\.js/);
  assert.match(css, /\.ie-nostalgia-scroll\s*\{[^}]*overflow-x:auto;/);
  assert.match(css, /\.ie-nostalgia-scroll\s*\{[^}]*height:27px;/);
  assert.match(css, /\.ie-nostalgia-scroll img\s*\{[^}]*transform:translateY\(-34px\);/);
  assert.doesNotMatch(html, /MySearch and Teoma browser toolbar collage/);
});

test('The exact supplied vintage toolbars are bundled locally without executing add-ons', () => {
  assert.equal(image.subarray(1, 4).toString(), 'PNG');
  assert.equal(image.readUInt32BE(16), 801);
  assert.equal(image.readUInt32BE(20), 122);
  assert.match(html, /assets\/nostalgia\/xp\/mywebsearch-toolbar\.png/);
  assert.match(html, /Smiley Central, Cursor Mania/);
});

test('The browser uses a real IE6-era icon in the title bar, Start menu and taskbar', () => {
  assert.equal(ieIcon.subarray(1, 4).toString(), 'PNG');
  assert.equal(ieIcon.readUInt32BE(16), 48);
  assert.equal(ieIcon.readUInt32BE(20), 48);
  assert.equal((html.match(/src="assets\/nostalgia\/xp\/internet-explorer-6\.png"/g) || []).length, 4);
});

test('Address, Back and Home navigate the gateway without leaving the XP desktop on first launch', () => {
  const events = new Map();
  function element(id, props = {}) {
    return {
      hidden: true,
      addEventListener(type, fn) { events.set(`${id}:${type}`, fn); },
      ...props,
    };
  }
  const frame = element('frame', { src: '', getAttribute(key) { return key === 'src' ? this.src : null; } });
  const form = element('form');
  const address = element('address', { value: 'gemini://geminiprotocol.net/docs/' });
  const message = element('message', { textContent: '' });
  const back = element('back', { disabled: false });
  const home = element('home');
  const refresh = element('refresh');
  const byId = {
    'ie-portal-frame': frame,
    'ie-address-form': form,
    'ie-address': address,
    'ie-browser-message': message,
    'ie-back': back,
    'ie-home': home,
    'ie-refresh': refresh,
  };
  const document = {
    getElementById(id) { return byId[id]; },
    addEventListener(type, fn) { events.set(`document:${type}`, fn); },
  };
  let backCalls = 0;
  const window = { history: { back() { backCalls += 1; } } };
  vm.runInNewContext(script, { document, URL, Set, window });
  const submit = () => events.get('form:submit')({ preventDefault() {} });

  assert.equal(back.disabled, true);
  events.get('back:click')();
  assert.equal(backCalls, 0);
  submit();
  events.get('frame:load')();
  assert.equal(back.disabled, true);
  assert.equal(frame.src, 'https://portal.mozz.us/gemini/geminiprotocol.net/docs/');
  assert.equal(message.hidden, true);
  address.value = 'gopher://gopher.floodgap.com/1/';
  submit();
  events.get('frame:load')();
  assert.equal(back.disabled, false);
  assert.equal(frame.src, 'https://portal.mozz.us/gopher/gopher.floodgap.com/1/');
  events.get('back:click')();
  assert.equal(backCalls, 1);
  events.get('frame:load')();
  assert.equal(back.disabled, true);

  address.value = 'https://evil.example/';
  submit();
  assert.equal(frame.src, 'https://portal.mozz.us/gopher/gopher.floodgap.com/1/');
  assert.equal(message.hidden, false);

  address.value = 'https://portal.mozz.us.evil.example/';
  submit();
  assert.equal(message.hidden, false);
  events.get('home:click')();
  assert.equal(frame.src, 'https://portal.mozz.us/');
  assert.equal(address.value, 'https://portal.mozz.us/');
  events.get('refresh:click')();
  assert.equal(frame.src, 'https://portal.mozz.us/');
  events.get('document:xp:closed')({ detail: { window: 'internet-explorer' } });
  assert.equal(address.value, 'https://portal.mozz.us/');
  assert.equal(back.disabled, true);
});
