// Desktop XP window manager: draggable title bars, resizable corners, stacking,
// and locally saved positions. Narrow screens keep the original stacked layout.
(function () {
  const windows = [...document.querySelectorAll('.hn-panel, .intel-panel, .apod-panel, .office-panel')];
  if (!windows.length) return;

  const desktop = window.matchMedia('(min-width: 1051px)');
  const storageKey = 'jordanhardee-xp-windows-v1';
  const headerSelector = '.hn-header, .intel-header, .apod-header, .office-header';
  const minWidth = 245;
  const minHeight = 185;
  const taskbarHeight = 38;
  let active = null;
  let highestLayer = 30;
  let saved = {};

  try {
    const previous = JSON.parse(window.localStorage.getItem(storageKey) || '{}');
    if (previous && typeof previous === 'object' && !Array.isArray(previous)) saved = previous;
  } catch { /* Local storage can be disabled in private browsing. */ }

  function numberOr(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), Math.max(min, max));
  }

  function defaultRect(module) {
    const sidebar = module.parentElement;
    const bounds = sidebar.getBoundingClientRect();
    const styles = window.getComputedStyle(sidebar);
    const paddingLeft = parseFloat(styles.paddingLeft) || 0;
    const paddingRight = parseFloat(styles.paddingRight) || 0;
    const paddingTop = parseFloat(styles.paddingTop) || 0;
    const paddingBottom = parseFloat(styles.paddingBottom) || 0;
    const gap = parseFloat(styles.gap) || 0;
    const siblings = windows.filter(item => item.parentElement === sidebar);
    const index = siblings.indexOf(module);
    const height = (bounds.height - paddingTop - paddingBottom - gap * (siblings.length - 1)) / siblings.length;
    return {
      left: bounds.left + paddingLeft,
      top: bounds.top + paddingTop + index * (height + gap),
      width: bounds.width - paddingLeft - paddingRight,
      height,
    };
  }

  function boundedRect(rect) {
    const usableHeight = Math.max(minHeight, window.innerHeight - taskbarHeight - 5);
    const width = clamp(numberOr(rect.width, minWidth), minWidth, window.innerWidth - 8);
    const height = clamp(numberOr(rect.height, minHeight), minHeight, usableHeight);
    return {
      left: clamp(numberOr(rect.left, 0), 0, window.innerWidth - width),
      top: clamp(numberOr(rect.top, 0), 0, usableHeight - height),
      width, height,
    };
  }

  function setRect(module, rect) {
    const next = boundedRect(rect);
    for (const property of ['left', 'top', 'width', 'height']) {
      module.style[property] = `${next[property]}px`;
    }
  }

  function currentRect(module) {
    const rect = module.getBoundingClientRect();
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  }

  function remember(module) {
    saved[module.dataset.window] = currentRect(module);
    try { window.localStorage.setItem(storageKey, JSON.stringify(saved)); }
    catch { /* Drag and resize still work without persistence. */ }
  }

  function front(module) {
    if (desktop.matches && module.classList.contains('xp-floating-window')) {
      module.style.zIndex = String(++highestLayer);
    }
  }

  function enableDesktop() {
    if (windows[0].classList.contains('xp-floating-window')) return;
    windows.forEach(module => {
      const initial = defaultRect(module);
      const previous = saved[module.dataset.window];
      module.classList.add('xp-floating-window');
      setRect(module, previous && typeof previous === 'object' ? {
        left: numberOr(previous.left, initial.left),
        top: numberOr(previous.top, initial.top),
        width: numberOr(previous.width, initial.width),
        height: numberOr(previous.height, initial.height),
      } : initial);
      front(module);
    });
  }

  function disableDesktop() {
    active = null;
    windows.forEach(module => {
      module.classList.remove('xp-floating-window', 'xp-is-dragging');
      for (const property of ['left', 'top', 'width', 'height', 'zIndex']) {
        module.style[property] = '';
      }
    });
  }

  function fitViewport() {
    if (!desktop.matches) {
      disableDesktop();
      return;
    }
    if (!windows[0].classList.contains('xp-floating-window')) {
      enableDesktop();
      return;
    }
    for (const module of windows) {
      if (document.fullscreenElement === module || module.classList.contains('module-is-expanded')) continue;
      // Undragged windows stay in their sidebar columns as the viewport changes;
      // user-positioned windows retain their coordinates, constrained onscreen.
      setRect(module, saved[module.dataset.window] ? currentRect(module) : defaultRect(module));
    }
  }

  function begin(event, module, kind, handle) {
    if (!desktop.matches || event.button !== 0 || document.fullscreenElement === module || module.classList.contains('module-is-expanded')) return;
    if (kind === 'move' && event.target.closest('button, a, .xp-window-controls')) return;
    event.preventDefault();
    front(module);
    active = {
      module, kind, handle, pointerId: event.pointerId,
      x: event.clientX, y: event.clientY,
      rect: currentRect(module),
    };
    module.classList.add('xp-is-dragging');
    try { handle.setPointerCapture(event.pointerId); } catch { /* Window listeners also handle the gesture. */ }
  }

  function move(event) {
    if (!active || event.pointerId !== active.pointerId) return;
    const dx = event.clientX - active.x;
    const dy = event.clientY - active.y;
    const rect = { ...active.rect };
    if (active.kind === 'move') {
      rect.left += dx;
      rect.top += dy;
    } else {
      rect.width += dx;
      rect.height += dy;
    }
    setRect(active.module, rect);
  }

  function finish(event) {
    if (!active || event.pointerId !== active.pointerId) return;
    const { module, handle, pointerId } = active;
    active = null;
    module.classList.remove('xp-is-dragging');
    try { if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId); }
    catch { /* Already released. */ }
    remember(module);
  }

  const names = {
    'hacker-news': 'Hacker News',
    'threat-intel': 'Cyber Threat Wire',
    'nasa-apod': 'NASA APOD',
    'daily-office': 'Daily Office',
  };
  windows.forEach(module => {
    const header = module.querySelector(headerSelector);
    const grip = document.createElement('span');
    grip.className = 'xp-resize-grip';
    grip.setAttribute('role', 'button');
    grip.setAttribute('tabindex', '0');
    grip.setAttribute('aria-label', `Resize ${names[module.dataset.window]} using arrow keys`);
    grip.title = 'Drag to resize, or use arrow keys';
    module.appendChild(grip);

    header?.addEventListener('pointerdown', event => begin(event, module, 'move', header));
    grip.addEventListener('pointerdown', event => begin(event, module, 'resize', grip));
    grip.addEventListener('keydown', event => {
      if (!desktop.matches || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      front(module);
      const rect = currentRect(module);
      const step = event.shiftKey ? 40 : 15;
      if (event.key === 'ArrowRight') rect.width += step;
      if (event.key === 'ArrowLeft') rect.width -= step;
      if (event.key === 'ArrowDown') rect.height += step;
      if (event.key === 'ArrowUp') rect.height -= step;
      setRect(module, rect);
      remember(module);
    });
    module.addEventListener('pointerdown', () => front(module));
  });

  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', finish);
  window.addEventListener('pointercancel', finish);
  window.addEventListener('resize', fitViewport);
  fitViewport();
})();
