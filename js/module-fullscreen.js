// Fullscreen modules use the browser's Fullscreen API where supported.
// iPhone Safari may reject arbitrary-element fullscreen, so provide a
// viewport-filling overlay with the same visible exit control instead.
(function () {
  const modules = [...document.querySelectorAll('.aquarium-display, .intel-panel, .hn-panel')];
  let overlay = null;

  function isExpanded(module) {
    return document.fullscreenElement === module || module.classList.contains('module-is-expanded');
  }

  function updateButtons() {
    modules.forEach(module => {
      const button = module.querySelector('.module-fullscreen-button');
      if (!button) return;
      const expanded = isExpanded(module);
      const name = module.classList.contains('aquarium-display') ? 'aquarium'
        : module.classList.contains('intel-panel') ? 'Cyber Threat Wire' : 'Hacker News';
      button.setAttribute('aria-label', `${expanded ? 'Exit' : 'Open'} ${name} fullscreen`);
      button.title = expanded ? `Exit fullscreen ${name}` : `Fullscreen ${name}`;
      button.textContent = module.classList.contains('aquarium-display')
        ? (expanded ? '×' : '⛶') : (expanded ? '❐' : '□');
    });
  }

  function closeOverlay() {
    if (!overlay) return;
    overlay.classList.remove('module-is-expanded');
    overlay = null;
    document.body.classList.remove('module-overlay-open');
    updateButtons();
  }

  async function toggle(module) {
    if (module.classList.contains('module-is-expanded')) {
      closeOverlay();
      return;
    }
    if (document.fullscreenElement === module) {
      try { await document.exitFullscreen(); } catch (error) {
        console.info('Could not exit native fullscreen:', error.message);
      }
      updateButtons();
      return;
    }

    closeOverlay();
    if (document.fullscreenElement && document.exitFullscreen) {
      try { await document.exitFullscreen(); } catch { /* Continue with overlay. */ }
    }
    if (document.fullscreenEnabled && typeof module.requestFullscreen === 'function') {
      try {
        await module.requestFullscreen();
        updateButtons();
        return;
      } catch (error) {
        console.info('Using fullscreen overlay:', error.message);
      }
    }
    overlay = module;
    module.classList.add('module-is-expanded');
    document.body.classList.add('module-overlay-open');
    updateButtons();
  }

  modules.forEach(module => {
    module.querySelector('.module-fullscreen-button')?.addEventListener('click', () => toggle(module));
  });
  document.addEventListener('fullscreenchange', updateButtons);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && overlay) closeOverlay();
  });
  updateButtons();
})();
