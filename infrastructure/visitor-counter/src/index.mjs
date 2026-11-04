// Cloudflare Worker for jordanhardee.com's anonymous visitor counter.
// Uses only random browser-session UUIDs; never records IPs or user agents.
const allowedOrigins = new Set([
  'https://jordanhardee.com',
  'https://www.jordanhardee.com',
  'https://jordanhardee.github.io',
]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function headersFor(request) {
  const headers = new Headers({
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'Vary': 'Origin',
  });
  const origin = request.headers.get('Origin');
  if (allowedOrigins.has(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');
    headers.set('Access-Control-Max-Age', '600');
  }
  return headers;
}

function json(request, data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: headersFor(request) });
}

async function readSmallJson(request) {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 256) { await reader.cancel(); return null; }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch { return null; }
  finally { try { reader.releaseLock(); } catch { /* already released */ } }
}

async function hashToken(token) {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/api/visits') return json(request, { error: 'Not found' }, 404);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: allowedOrigins.has(request.headers.get('Origin')) ? 204 : 403, headers: headersFor(request) });
    }
    if (!['GET', 'POST'].includes(request.method)) return json(request, { error: 'Method not allowed' }, 405);
    if (!env.VISITS_DB) return json(request, { error: 'Counter unavailable' }, 503);

    const day = new Date().toISOString().slice(0, 10); // Explicitly UTC.
    if (request.method === 'POST') {
      if (!allowedOrigins.has(request.headers.get('Origin'))) return json(request, { error: 'Origin not permitted' }, 403);
      if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) return json(request, { error: 'JSON required' }, 415);
      const input = await readSmallJson(request);
      if (!input || typeof input.sessionId !== 'string' || !uuidPattern.test(input.sessionId)) {
        return json(request, { error: 'Invalid session' }, 400);
      }
      try {
        const hash = await hashToken(input.sessionId);
        await env.VISITS_DB.prepare('INSERT OR IGNORE INTO visitor_sessions (token_hash, day_utc) VALUES (?1, ?2)')
          .bind(hash, day).run();
      } catch (error) {
        console.error('Visitor counter insert failed', error);
        return json(request, { error: 'Counter unavailable' }, 503);
      }
    }

    try {
      const count = await env.VISITS_DB.prepare(`
        SELECT COUNT(*) AS total,
               COUNT(CASE WHEN day_utc = ?1 THEN 1 END) AS today,
               MIN(day_utc) AS since
        FROM visitor_sessions
      `).bind(day).first();
      return json(request, {
        total: Number(count?.total || 0),
        today: Number(count?.today || 0),
        since: count?.since || null,
      });
    } catch (error) {
      console.error('Visitor counter read failed', error);
      return json(request, { error: 'Counter unavailable' }, 503);
    }
  },
};
