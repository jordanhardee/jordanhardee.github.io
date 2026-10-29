// Each XP app has independent, bounded text zoom. The external Daily Office
// and CyberChef pages are cross-origin: scale their iframe viewport instead
// of trying to change the contents of a page we do not own.
(function () {
  const storageKey = 'jordanhardee-window-text-scale-v1';
  const limits = { min: 0.75, max: 1.75, step: 0.125 };
  const modules = document.querySelectorAll('[data-window].hn-panel, [data-window].intel-panel, [data-window].apod-panel, [data-window].office-panel, [data-window].xp-app-window');
  let saved = {};
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || '{}');
    if (value && typeof value === 'object' && !Array.isArray(value)) saved = value;
  } catch { /* Resizing still works if local storage is unavailable. */ }

  function clamp(value) {
    return Math.max(limits.min, Math.min(limits.max, value));
  }

  function apply(module, scale) {
    module.style.setProperty('--xp-text-scale', String(scale));
    const frame = module.querySelector('#office-service-frame, #cyberchef-frame');
    if (frame) {
      frame.style.transformOrigin = 'top left';
      frame.style.transform = `scale(${scale})`;
      frame.style.width = `${100 / scale}%`;
      frame.style.height = `${100 / scale}%`;
    }
    const smaller = module.querySelector('.xp-text-decrease');
    const larger = module.querySelector('.xp-text-increase');
    if (smaller) smaller.disabled = scale <= limits.min;
    if (larger) larger.disabled = scale >= limits.max;
  }

  modules.forEach(module => {
    const id = module.dataset.window;
    let scale = Number(saved[id]);
    if (!Number.isFinite(scale) || scale === 0) scale = 1;
    scale = clamp(scale);
    apply(module, scale);
    for (const [selector, change] of [['.xp-text-decrease', -limits.step], ['.xp-text-increase', limits.step]]) {
      module.querySelector(selector)?.addEventListener('click', () => {
        scale = clamp(Math.round((scale + change) * 1000) / 1000);
        apply(module, scale);
        saved[id] = scale;
        try { localStorage.setItem(storageKey, JSON.stringify(saved)); }
        catch { /* The visual change is still applied. */ }
      });
    }
  });
})();
