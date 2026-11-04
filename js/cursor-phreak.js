// Web edition of the complete CursorPhreak cursor archive.
// Packed previews and frames are served with HTTP byte ranges from a pinned
// revision of Jordan's CursorPhreak GitHub repository.
// The active cursor resets on refresh; favorites alone may be saved in this browser.
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const launcher = $('ie-cursor-phreak'), tree = $('cursor-phreak-tree');
  const grid = $('cursor-phreak-grid'), status = $('cursor-phreak-status');
  const code = $('cursor-phreak-code'), image = $('cursor-phreak-current-img');
  const favoriteButton = $('cursor-phreak-favorite');
  if (!launcher || !tree || !grid || !code) return;
  const archiveRevision = 'c04b94cfeed1f12d6aa580ce7e8c669e4d671c02';
  const root = new URL(`https://raw.githubusercontent.com/jordanhardee/CursorPhreak/${archiveRevision}/assets/`);
  const packs = { 'previews.pak': {}, 'frames.pak': {} };
  const previews = new Map(), openKeys = new Set();
  const favoriteNode = { n: 'Favorites', k: 'favorites', i: [], c: [] };
  let cats = [], entries = {}, selectedKey = 'most-popular', selectedId = null;
  let snippets = null, format = 'css', loading = null, generation = 0;
  let animationTimer = null, observer = null;
  let favorites;
  try {
    const saved = JSON.parse(localStorage.getItem('cursor-phreak-favorites') || '[]');
    favorites = new Set(Array.isArray(saved) ? saved.map(String) : []);
  } catch { favorites = new Set(); }
  function say(message) { status.textContent = message; }

  // Range-unsupported servers return 200: cache that full response for later slices.
  // Only one probe can run at a time, preventing duplicate full-pack downloads.
  async function request(name, start, length) {
    const response = await fetch(new URL(name, root), { headers: { Range: `bytes=${start}-${start + length - 1}` } });
    if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
    const bytes = await response.arrayBuffer();
    if (response.status === 206) {
      // Cross-origin raw.githubusercontent.com does not expose Content-Range
      // to JS in every browser, even when the underlying 206 is correct.
      const contentRange = response.headers.get('Content-Range');
      if ((contentRange && !contentRange.startsWith(`bytes ${start}-${start + length - 1}/`)) || bytes.byteLength !== length)
        throw new Error(`${name}: invalid byte range`);
      return { bytes, partial: true };
    }
    if (response.status !== 200 || bytes.byteLength < start + length) throw new Error(`${name}: invalid archive response`);
    return { bytes, partial: false };
  }
  async function readRange(name, start, length) {
    const state = packs[name];
    if (state.whole) return state.whole.slice(start, start + length);
    if (!state.first) {
      state.first = request(name, start, length).then(({ bytes, partial }) => {
        if (!partial) state.whole = bytes;
        return { bytes: partial ? bytes : bytes.slice(start, start + length), start, length };
      }).catch(error => { state.first = null; throw error; });
      return (await state.first).bytes;
    }
    const first = await state.first;
    if (state.whole) return state.whole.slice(start, start + length);
    if (first.start === start && first.length === length) return first.bytes;
    return (await request(name, start, length)).bytes;
  }
  async function previewUrl(id) {
    if (previews.has(id)) return previews.get(id);
    const entry = entries[id];
    if (!entry) throw new Error(`Unknown cursor #${id}`);
    const bytes = await readRange('previews.pak', entry[0], entry[1]);
    const url = URL.createObjectURL(new Blob([bytes], { type: entry[2] === 0 ? 'image/gif' : 'image/png' }));
    previews.set(id, url);
    return url;
  }
  async function loadPreview(img, id) {
    try { const url = await previewUrl(id); if (img.isConnected) img.src = url; }
    catch { if (img.isConnected) img.alt = 'Preview unavailable'; }
  }

  function findNode(key) {
    for (const cat of cats) {
      if (cat.k === key) return cat;
      const child = cat.c.find(item => item.k === key);
      if (child) return child;
    }
    return null;
  }
  function makeRow(node, child) {
    const row = document.createElement('button');
    row.type = 'button'; row.className = 'cm-row'; row.dataset.key = node.k;
    row.setAttribute('role', 'treeitem');
    row.setAttribute('aria-selected', String(node.k === selectedKey));
    const icon = document.createElement('span');
    icon.className = node.c?.length ? 'cm-expand' : 'cm-tree-line';
    if (node.c?.length) {
      icon.textContent = openKeys.has(node.k) ? '−' : '+';
      row.setAttribute('aria-expanded', String(openKeys.has(node.k)));
    }
    icon.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.className = 'cm-label'; label.textContent = node.n;
    row.append(icon, label);
    row.addEventListener('click', event => {
      if (node.c?.length && event.target.classList.contains('cm-expand')) toggle(node.k);
      else selectCategory(node.k);
    });
    if (node.c?.length) row.addEventListener('dblclick', () => toggle(node.k));
    if (child) row.classList.add('cm-child-row');
    return row;
  }
  function buildTree() {
    tree.replaceChildren();
    for (const cat of cats) {
      const wrapper = document.createElement('div');
      wrapper.className = 'cm-node'; wrapper.dataset.key = cat.k;
      wrapper.appendChild(makeRow(cat, false));
      if (cat.c.length) {
        const children = document.createElement('div');
        children.className = 'cm-children'; children.hidden = !openKeys.has(cat.k);
        for (const item of cat.c) children.appendChild(makeRow(item, true));
        wrapper.appendChild(children);
      }
      tree.appendChild(wrapper);
    }
  }
  function toggle(key, force) {
    const wrapper = [...tree.querySelectorAll('.cm-node')].find(n => n.dataset.key === key);
    const children = wrapper?.querySelector('.cm-children');
    if (!children) return;
    const opening = force === undefined ? !openKeys.has(key) : force;
    if (opening) openKeys.add(key); else openKeys.delete(key);
    children.hidden = !opening;
    wrapper.querySelector('.cm-row').setAttribute('aria-expanded', String(opening));
    wrapper.querySelector('.cm-expand').textContent = opening ? '−' : '+';
    if (!opening && children.querySelector('.cm-row[aria-selected="true"]')) selectCategory(key);
  }
  function selectCategory(key) {
    const node = findNode(key);
    if (!node) return;
    selectedKey = key;
    for (const row of tree.querySelectorAll('.cm-row')) row.setAttribute('aria-selected', String(row.dataset.key === key));
    renderGrid(node.i);
  }
  function renderGrid(ids) {
    observer?.disconnect();
    grid.replaceChildren(); grid.scrollTop = 0;
    if (!ids.length) {
      const p = document.createElement('p'); p.className = 'cm-empty';
      p.textContent = selectedKey === 'favorites' ? 'No favorites yet. Pick a cursor and click Favorite.' : 'Choose a subcategory on the left.';
      grid.appendChild(p); return;
    }
    const fragment = document.createDocumentFragment();
    for (const rawId of ids) {
      const id = String(rawId);
      if (!entries[id]) continue;
      const cell = document.createElement('button');
      cell.type = 'button'; cell.className = 'cm-cell'; cell.dataset.id = id;
      cell.dataset.favorite = String(favorites.has(id));
      cell.setAttribute('role', 'option'); cell.setAttribute('aria-label', `Cursor ${id}`);
      cell.setAttribute('aria-selected', String(id === selectedId)); cell.title = `Cursor #${id}`;
      const img = document.createElement('img'); img.alt = ''; img.width = img.height = 32; img.draggable = false;
      cell.appendChild(img); fragment.appendChild(cell);
    }
    grid.appendChild(fragment);
    if ('IntersectionObserver' in window) {
      const activeObserver = new IntersectionObserver(changes => {
        for (const change of changes) if (change.isIntersecting) {
          activeObserver.unobserve(change.target);
          loadPreview(change.target.querySelector('img'), change.target.dataset.id);
        }
      }, { root: grid, rootMargin: '100px' });
      observer = activeObserver;
      for (const cell of grid.querySelectorAll('.cm-cell')) observer.observe(cell);
    } else {
      for (const cell of grid.querySelectorAll('.cm-cell')) loadPreview(cell.querySelector('img'), cell.dataset.id);
    }
  }

  // frames.pak holds zlib-deflated RGBA frames; canvas turns each into a PNG.
  // Animated GIF/.ani files cannot directly animate CSS cursor images in browsers.
  async function readCursor(id) {
    const entry = entries[id];
    if (typeof DecompressionStream !== 'function') throw new Error('Browser lacks DecompressionStream');
    const packed = await readRange('frames.pak', entry[3], entry[4]);
    const raw = new Uint8Array(await new Response(new Blob([packed]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer());
    const count = entry[5], size = 32 * 32 * 4;
    if (raw.length !== count * size) throw new Error('Corrupted cursor frames');
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 32;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas unavailable');
    const frames = [];
    for (let i = 0; i < count; i++) {
      const rgba = new Uint8ClampedArray(raw.slice(i * size, (i + 1) * size));
      context.putImageData(new ImageData(rgba, 32, 32), 0, 0);
      frames.push(canvas.toDataURL('image/png'));
    }
    return { id, frames, delays: entry[8], hx: entry[6], hy: entry[7] };
  }
  // Matches CursorPhreak's self-contained CSS/JS clipboard formats.
  function makeSnippets(cursor) {
    const { id, frames, delays, hx, hy } = cursor;
    const pointer = url => `url(${url}) ${hx} ${hy},auto`;
    const tag = `<!-- CursorPhreak cursor #${id} -->`;
    let css;
    if (frames.length === 1) {
      css = `<style type="text/css">html{cursor:${pointer(frames[0])}}html *{cursor:inherit!important}</style>${tag}`;
    } else {
      const total = delays.reduce((a, b) => a + b, 0);
      let elapsed = 0;
      const steps = frames.map((url, i) => {
        const percent = +((elapsed / total) * 100).toFixed(3);
        elapsed += delays[i]; return `${percent}%{cursor:${pointer(url)}}`;
      });
      steps.push(`100%{cursor:${pointer(frames[frames.length - 1])}}`);
      css = `<style type="text/css">@keyframes cphreak{${steps.join('')}}html{cursor:${pointer(frames[0])};animation:cphreak ${total}ms step-end infinite}html *{cursor:inherit!important}</style>${tag}`;
    }
    const unique = [...new Set(frames)], order = frames.map(url => unique.indexOf(url));
    const js = `<script>/* CursorPhreak cursor #${id} */(function(){` +
      `var f=${JSON.stringify(unique)},q=${JSON.stringify(order)},d=${JSON.stringify(delays)},i=0,s=document.createElement("style");` +
      `(document.head||document.documentElement).appendChild(s);` +
      `function n(){s.textContent="html,html *{cursor:url("+f[q[i]]+") ${hx} ${hy},auto!important}";` +
      `if(q.length>1){setTimeout(n,d[i]);i=(i+1)%q.length}}n()})();</script>`;
    return { css, js };
  }
  function stopAnimation() {
    if (animationTimer !== null) clearTimeout(animationTimer);
    animationTimer = null;
  }
  function useCursor(cursor) {
    stopAnimation();
    const { frames, delays, hx, hy } = cursor;
    document.documentElement.classList.add('cursorphreak-active');
    let index = 0;
    function tick() {
      const current = index;
      document.documentElement.style.setProperty('--cursorphreak-cursor', `url("${frames[current]}") ${hx} ${hy}, auto`);
      if (frames.length > 1) {
        index = (index + 1) % frames.length;
        animationTimer = setTimeout(tick, Math.max(16, delays[current] || 100));
      }
    }
    tick();
  }
  function updateSelection() {
    for (const cell of grid.querySelectorAll('.cm-cell')) {
      cell.setAttribute('aria-selected', String(cell.dataset.id === selectedId));
      cell.dataset.favorite = String(favorites.has(cell.dataset.id));
    }
    favoriteButton.disabled = !selectedId;
    favoriteButton.setAttribute('aria-pressed', String(!!selectedId && favorites.has(selectedId)));
    favoriteButton.textContent = selectedId && favorites.has(selectedId) ? '★ Favorite' : '☆ Favorite';
    code.value = snippets ? snippets[format] : '';
  }
  async function selectCursor(id) {
    const thisGeneration = ++generation;
    say(`Loading cursor #${id}…`);
    try {
      const cursor = await readCursor(id);
      if (thisGeneration !== generation) return;
      selectedId = id; snippets = makeSnippets(cursor);
      useCursor(cursor);
      image.hidden = false; image.removeAttribute('src');
      previewUrl(id).then(url => { if (selectedId === id) image.src = url; }).catch(() => {});
      updateSelection();
      say(`Cursor #${id} selected${cursor.frames.length > 1 ? ` · ${cursor.frames.length} animated frames` : ''} · refresh to reset`);
    } catch (error) {
      if (thisGeneration === generation) say(`Could not load cursor #${id}: ${error.message}`);
    }
  }
  function resetCursor() {
    ++generation; stopAnimation(); selectedId = null; snippets = null;
    image.hidden = true; image.removeAttribute('src');
    document.documentElement.classList.remove('cursorphreak-active');
    document.documentElement.style.removeProperty('--cursorphreak-cursor');
    updateSelection(); say('Default cursor restored.');
  }
  async function copy(text) {
    if (navigator.clipboard?.writeText) {
      try { await navigator.clipboard.writeText(text); return true; } catch { /* fallback */ }
    }
    const field = document.createElement('textarea');
    field.value = text;
    field.style.position = 'fixed'; field.style.left = '-9999px';
    document.body.appendChild(field); field.select();
    try { return document.execCommand('copy'); }
    catch { return false; }
    finally { field.remove(); }
  }
  async function copyFormat(next) {
    format = next;
    $('cursor-phreak-css').setAttribute('aria-pressed', String(format === 'css'));
    $('cursor-phreak-js').setAttribute('aria-pressed', String(format === 'js'));
    updateSelection();
    if (!snippets) { say('Pick a cursor before copying code.'); return; }
    say(await copy(code.value) ? `${format.toUpperCase()} code copied for cursor #${selectedId}.` : 'Select the code box and copy it manually.');
  }
  function dialog(title, message) {
    $('cursor-phreak-dialog-title').textContent = title;
    const body = $('cursor-phreak-dialog-text'); body.replaceChildren();
    for (const paragraph of message.split('\n')) {
      const p = document.createElement('p'); p.textContent = paragraph; body.appendChild(p);
    }
    $('cursor-phreak-dialog').hidden = false;
    $('cursor-phreak-dialog-ok').focus();
  }
  function loadCatalog() {
    if (loading) return loading;
    loading = fetch(new URL('catalog.json', root)).then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    }).then(data => {
      if (!Array.isArray(data.cats) || data.cats.length !== 23 || Object.keys(data.c || {}).length !== 11145)
        throw new Error('Incomplete CursorPhreak catalog');
      entries = data.c;
      favorites = new Set([...favorites].filter(id => entries[id]));
      favoriteNode.i = [...favorites]; cats = [favoriteNode, ...data.cats];
      buildTree(); selectCategory('most-popular');
      say(`${Object.keys(entries).length.toLocaleString()} cursors · selection lasts until refresh`);
    }).catch(error => {
      loading = null; tree.textContent = 'Could not load categories.';
      say(`Archive unavailable: ${error.message}. Click CursorPhreak to retry.`);
    });
    return loading;
  }

  launcher.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('xp:open-window', { detail: { window: 'cursor-phreak' } }));
    loadCatalog();
  });
  grid.addEventListener('click', event => {
    const cell = event.target.closest('.cm-cell');
    if (cell) selectCursor(cell.dataset.id);
  });
  tree.addEventListener('keydown', event => {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    const rows = [...tree.querySelectorAll('.cm-row')].filter(row => !row.closest('.cm-children[hidden]'));
    const index = rows.findIndex(row => row.dataset.key === selectedKey);
    if (event.key === 'ArrowDown' && index < rows.length - 1) selectCategory(rows[index + 1].dataset.key);
    else if (event.key === 'ArrowUp' && index > 0) selectCategory(rows[index - 1].dataset.key);
    else if (event.key === 'ArrowRight') toggle(selectedKey, true);
    else if (event.key === 'ArrowLeft') {
      const parent = cats.find(cat => cat.c.some(child => child.k === selectedKey));
      if (parent) selectCategory(parent.k); else toggle(selectedKey, false);
    }
    event.preventDefault();
  });
  $('cursor-phreak-reset').addEventListener('click', resetCursor);
  $('cursor-phreak-css').addEventListener('click', () => copyFormat('css'));
  $('cursor-phreak-js').addEventListener('click', () => copyFormat('js'));
  favoriteButton.addEventListener('click', () => {
    if (!selectedId) return;
    if (favorites.has(selectedId)) favorites.delete(selectedId); else favorites.add(selectedId);
    favoriteNode.i = [...favorites];
    try { localStorage.setItem('cursor-phreak-favorites', JSON.stringify(favoriteNode.i)); } catch { /* session fallback */ }
    if (selectedKey === 'favorites') renderGrid(favoriteNode.i);
    updateSelection();
  });
  $('cursor-phreak-new').addEventListener('click', () => dialog("What's New", `${Object.keys(entries).length.toLocaleString()} original cursors in the complete category tree, including animated pointers.\nUse CSS or JS to copy self-contained cursor code. Save favorites, or restore your default pointer at any time. Refreshing the page resets your pointer.`));
  $('cursor-phreak-help').addEventListener('click', () => dialog('Help & Feedback', 'Choose a category on the left, then a cursor on the right. Use + to expand subcategories. Click Favorite to save a cursor in this browser.\nYour pointer changes on this page until refresh or Default Cursor. Touch screens do not show a mouse pointer. Embedded third-party pages use their own pointers.\nCSS and JS buttons copy complete image-embedded code for blogs and websites. JS swaps animated frames on a timer; CSS uses keyframes. No toolbar or software is installed.\nSource: github.com/jordanhardee/CursorPhreak'));
  $('cursor-phreak-friend').addEventListener('click', async () => {
    const url = new URL('/', location.href).href;
    if (navigator.share) { try { await navigator.share({ title: 'CursorPhreak', url }); return; } catch { /* fallback */ } }
    say(await copy(url) ? 'Site link copied! Find CursorPhreak in Internet Explorer.' : `Share ${url}`);
  });
  $('cursor-phreak-dialog-ok').addEventListener('click', () => { $('cursor-phreak-dialog').hidden = true; });
  $('cursor-phreak-dialog').addEventListener('click', event => {
    if (event.target.id === 'cursor-phreak-dialog') $('cursor-phreak-dialog').hidden = true;
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') $('cursor-phreak-dialog').hidden = true; });
})();
