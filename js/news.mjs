// A small RSS headline reader. News is built server-side so publishers do not
// have to grant cross-origin JavaScript access to their RSS feeds.
const panel = document.querySelector('[data-window="news"]');
const filters = document.getElementById('news-filters');
const items = document.getElementById('news-items');
const status = document.getElementById('news-status');
const updated = document.getElementById('news-updated');
const SOURCE_ORDER = ['Global Voices', 'EFF', 'NASA', 'The Guardian', 'BBC News', 'NPR'];
const REFRESH_AFTER_MS = 15 * 60 * 1000;

let stories = [];
let activeSource = 'all';
let lastFetch = 0;
let pending = null;

function validArticleUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

function storyTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
  });
}

function setSource(source) {
  activeSource = source;
  filters.querySelectorAll('[data-news-source]').forEach(button => {
    const selected = button.dataset.newsSource === source;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  render();
}

function rebuildFilters() {
  filters.querySelectorAll('[data-news-source]:not([data-news-source="all"])')
    .forEach(button => button.remove());
  const sources = new Set(stories.map(story => story.source));
  SOURCE_ORDER.filter(source => sources.has(source)).forEach(source => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'news-filter';
    button.dataset.newsSource = source;
    button.textContent = source;
    button.addEventListener('click', () => setSource(source));
    filters.appendChild(button);
  });
  if (!sources.has(activeSource)) activeSource = 'all';
  setSource(activeSource);
}

function render() {
  items.replaceChildren();
  const filtered = activeSource === 'all'
    ? stories : stories.filter(story => story.source === activeSource);
  if (!filtered.length) {
    status.hidden = false;
    status.textContent = 'No headlines available for this source.';
    return;
  }
  status.hidden = true;
  const fragment = document.createDocumentFragment();
  filtered.forEach(story => {
    const url = validArticleUrl(story.url);
    if (!url) return;
    const entry = document.createElement('li');
    entry.className = 'news-entry';
    const link = document.createElement('a');
    link.className = 'news-headline';
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.referrerPolicy = 'no-referrer';
    link.textContent = story.title;
    link.setAttribute('aria-label', `Read full article at ${story.source}: ${story.title}`);
    entry.appendChild(link);

    const meta = document.createElement('div');
    meta.className = 'news-meta';
    const source = document.createElement('strong');
    source.textContent = story.source;
    meta.appendChild(source);
    const time = storyTime(story.published);
    if (time) {
      const stamp = document.createElement('time');
      stamp.dateTime = story.published;
      stamp.textContent = time;
      meta.appendChild(stamp);
    }
    entry.appendChild(meta);

    if (story.summary) {
      const summary = document.createElement('p');
      summary.className = 'news-summary';
      summary.textContent = story.summary;
      entry.appendChild(summary);
    }
    fragment.appendChild(entry);
  });
  items.appendChild(fragment);
}

async function refresh() {
  if (!panel || panel.classList.contains('module-closed')) return;
  if (pending || (stories.length && Date.now() - lastFetch < REFRESH_AFTER_MS)) return;
  status.hidden = false;
  status.textContent = stories.length ? 'Refreshing headlines…' : 'Loading headlines…';
  pending = fetch(new URL('../data/news.json', import.meta.url), { cache: 'no-store' });
  try {
    const response = await pending;
    if (!response.ok) throw new Error(`News cache returned ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.stories) || !data.stories.length) throw new Error('No news items supplied');
    stories = data.stories;
    lastFetch = Date.now();
    const refreshDate = new Date(data.updatedAt);
    updated.textContent = Number.isNaN(refreshDate.getTime())
      ? 'RSS HEADLINES'
      : `UPDATED ${refreshDate.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`;
    rebuildFilters();
  } catch (error) {
    console.warn('News feed unavailable:', error);
    status.hidden = false;
    status.textContent = stories.length
      ? 'Could not refresh headlines. Showing the last available stories.'
      : 'News is temporarily unavailable. Try reopening this window later.';
  } finally {
    pending = null;
  }
}

filters.querySelector('[data-news-source="all"]')?.addEventListener('click', () => setSource('all'));
document.addEventListener('xp:window-opened', event => {
  if (event.detail?.window === 'news') refresh();
});
if (panel && !panel.classList.contains('module-closed')) refresh();
setInterval(refresh, 60_000);
