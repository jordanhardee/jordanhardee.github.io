// Public, read-only IPsum feed. No API key or visitor data is sent to a relay.
// IPsum aggregates 30+ source lists and publishes an updated snapshot daily.
(function () {
  const list = document.getElementById('intel-list');
  const status = document.getElementById('intel-status');
  const updated = document.getElementById('intel-updated');
  if (!list || !status || !updated) return;

  const endpoints = [
    'https://raw.githubusercontent.com/stamparm/ipsum/master/README.md',
    'https://cdn.jsdelivr.net/gh/stamparm/ipsum@master/README.md',
  ];
  const refreshMs = 60 * 60 * 1000;
  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let entries = [];
  let offset = 0;
  let lastSuccess = 0;

  function parseFeed(markdown) {
    const heading = /^Wall of Shame \((\d{4}-\d{2}-\d{2})\)\s*$/m.exec(markdown);
    if (!heading) throw new Error('IPsum date not found');
    const remainder = markdown.slice(heading.index + heading[0].length);
    const rows = [];
    for (const line of remainder.split(/\r?\n/)) {
      const match = /^\|?\s*((?:\d{1,3}\.){3}\d{1,3})\s*\|\s*[^|\r\n]*\|\s*(\d+)\s*\|?\s*$/.exec(line);
      if (!match) continue;
      const address = match[1];
      const hits = Number(match[2]);
      if (address.split('.').some(part => Number(part) > 255) || hits < 2 || hits > 100) continue;
      rows.push({ address, hits });
      if (rows.length === 84) break;
    }
    if (rows.length < 7) throw new Error('IPsum table missing');
    return { date: heading[1], rows };
  }

  function showRows() {
    if (!entries.length) return;
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < 7; i++) {
      const entry = entries[(offset + i) % entries.length];
      const row = document.createElement('li');
      const address = document.createElement('span');
      const count = document.createElement('span');
      row.className = 'intel-row';
      address.textContent = entry.address;
      count.textContent = `${entry.hits} lists`;
      row.append(address, count);
      fragment.append(row);
    }
    list.replaceChildren(fragment);
  }

  async function getText(url) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
      if (!response.ok) throw new Error(`Feed HTTP ${response.status}`);
      return await response.text();
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function refresh() {
    let data;
    for (const endpoint of endpoints) {
      try {
        data = parseFeed(await getText(endpoint));
        break;
      } catch (error) {
        console.info('IPsum source unavailable:', endpoint, error.message);
      }
    }

    status.classList.toggle('is-online', Boolean(data));
    status.classList.toggle('is-error', !data);
    if (!data) {
      status.textContent = entries.length ? 'STALE' : 'OFFLINE';
      if (!entries.length) {
        const message = document.createElement('li');
        message.className = 'intel-message';
        message.textContent = 'Feed temporarily unavailable.';
        list.replaceChildren(message);
        updated.textContent = 'See source for latest data';
      }
      return;
    }

    entries = data.rows;
    offset = 0;
    lastSuccess = Date.now();
    status.textContent = 'CONNECTED';
    updated.textContent = `${data.date} · daily snapshot`;
    showRows();
  }

  refresh();
  window.setInterval(() => { if (!document.hidden) refresh(); }, refreshMs);
  if (!reducedMotion) {
    window.setInterval(() => {
      if (document.hidden || !entries.length) return;
      offset = (offset + 7) % entries.length;
      showRows();
    }, 6500);
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && Date.now() - lastSuccess > refreshMs) refresh();
  });
})();
