// Browser-only Cursor Mania modeled on Jordan's CursorPhreak desktop app.
// All 11,145 original cursors are browsable. Byte-range requests load just the
// visible GIF previews and selected normalized frames from the pinned archive.
// Nothing is installed or stored after this document is closed or refreshed.
(function () {
  const el = id => document.getElementById(id);
  const launcher = el('ie-cursor-mania');
  const tree = el('cursor-mania-tree');
  const grid = el('cursor-mania-grid');
  const count = el('cursor-mania-count');
  const status = el('cursor-mania-status');
  const currentPreview = el('cursor-mania-current-preview');
  const code = el('cursor-mania-code');
  const favorite = el('cursor-mania-favorite');
  const copy = el('cursor-mania-copy');
  const reset = el('cursor-mania-reset');
  const newButton = el('cursor-mania-new');
  const share = el('cursor-mania-share');
  const help = el('cursor-mania-help');
  if (!launcher || !tree || !grid || !count || !status || !currentPreview || !code || !favorite || !copy || !reset) return;

  // This SHA pins catalog offsets to the corresponding binary pack revisions.
  const revision = 'c04b94cfeed1f12d6aa580ce7e8c669e4d671c02';
  const source = `https://raw.githubusercontent.com/jordanhardee/CursorPhreak/${revision}/assets/`;
  const previews = `${source}previews.pak`;
  const frames = `${source}frames.pak`;
  const favorites = new Set();
  const expanded = new Set();
  const previewCache = new Map();
  const previewPending = new Map();
  const categories = new Map();
  const categoryButtons = new Map();
  const parents = new Map();
  const queue = [];
  let activeFetches = 0;
  let catalogPromise = null;
  let catalog = null;
  let activeCategory = 'most-popular';
  let currentId = null;
  let currentPng = '';
  let selectionNumber = 0;
  let observer = null;

  function setStatus(message) { status.textContent = message; }

  async function range(url, offset, length) {
    const response = await fetch(url, { headers: { Range: `bytes=${offset}-${offset + length - 1}` } });
    if (response.status !== 206) {
      await response.body?.cancel();
      throw new Error('The cursor archive did not honor a byte-range request.');
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength !== length) throw new Error('Truncated cursor data.');
    return bytes;
  }

  function pump() {
    while (activeFetches < 8 && queue.length) {
      const job = queue.shift();
      activeFetches++;
      Promise.resolve().then(job.run).then(job.resolve, job.reject).finally(() => {
        activeFetches--;
        pump();
      });
    }
  }
  function enqueue(run) {
    return new Promise((resolve, reject) => {
      queue.push({ run, resolve, reject });
      pump();
    });
  }

  function previewFor(id) {
    if (previewCache.has(id)) return Promise.resolve(previewCache.get(id));
    if (previewPending.has(id)) return previewPending.get(id);
    const entry = catalog?.c[id];
    if (!entry) return Promise.reject(new Error('Unknown cursor.'));
    const task = enqueue(async () => {
      const bytes = await range(previews, entry[0], entry[1]);
      const url = URL.createObjectURL(new Blob([bytes], { type: entry[2] === 0 ? 'image/gif' : 'image/png' }));
      previewCache.set(id, url);
      return url;
    });
    previewPending.set(id, task);
    task.then(() => previewPending.delete(id), () => previewPending.delete(id));
    return task;
  }

  function previewInto(image) {
    const id = image.dataset.cursorId;
    previewFor(id).then(url => {
      if (image.isConnected && image.dataset.cursorId === id) image.src = url;
    }).catch(() => {
      if (image.isConnected) image.alt = 'Preview unavailable';
    });
  }

  function renderGallery(ids) {
    observer?.disconnect();
    grid.replaceChildren();
    grid.scrollTop = 0;
    if (!ids.length) {
      const message = document.createElement('p');
      message.className = 'cursor-mania-grid-message';
      message.textContent = activeCategory === 'favorites'
        ? 'No favorites yet. Choose a cursor, then press Favorite.'
        : 'Choose a subcategory on the left.';
      grid.appendChild(message);
      return;
    }
    const fragment = document.createDocumentFragment();
    const images = [];
    for (const id of ids) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cursor-mania-choice';
      button.dataset.cursorId = id;
      button.setAttribute('role', 'option');
      button.setAttribute('aria-label', `Cursor ${id}`);
      button.setAttribute('aria-selected', String(id === currentId));
      button.title = `Cursor ${id} — click to use`;
      if (favorites.has(id)) button.classList.add('is-favorite');
      const image = document.createElement('img');
      image.alt = '';
      image.width = 32;
      image.height = 32;
      image.dataset.cursorId = id;
      image.draggable = false;
      button.appendChild(image);
      fragment.appendChild(button);
      images.push(image);
    }
    grid.appendChild(fragment);
    if (typeof IntersectionObserver === 'function') {
      const watch = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          watch.unobserve(entry.target);
          previewInto(entry.target);
        }
      }, { root: grid, rootMargin: '150px' });
      observer = watch;
      images.forEach(image => watch.observe(image));
    } else images.forEach(previewInto);
  }

  function syncSelection() {
    grid.querySelectorAll('.cursor-mania-choice').forEach(button => {
      button.setAttribute('aria-selected', String(button.dataset.cursorId === currentId));
    });
    favorite.disabled = !currentId;
    favorite.setAttribute('aria-pressed', String(Boolean(currentId && favorites.has(currentId))));
    favorite.textContent = currentId && favorites.has(currentId) ? '★ Favorited' : '☆ Favorite';
    copy.disabled = !currentPng;
  }

  function makeRow(node, child = false) {
    const row = document.createElement('div');
    row.className = `cursor-mania-tree-row${child ? ' child' : ''}`;
    if (node.c?.length) {
      const expander = document.createElement('button');
      expander.type = 'button';
      expander.className = 'cursor-mania-tree-expander';
      expander.textContent = '+';
      expander.setAttribute('aria-label', `Expand ${node.n}`);
      expander.setAttribute('aria-expanded', 'false');
      expander.addEventListener('click', () => toggleCategory(node.k));
      row.appendChild(expander);
    } else {
      const spacer = document.createElement('span');
      spacer.className = 'cursor-mania-tree-spacer';
      row.appendChild(spacer);
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cursor-mania-category';
    button.textContent = node.n;
    button.title = `${node.n} — ${node.i.length.toLocaleString()} cursors`;
    button.setAttribute('aria-current', 'false');
    button.addEventListener('click', () => selectCategory(node.k));
    row.appendChild(button);
    categoryButtons.set(node.k, button);
    return row;
  }

  function buildTree() {
    tree.replaceChildren();
    tree.appendChild(makeRow({ n: 'Favorites', k: 'favorites', i: [], c: [] }));
    for (const top of catalog.cats) {
      categories.set(top.k, top);
      const section = document.createElement('div');
      section.className = 'cursor-mania-tree-node';
      section.appendChild(makeRow(top));
      const children = document.createElement('div');
      children.className = 'cursor-mania-children';
      children.hidden = true;
      parents.set(top.k, { row: section.firstElementChild, container: children });
      for (const child of top.c || []) {
        categories.set(child.k, child);
        children.appendChild(makeRow(child, true));
      }
      section.appendChild(children);
      tree.appendChild(section);
    }
    selectCategory('most-popular');
  }

  function toggleCategory(key, force) {
    const item = parents.get(key);
    if (!item) return;
    const open = force === undefined ? !expanded.has(key) : force;
    if (open) expanded.add(key);
    else expanded.delete(key);
    item.container.hidden = !open;
    const expander = item.row.querySelector('.cursor-mania-tree-expander');
    if (expander) {
      expander.textContent = open ? '−' : '+';
      expander.setAttribute('aria-expanded', String(open));
      expander.setAttribute('aria-label', `${open ? 'Collapse' : 'Expand'} ${categories.get(key).n}`);
    }
  }

  function selectCategory(key) {
    const ids = key === 'favorites' ? [...favorites] : categories.get(key)?.i;
    if (!ids) return;
    activeCategory = key;
    for (const [name, button] of categoryButtons) button.setAttribute('aria-current', String(name === key));
    renderGallery(ids);
  }

  async function makeCursorPng(id) {
    const entry = catalog.c[id];
    const size = catalog.size;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is unavailable.');
    context.imageSmoothingEnabled = false;
    if (typeof DecompressionStream === 'function') {
      const compressed = await range(frames, entry[3], entry[4]);
      const decoded = await new Response(new Blob([compressed]).stream()
        .pipeThrough(new DecompressionStream('deflate'))).arrayBuffer();
      if (decoded.byteLength < size * size * 4) throw new Error('Incomplete cursor frame.');
      const image = new ImageData(new Uint8ClampedArray(decoded.slice(0, size * size * 4)), size, size);
      context.putImageData(image, 0, 0);
    } else {
      const image = new Image();
      image.src = await previewFor(id);
      await image.decode();
      context.drawImage(image, 0, 0, size, size);
    }
    return canvas.toDataURL('image/png');
  }

  async function applyCursor(id) {
    if (!catalog?.c[id]) return;
    const sequence = ++selectionNumber;
    setStatus(`Loading ${id}…`);
    try {
      const png = await makeCursorPng(id);
      if (sequence !== selectionNumber) return;
      const entry = catalog.c[id];
      const cursor = `url("${png}") ${entry[6]} ${entry[7]}, auto`;
      document.documentElement.style.setProperty('--cursorphreak-cursor', cursor);
      document.documentElement.classList.add('cursorphreak-active');
      currentId = id;
      currentPng = png;
      code.value = `html, html body, html body * {\n  cursor: ${cursor} !important;\n}`;
      setStatus(`Cursor ${id} selected`);
      syncSelection();
      previewFor(id).then(url => { if (currentId === id) currentPreview.src = url; })
        .catch(() => { /* Applying works even if its animated preview is unavailable. */ });
    } catch (error) {
      if (sequence === selectionNumber) setStatus(`Cursor unavailable: ${error.message}`);
    }
  }

  function restoreDefault() {
    ++selectionNumber;
    currentId = null;
    currentPng = '';
    document.documentElement.classList.remove('cursorphreak-active');
    document.documentElement.style.removeProperty('--cursorphreak-cursor');
    currentPreview.removeAttribute('src');
    code.value = '';
    setStatus('Normal cursor restored.');
    syncSelection();
  }

  function toggleFavorite() {
    if (!currentId) return;
    if (favorites.has(currentId)) favorites.delete(currentId);
    else favorites.add(currentId);
    grid.querySelectorAll('.cursor-mania-choice').forEach(button => {
      button.classList.toggle('is-favorite', favorites.has(button.dataset.cursorId));
    });
    if (activeCategory === 'favorites') selectCategory('favorites');
    syncSelection();
  }

  async function copyText(value, label) {
    try {
      await navigator.clipboard.writeText(value);
      setStatus(`${label} copied!`);
    } catch {
      setStatus('Copy unavailable; select the text manually.');
      code.focus();
      code.select();
    }
  }

  async function loadCatalog() {
    if (catalogPromise) return catalogPromise;
    catalogPromise = (async () => {
      const response = await fetch(`${source}catalog.json`);
      if (!response.ok) throw new Error(`Archive returned HTTP ${response.status}.`);
      const data = await response.json();
      const total = Object.keys(data.c || {}).length;
      if (total !== 11145 || !Array.isArray(data.cats)) throw new Error('Incomplete cursor catalog.');
      catalog = data;
      count.textContent = `${total.toLocaleString()} cursors · ${data.cats.length} categories`;
      buildTree();
    })().catch(error => {
      count.textContent = 'Cursor library unavailable';
      tree.textContent = 'Could not load categories.';
      grid.textContent = `Could not load archive: ${error.message}`;
      setStatus('Try reopening Cursor Mania later.');
      catalogPromise = null;
      throw error;
    });
    return catalogPromise;
  }

  grid.addEventListener('click', event => {
    const button = event.target.closest('.cursor-mania-choice[data-cursor-id]');
    if (button) applyCursor(button.dataset.cursorId);
  });
  launcher.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('xp:open-window', { detail: { window: 'cursor-mania' } }));
    loadCatalog().catch(() => { /* Error is displayed in the window. */ });
  });
  reset.addEventListener('click', restoreDefault);
  favorite.addEventListener('click', toggleFavorite);
  copy.addEventListener('click', () => { if (code.value) copyText(code.value, 'CSS'); });
  newButton?.addEventListener('click', () => {
    if (!catalog) return;
    toggleCategory('most-popular', true);
    selectCategory('most-popular-new-featured');
  });
  share?.addEventListener('click', () => copyText(window.location.href, 'Website link'));
  el('cursor-mania-help-button')?.addEventListener('click', () => { help.hidden = false; });
  el('cursor-mania-help-close')?.addEventListener('click', () => { help.hidden = true; });
  window.addEventListener('pagehide', () => {
    observer?.disconnect();
    for (const url of previewCache.values()) URL.revokeObjectURL(url);
  });
})();
