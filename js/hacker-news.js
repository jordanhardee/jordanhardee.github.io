// Current Hacker News front page, sourced directly from the official Firebase
// API. Rank follows /v0/topstories, not an unrelated popularity search.
(function () {
  const list = document.getElementById('hn-list');
  const status = document.getElementById('hn-status');
  const updated = document.getElementById('hn-updated');
  if (!list || !status || !updated) return;

  const api = 'https://hacker-news.firebaseio.com/v0/';
  const refreshMs = 5 * 60 * 1000;
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let items = [];
  let lastSuccess = 0;
  let hovered = false;
  let focused = false;
  let pauseUntil = 0;
  let previousFrame = 0;
  let atEndUntil = 0;

  async function getJson(url) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
      if (!response.ok) throw new Error(`HN HTTP ${response.status}`);
      return await response.json();
    } finally { window.clearTimeout(timeout); }
  }

  function articleUrl(item) {
    try {
      const url = new URL(item.url);
      if (url.protocol === 'https:') return url.href;
    } catch { /* Ask HN and other posts have no outside URL. */ }
    return `https://news.ycombinator.com/item?id=${item.id}`;
  }

  function render() {
    const fragment = document.createDocumentFragment();
    for (const item of items) {
      const row = document.createElement('li');
      const rank = document.createElement('span');
      const main = document.createElement('div');
      const title = document.createElement('a');
      const meta = document.createElement('div');
      const comments = document.createElement('a');

      row.className = 'hn-item';
      rank.className = 'hn-rank';
      rank.textContent = `${item.rank}.`;
      title.className = 'hn-title';
      title.href = articleUrl(item);
      title.target = '_blank';
      title.rel = 'noopener noreferrer';
      title.textContent = item.title;
      meta.className = 'hn-meta';
      meta.append(document.createTextNode(`${item.score || 0} pts · `));
      comments.href = `https://news.ycombinator.com/item?id=${item.id}`;
      comments.target = '_blank';
      comments.rel = 'noopener noreferrer';
      comments.textContent = `${item.descendants || 0} comments`;
      meta.append(comments);
      main.append(title, meta);
      row.append(rank, main);
      fragment.append(row);
    }
    list.replaceChildren(fragment);
    list.scrollTop = 0;
    atEndUntil = 0;
  }

  async function refresh() {
    try {
      const ids = await getJson(`${api}topstories.json`);
      if (!Array.isArray(ids) || ids.length < 10) throw new Error('Invalid ranking list');
      const results = await Promise.allSettled(ids.slice(0, 20).map(id =>
        getJson(`${api}item/${id}.json`)
      ));
      const current = results.map((result, index) => {
        if (result.status !== 'fulfilled') return null;
        const item = result.value;
        if (!item || !Number.isInteger(item.id) || item.deleted || item.dead || !item.title) return null;
        if (item.type !== 'story' && item.type !== 'job') return null;
        return { ...item, rank: index + 1 };
      }).filter(Boolean);
      if (!current.length) throw new Error('No ranked stories available');
      items = current;
      lastSuccess = Date.now();
      status.textContent = 'LIVE TOP';
      status.classList.add('is-online');
      status.classList.remove('is-error');
      updated.textContent = `Checked ${new Date(lastSuccess).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
      render();
    } catch (error) {
      console.info('Hacker News front page unavailable:', error.message);
      status.textContent = items.length ? 'STALE' : 'OFFLINE';
      status.classList.remove('is-online');
      status.classList.add('is-error');
      if (!items.length) {
        const message = document.createElement('li');
        message.className = 'hn-message';
        message.textContent = 'Front page temporarily unavailable.';
        list.replaceChildren(message);
        updated.textContent = 'See Hacker News directly';
      }
    }
  }

  list.addEventListener('mouseenter', () => { hovered = true; });
  list.addEventListener('mouseleave', () => { hovered = false; });
  list.addEventListener('focusin', () => { focused = true; });
  list.addEventListener('focusout', () => { focused = false; pauseUntil = performance.now() + 2000; });
  list.addEventListener('pointerdown', () => { pauseUntil = performance.now() + 15000; });
  list.addEventListener('wheel', () => { pauseUntil = performance.now() + 5000; }, { passive: true });

  function autoScroll(now) {
    const elapsed = previousFrame ? Math.min(60, now - previousFrame) : 0;
    previousFrame = now;
    if (!document.hidden && !hovered && !focused && now > pauseUntil && items.length) {
      const max = list.scrollHeight - list.clientHeight;
      if (max > 0) {
        if (list.scrollTop >= max - 1) {
          if (!atEndUntil) atEndUntil = now + 1700;
          else if (now >= atEndUntil) { list.scrollTop = 0; atEndUntil = 0; }
        } else {
          atEndUntil = 0;
          list.scrollTop += elapsed * .018;
        }
      }
    }
    requestAnimationFrame(autoScroll);
  }

  refresh();
  window.setInterval(() => { if (!document.hidden) refresh(); }, refreshMs);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && Date.now() - lastSuccess > refreshMs) refresh();
  });
  if (!reduceMotion) requestAnimationFrame(autoScroll);
})();
