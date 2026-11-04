import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import worker from '../infrastructure/visitor-counter/src/index.mjs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const html = read('index.html');
const css = read('css/style.css');
const browserScript = read('js/visitor-counter.js');
const migration = read('infrastructure/visitor-counter/migrations/0001_sessions.sql');
const sessionId = 'e9d58243-76fa-461a-bd54-16cdace0adab';
const origin = 'https://jordanhardee.com';
const endpoint = 'https://counter.example.workers.dev/api/visits';

function fakeDb() {
  const sessions = new Map();
  return {
    sessions,
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async run() {
              assert.match(sql, /INSERT OR IGNORE INTO visitor_sessions/);
              if (!sessions.has(args[0])) sessions.set(args[0], args[1]);
            },
            async first() {
              assert.match(sql, /SELECT COUNT\(\*\) AS total/);
              const days = [...sessions.values()];
              return { total: days.length, today: days.filter(day => day === args[0]).length, since: days.sort()[0] || null };
            },
          };
        },
      };
    },
  };
}

function request(method, session = sessionId, requestOrigin = origin) {
  return new Request(endpoint, {
    method,
    headers: { Origin: requestOrigin, 'Content-Type': 'application/json' },
    ...(method === 'POST' ? { body: JSON.stringify({ sessionId: session }) } : {}),
  });
}

test('the counter is hidden until a real HTTPS Worker endpoint is configured', () => {
  assert.match(html, /id="site-visit-counter"[^>]*data-api-endpoint=""[^>]*hidden/);
  assert.match(html, /data-window="visitor-stats"/);
  assert.match(html, /data-window="visitor-stats" aria-label="Restore Visitor Statistics"/);
  assert.match(html, /js\/visitor-counter\.js/);
  assert.match(css, /\.site-visit-counter\[hidden\]\s*\{\s*display:none/);
  assert.match(browserScript, /sessionStorage\.getItem\(storageKey\)/);
  assert.match(browserScript, /document\.dispatchEvent\(new CustomEvent\('xp:open-window'/);
  assert.match(browserScript, /counter\.hidden = true/);
  assert.match(migration, /token_hash TEXT NOT NULL PRIMARY KEY/);
  assert.doesNotMatch(migration, /ip_address|user_agent|email/i);
});

test('frontend displays real results and opens the XP stats window on click', async () => {
  const nodes = new Map();
  const events = new Map();
  const counter = {
    hidden: true,
    dataset: { apiEndpoint: endpoint },
    addEventListener(event, callback) { events.set(event, callback); },
    setAttribute(name, value) { this[name] = value; },
  };
  nodes.set('site-visit-counter', counter);
  for (const id of ['site-visit-digits', 'visitor-stats-total', 'visitor-stats-today', 'visitor-stats-since', 'visitor-stats-status']) {
    nodes.set(id, { textContent: '' });
  }
  const requests = [];
  const session = new Map();
  let opened = null;
  const sandbox = {
    document: {
      getElementById(id) { return nodes.get(id); },
      dispatchEvent(event) { opened = event.detail.window; },
    },
    sessionStorage: {
      getItem(key) { return session.get(key) || null; },
      setItem(key, value) { session.set(key, value); },
    },
    crypto: { randomUUID() { return sessionId; } },
    fetch: async (url, init) => {
      requests.push({ url, init });
      return { ok: true, async json() { return { total: 1337, today: 12, since: '2026-11-04' }; } };
    },
    CustomEvent: class { constructor(type, options) { this.detail = options.detail; } },
    Date,
  };
  vm.runInNewContext(browserScript, sandbox);
  await new Promise(resolve => setImmediate(resolve));

  assert.equal(counter.hidden, false);
  assert.equal(nodes.get('site-visit-digits').textContent, '00001337');
  assert.equal(nodes.get('visitor-stats-total').textContent, '1,337');
  assert.equal(nodes.get('visitor-stats-today').textContent, '12');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, endpoint);
  assert.equal(requests[0].init.method, 'POST');
  assert.equal(JSON.parse(requests[0].init.body).sessionId, sessionId);
  events.get('click')();
  assert.equal(opened, 'visitor-stats');
});

test('Worker counts each random session once and publishes anonymous totals', async () => {
  const db = fakeDb();
  const env = { VISITS_DB: db };
  const before = await worker.fetch(request('GET'), env);
  assert.deepEqual(await before.json(), { total: 0, today: 0, since: null });
  assert.equal(before.headers.get('Access-Control-Allow-Origin'), origin);
  assert.equal(before.headers.get('Cache-Control'), 'no-store');

  const first = await worker.fetch(request('POST'), env);
  assert.equal(first.status, 200);
  assert.equal((await first.json()).total, 1);
  const repeat = await worker.fetch(request('POST'), env);
  assert.equal((await repeat.json()).total, 1);
  assert.equal(db.sessions.size, 1);
  assert.notEqual([...db.sessions.keys()][0], sessionId); // Only a digest is stored.
  assert.match([...db.sessions.keys()][0], /^[0-9a-f]{64}$/);

  const other = await worker.fetch(request('POST', '8e0d3178-6eba-494c-a3d2-e29979c3e021'), env);
  assert.equal((await other.json()).total, 2);
  const result = await worker.fetch(request('GET'), env);
  assert.equal((await result.json()).today, 2);
});

test('Worker rejects cross-origin writes, malformed IDs, and oversized bodies', async () => {
  const env = { VISITS_DB: fakeDb() };
  assert.equal((await worker.fetch(request('POST', sessionId, 'https://evil.example'), env)).status, 403);
  assert.equal((await worker.fetch(request('POST', 'invalid'), env)).status, 400);
  assert.equal((await worker.fetch(request('POST', 'x'.repeat(300)), env)).status, 400);
  assert.equal((await worker.fetch(request('OPTIONS'), env)).status, 204);
  assert.equal((await worker.fetch(new Request('https://counter.example.workers.dev/other'), env)).status, 404);
  assert.equal(env.VISITS_DB.sessions.size, 0);
});
