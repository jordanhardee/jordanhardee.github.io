// NASA's current public WordPress APOD API replaces the old api.nasa.gov
// planetary/apod endpoint (scheduled for retirement in December 2026).
(function () {
  const endpoint = 'https://science.nasa.gov/wp-json/wp/v2/apod-basic?per_page=1';
  const message = document.getElementById('apod-message');
  const image = document.getElementById('apod-image');
  const imageLink = document.getElementById('apod-image-link');
  const title = document.getElementById('apod-title');
  const date = document.getElementById('apod-date');
  const credit = document.getElementById('apod-credit');
  const status = document.getElementById('apod-status');
  const source = document.getElementById('apod-source');
  if (!message || !image || !imageLink || !title || !date || !credit || !status || !source) return;

  function nasaLink(value, fallback) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && (url.hostname === 'nasa.gov' || url.hostname.endsWith('.nasa.gov'))
        ? url.href : fallback;
    } catch {
      return fallback;
    }
  }

  // Credit fields can contain HTML links; only render their text, never HTML.
  function plainText(markup) {
    const parsed = new DOMParser().parseFromString(typeof markup === 'string' ? markup : '', 'text/html');
    return (parsed.body.textContent || '').replace(/\s+/g, ' ').trim();
  }

  async function refresh() {
    try {
      const response = await fetch(endpoint, { cache: 'no-store' });
      if (!response.ok) throw new Error(`NASA returned HTTP ${response.status}`);
      const entries = await response.json();
      const entry = Array.isArray(entries) ? entries[0] : null;
      if (!entry || typeof entry.title !== 'string') throw new Error('NASA sent no APOD entry');

      const url = nasaLink(entry.permalink || entry.url, 'https://science.nasa.gov/apod/');
      imageLink.href = url;
      source.href = url;
      title.textContent = entry.title;
      date.textContent = typeof entry.date === 'string' ? entry.date : '';
      const photographer = plainText(entry.credit || entry.copyright);
      credit.textContent = photographer ? `Image: ${photographer}` : 'Source: NASA Astronomy Picture of the Day';
      status.textContent = 'NASA / DAILY';

      const picture = nasaLink(entry.hdurl, '');
      if (entry.media_type === 'image' && picture) {
        image.alt = typeof entry.alt === 'string' && entry.alt !== 'See Explanation.' ? entry.alt : entry.title;
        image.hidden = false;
        image.src = picture;
        message.hidden = true;
        image.onerror = () => {
          image.hidden = true;
          message.textContent = 'Image unavailable. Open today’s picture at NASA.';
          message.hidden = false;
        };
      } else {
        image.hidden = true;
        image.removeAttribute('src');
        message.textContent = entry.media_type === 'video'
          ? 'Today’s astronomy feature is a video. View it at NASA.'
          : 'View today’s astronomy feature at NASA.';
        message.hidden = false;
      }
    } catch (error) {
      status.textContent = 'NASA / OFFLINE';
      if (image.hidden) {
        message.textContent = 'NASA’s image feed is temporarily unavailable. Open APOD at NASA.';
        message.hidden = false;
      }
      console.info('APOD feed unavailable:', error.message);
    }
  }

  refresh();
  window.setInterval(refresh, 60 * 60 * 1000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refresh();
  });
})();
