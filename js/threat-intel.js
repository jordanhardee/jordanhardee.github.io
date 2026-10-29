// A read-only security wire: current cybersecurity reporting plus CISA's
// independently maintained list of vulnerabilities exploited in the wild.
// All data is fetched in the visitor's browser; no API keys or relay needed.
(function () {
  const panel = document.getElementById('intel-items');
  const status = document.getElementById('intel-status');
  const updated = document.getElementById('intel-updated');
  const sourceLink = document.getElementById('intel-source');
  const newsTab = document.getElementById('intel-news-tab');
  const kevTab = document.getElementById('intel-kev-tab');
  if (!panel || !status || !updated || !sourceLink || !newsTab || !kevTab) return;

  const sources = [
    ['BleepingComputer', 'bleepingcomputer'],
    ['The Hacker News', 'thehackernews'],
    ['SecurityWeek', 'securityweek'],
  ];
  const newsFeedBase = 'https://raw.githubusercontent.com/found-cake/cyber-news-feed/master/data/rss/';
  const kevUrl = 'https://raw.githubusercontent.com/cisagov/kev-data/develop/known_exploited_vulnerabilities.json';
  const refreshMs = 30 * 60 * 1000;
  const state = { news: [], kev: [], newsLoaded: false, kevLoaded: false, checkedAt: 0 };
  let view = 'news';

  function safeUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' ? url.href : null;
    } catch { return null; }
  }

  function dateLabel(value) {
    const date = new Date(value);
    return Number.isFinite(date.valueOf())
      ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : 'Date unknown';
  }

  function cleanText(value) {
    return String(value || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&(?:nbsp|amp|quot|lt|gt|#39);/g, match => ({
        '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&lt;': '<', '&gt;': '>', '&#39;': "'",
      })[match] || match)
      .replace(/\s+/g, ' ').trim();
  }

  async function fetchJson(url) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } finally { window.clearTimeout(timeout); }
  }

  function makeEntry(entry) {
    const article = document.createElement('article');
    const meta = document.createElement('div');
    const link = document.createElement('a');
    article.className = 'intel-entry';
    meta.className = 'intel-entry-meta';
    link.className = 'intel-entry-link';
    meta.textContent = `${entry.source} · ${dateLabel(entry.date)}`;
    link.textContent = entry.title;
    link.href = entry.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    article.append(meta, link);
    if (entry.summary) {
      const summary = document.createElement('p');
      summary.className = 'intel-entry-summary';
      summary.textContent = entry.summary;
      article.append(summary);
    }
    return article;
  }

  function render() {
    const current = view === 'news' ? state.news : state.kev;
    const loaded = view === 'news' ? state.newsLoaded : state.kevLoaded;
    const tab = view === 'news' ? newsTab : kevTab;
    newsTab.classList.toggle('is-active', view === 'news');
    kevTab.classList.toggle('is-active', view === 'kev');
    newsTab.setAttribute('aria-selected', String(view === 'news'));
    kevTab.setAttribute('aria-selected', String(view === 'kev'));
    panel.setAttribute('aria-labelledby', tab.id);
    sourceLink.href = view === 'news'
      ? 'https://github.com/found-cake/cyber-news-feed'
      : 'https://github.com/CISAgov/kev-data';
    sourceLink.textContent = view === 'news' ? 'NEWS SOURCES' : 'CISA SOURCE';

    status.classList.toggle('is-online', current.length > 0);
    status.classList.toggle('is-error', loaded && !current.length);
    status.textContent = current.length ? 'CONNECTED' : loaded ? 'UNAVAILABLE' : 'SYNCING';

    const checked = state.checkedAt ? ` · checks every 30m` : '';
    updated.textContent = current.length
      ? `Latest ${dateLabel(current[0].date)}${checked}`
      : loaded ? 'Source temporarily unavailable' : 'Loading current reports';

    if (!current.length) {
      const message = document.createElement('p');
      message.className = 'intel-message';
      message.textContent = loaded ? 'Could not load this source. Try the source link.' : 'Retrieving reports...';
      panel.replaceChildren(message);
      return;
    }
    const fragment = document.createDocumentFragment();
    current.slice(0, 16).forEach(entry => fragment.append(makeEntry(entry)));
    panel.replaceChildren(fragment);
  }

  async function loadNews() {
    const results = await Promise.allSettled(sources.map(async ([name, slug]) => {
      const doc = await fetchJson(`${newsFeedBase}${slug}.json`);
      if (!Array.isArray(doc.articles)) throw new Error('Missing articles');
      return doc.articles.map(article => ({
        source: name,
        title: cleanText(article.title),
        summary: cleanText(article.description).slice(0, 190),
        date: article.published_at,
        url: safeUrl(article.url),
      }));
    }));

    const cutoff = Date.now() - 14 * 86400000;
    const seen = new Set();
    let articles = results.flatMap(result => result.status === 'fulfilled' ? result.value : [])
      .filter(item => item.url && item.title && Date.parse(item.date) >= cutoff)
      .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
      .filter(item => { if (seen.has(item.url)) return false; seen.add(item.url); return true; });

    // Give incidents, active exploitation, vulnerabilities, and response news
    // priority over generic security-business columns or sponsored webinars.
    const threatTerms = /\b(CVE-\d{4}|zero.day|ransomware|malware|breach|exploit(?:ed|ing|s)?|vulnerabilit(?:y|ies)|flaw|patch(?:ed|es)?|botnet|phishing|attack(?:er|ers|s)?|hack(?:ed|ers|ing)?|leak(?:ed|s)?|compromis\w*|backdoor|rootkit|spyware|theft|DDoS|threat.actor|cyberattack|incident|supply.chain|critical|hijack\w*|intrusion|data.stolen|emergency)/i;
    const promos = /\b(webinar|sponsored|advertorial|register now|whitepaper)\b/i;
    const focused = articles.filter(item => threatTerms.test(item.title) && !promos.test(item.title));
    if (focused.length >= 5) articles = focused;

    // If a publisher aggregator goes stale, use a clearly attributed public
    // news-discussion index instead of showing old headlines as current news.
    if (!articles.length) {
      try {
        const hn = await fetchJson('https://hn.algolia.com/api/v1/search_by_date?query=cybersecurity&tags=story&hitsPerPage=30');
        for (const item of hn.hits || []) {
          const url = safeUrl(item.url);
          if (!url || !item.title || Date.parse(item.created_at) < cutoff) continue;
          articles.push({ source: 'Hacker News', title: cleanText(item.title), summary: '', date: item.created_at, url });
        }
      } catch (error) { console.info('Security headline fallback unavailable:', error.message); }
    }
    if (articles.length) state.news = articles.slice(0, 24);
    state.newsLoaded = true;
    if (view === 'news') render();
  }

  async function loadKev() {
    try {
      const doc = await fetchJson(kevUrl);
      if (!Array.isArray(doc.vulnerabilities)) throw new Error('Invalid CISA catalog');
      const entries = doc.vulnerabilities
        .filter(item => /^CVE-\d{4}-\d{4,}$/.test(item.cveID || ''))
        .map(item => ({
          source: item.knownRansomwareCampaignUse === 'Known' ? 'CISA · RANSOMWARE' : 'CISA · EXPLOITED',
          title: `${item.cveID} · ${cleanText(item.vulnerabilityName || `${item.vendorProject} ${item.product}`)}`,
          summary: cleanText(item.shortDescription).slice(0, 240),
          date: `${item.dateAdded}T00:00:00Z`,
          url: `https://nvd.nist.gov/vuln/detail/${item.cveID}`,
        }))
        .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
      if (entries.length) state.kev = entries.slice(0, 24);
    } catch (error) { console.info('CISA catalog unavailable:', error.message); }
    state.kevLoaded = true;
    if (view === 'kev') render();
  }

  async function refresh() {
    await Promise.all([loadNews(), loadKev()]);
    state.checkedAt = Date.now();
    render();
  }

  newsTab.addEventListener('click', () => { view = 'news'; panel.scrollTop = 0; render(); });
  kevTab.addEventListener('click', () => { view = 'kev'; panel.scrollTop = 0; render(); });
  refresh();
  window.setInterval(() => { if (!document.hidden) refresh(); }, refreshMs);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && Date.now() - state.checkedAt > refreshMs) refresh();
  });
})();
