// Wikipedia's featured article, fetched only when its XP window is opened.
const panel = document.querySelector('[data-window="wikipedia-featured"]');
const dateLabel = document.getElementById('wikipedia-date');
const status = document.getElementById('wikipedia-status');
const article = document.getElementById('wikipedia-article');
const title = document.getElementById('wikipedia-title');
const description = document.getElementById('wikipedia-description');
const extract = document.getElementById('wikipedia-extract');
const imageLink = document.getElementById('wikipedia-image-link');
const image = document.getElementById('wikipedia-image');
const sourceLink = document.getElementById('wikipedia-source');

let loadedDay = '';
let pendingDay = '';

function localDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return { key: `${year}/${month}/${day}`, today };
}

function wikipediaUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'en.wikipedia.org'
      ? url.href : null;
  } catch {
    return null;
  }
}

function thumbnailUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && (url.hostname === 'upload.wikimedia.org' ||
      url.hostname === 'thumb.wikimedia.org') ? url.href : null;
  } catch {
    return null;
  }
}

// The featured-feed `extract` is just a short teaser. Request the readable
// article text separately so the XP window behaves like an actual reader.
async function fullArticleText(pageTitle) {
  const query = new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', prop: 'extracts',
    explaintext: '1', exsectionformat: 'plain', titles: pageTitle, origin: '*',
  });
  const response = await fetch(`https://en.wikipedia.org/w/api.php?${query}`);
  if (!response.ok) throw new Error(`Wikipedia article returned ${response.status}`);
  const data = await response.json();
  const text = data?.query?.pages?.[0]?.extract;
  if (typeof text !== 'string' || text.trim().length < 300) throw new Error('Full article unavailable');
  return text.trim();
}

async function loadFeaturedArticle() {
  if (!panel || panel.classList.contains('module-closed')) return;
  const { key, today } = localDate();
  if (key === loadedDay || key === pendingDay) return;

  pendingDay = key;
  dateLabel.textContent = today.toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  status.hidden = false;
  status.textContent = 'Retrieving today’s featured article…';
  article.hidden = true;

  try {
    const response = await fetch(`https://en.wikipedia.org/api/rest_v1/feed/featured/${key}`, {
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) throw new Error(`Wikipedia feed returned ${response.status}`);
    const data = await response.json();
    const featured = data.tfa;
    const url = wikipediaUrl(featured?.content_urls?.desktop?.page);
    if (!featured?.title || !url) throw new Error('Wikipedia did not supply a featured article');

    title.textContent = featured.normalizedtitle || featured.title.replaceAll('_', ' ');
    description.textContent = featured.description || '';
    description.hidden = !description.textContent;
    extract.textContent = featured.extract || '';
    panel.querySelector('.wikipedia-body').scrollTop = 0;
    sourceLink.href = url;

    const thumbnail = thumbnailUrl(featured.thumbnail?.source);
    imageLink.hidden = !thumbnail;
    if (thumbnail) {
      image.src = thumbnail;
      image.alt = `Illustration for ${title.textContent} from Wikipedia`;
      imageLink.href = url;
    } else {
      image.removeAttribute('src');
    }

    article.hidden = false;
    status.hidden = true;
    loadedDay = key;
    try {
      const fullText = await fullArticleText(featured.title);
      if (loadedDay === key) extract.textContent = fullText;
    } catch (error) {
      // Preserve the useful preview and the original article link if the
      // cross-origin API is blocked or the article is temporarily unavailable.
      console.warn('Wikipedia full article unavailable; showing preview:', error);
    }
  } catch (error) {
    console.warn('Wikipedia featured article unavailable:', error);
    status.textContent = 'Could not load today’s featured article. Use “Read on Wikipedia” below.';
    sourceLink.href = 'https://en.wikipedia.org/wiki/Wikipedia:Today%27s_featured_article';
  } finally {
    pendingDay = '';
  }
}

document.addEventListener('xp:window-opened', event => {
  if (event.detail?.window === 'wikipedia-featured') loadFeaturedArticle();
});
if (panel && !panel.classList.contains('module-closed')) loadFeaturedArticle();
setInterval(loadFeaturedArticle, 60_000);
