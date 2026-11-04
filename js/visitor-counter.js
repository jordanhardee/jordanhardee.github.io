// A real shared visit count, backed by the optional Cloudflare Worker.
// This stays invisible until the endpoint is configured and returns real data.
(function () {
  'use strict';
  const counter = document.getElementById('site-visit-counter');
  const endpoint = counter?.dataset.apiEndpoint?.trim();
  if (!counter || !endpoint || !/^https:\/\//i.test(endpoint)) return;

  const digits = document.getElementById('site-visit-digits');
  const totalField = document.getElementById('visitor-stats-total');
  const todayField = document.getElementById('visitor-stats-today');
  const sinceField = document.getElementById('visitor-stats-since');
  const statusField = document.getElementById('visitor-stats-status');
  const storageKey = 'jordanhardee-visit-session-v1';
  let sessionId = null;

  // sessionStorage lasts through refreshes of this tab, but not a new tab session.
  // If storage is disabled, show public totals without creating a new visit.
  try {
    sessionId = sessionStorage.getItem(storageKey);
    if (!sessionId && crypto?.randomUUID) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem(storageKey, sessionId);
    }
  } catch { sessionId = null; }

  function displayDate(day) {
    if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return '—';
    const date = new Date(`${day}T00:00:00Z`);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
  }

  function show(data) {
    if (!data || !Number.isSafeInteger(data.total) || data.total < 0 || !Number.isSafeInteger(data.today) || data.today < 0) {
      throw new Error('Invalid counter response');
    }
    digits.textContent = String(data.total).padStart(8, '0');
    totalField.textContent = data.total.toLocaleString();
    todayField.textContent = data.today.toLocaleString();
    sinceField.textContent = displayDate(data.since);
    statusField.textContent = 'Counter online · anonymous sessions';
    counter.setAttribute('aria-label', `${data.total.toLocaleString()} visits. Open visitor statistics.`);
    counter.hidden = false;
  }

  async function loadCount() {
    const response = await fetch(endpoint, {
      method: sessionId ? 'POST' : 'GET',
      headers: sessionId ? { 'Content-Type': 'application/json' } : {},
      body: sessionId ? JSON.stringify({ sessionId }) : undefined,
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
    });
    if (!response.ok) throw new Error(`Counter HTTP ${response.status}`);
    show(await response.json());
  }

  counter.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('xp:open-window', { detail: { window: 'visitor-stats' } }));
  });
  loadCount().catch(() => {
    // Do not show a made-up value or a broken widget if the Worker is down.
    counter.hidden = true;
    statusField.textContent = 'Counter temporarily unavailable.';
  });
})();
