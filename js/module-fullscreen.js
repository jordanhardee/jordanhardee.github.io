// Fullscreen modules use the browser's Fullscreen API where supported.
// iPhone Safari may reject arbitrary-element fullscreen, so provide a
// viewport-filling overlay with the same visible exit control instead.
(function () {
  const modules = [...document.querySelectorAll('[data-window].intel-panel, [data-window].hn-panel, [data-window].apod-panel, [data-window].office-panel, [data-window].xp-app-window')];
  const taskButtons = new Map([...document.querySelectorAll('.xp-task-button')].map(button => [button.dataset.window, button]));
  const clock = document.getElementById('xp-clock');
  let overlay = null;

  function moduleName(module) {
    const names = {
      'threat-intel': 'Cyber Threat Wire',
      'hacker-news': 'Hacker News',
      'nasa-apod': 'NASA APOD',
      'daily-office': 'Daily Office',
      'cyberchef': 'CyberChef.exe',
      'contact': 'Contact.exe'
    };
    return names[module.dataset.window] || 'Window';
  }

  function isExpanded(module) {
    return document.fullscreenElement === module || module.classList.contains('module-is-expanded');
  }

  function updateButtons() {
    modules.forEach(module => {
      const button = module.querySelector('.module-fullscreen-button');
      if (!button) return;
      const expanded = isExpanded(module);
      const name = moduleName(module);
      button.setAttribute('aria-label', `${expanded ? 'Exit' : 'Open'} ${name} fullscreen`);
      button.title = expanded ? `Exit fullscreen ${name}` : `Fullscreen ${name}`;
      button.textContent = expanded ? '❐' : '□';
      const task = taskButtons.get(module.dataset.window);
      if (task) {
        const minimized = module.classList.contains('module-minimized');
        const closed = module.classList.contains('module-closed');
        task.classList.toggle('module-task-hidden', closed);
        task.classList.toggle('is-open', !minimized);
        task.setAttribute('aria-pressed', String(!minimized));
        task.setAttribute('aria-label', `${minimized ? 'Restore' : 'Minimize'} ${name}`);
        task.title = `${minimized ? 'Restore' : 'Minimize'} ${name}`;
      }
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
    if (module.classList.contains('module-minimized')) restore(module);
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

  async function minimize(module) {
    if (overlay === module) closeOverlay();
    if (document.fullscreenElement === module && document.exitFullscreen) {
      try { await document.exitFullscreen(); } catch (error) {
        console.info('Could not exit fullscreen before minimizing:', error.message);
      }
    }
    module.classList.add('module-minimized');
    updateButtons();
  }

  function restore(module) {
    module.classList.remove('module-minimized');
    updateButtons();
    document.dispatchEvent(new CustomEvent('xp:bring-to-front', { detail: { window: module.dataset.window } }));
    if (window.matchMedia('(max-width: 1050px)').matches) {
      module.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }

  function openApp(module) {
    module.classList.remove('module-closed', 'module-minimized');
    const iframe = module.querySelector('iframe[data-src]');
    if (iframe && !iframe.getAttribute('src')) iframe.src = iframe.dataset.src;
    updateButtons();
    document.dispatchEvent(new CustomEvent('xp:bring-to-front', { detail: { window: module.dataset.window } }));
  }

  async function closeApp(module) {
    if (overlay === module) closeOverlay();
    if (document.fullscreenElement === module && document.exitFullscreen) {
      try { await document.exitFullscreen(); } catch { /* Continue closing. */ }
    }
    module.classList.remove('module-minimized');
    module.classList.add('module-closed');
    const iframe = module.querySelector('iframe[data-src]');
    if (iframe) iframe.removeAttribute('src');
    document.dispatchEvent(new CustomEvent('xp:closed', { detail: { window: module.dataset.window } }));
    updateButtons();
  }

  function refreshClock() {
    if (!clock) return;
    const now = new Date();
    clock.textContent = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    clock.dateTime = now.toISOString();
  }

  modules.forEach(module => {
    module.querySelector('.module-fullscreen-button')?.addEventListener('click', () => toggle(module));
    module.querySelector('.module-minimize-button')?.addEventListener('click', () => minimize(module));
    module.querySelector('.module-close-button')?.addEventListener('click', () => closeApp(module));
    taskButtons.get(module.dataset.window)?.addEventListener('click', () => {
      if (module.classList.contains('module-closed')) openApp(module);
      else if (module.classList.contains('module-minimized')) restore(module);
      else minimize(module);
    });
  });
  document.addEventListener('xp:open-window', event => {
    const module = modules.find(item => item.dataset.window === event.detail?.window);
    if (module) openApp(module);
  });
  document.addEventListener('fullscreenchange', updateButtons);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && overlay) closeOverlay();
  });
  refreshClock();
  window.setInterval(refreshClock, 30000);
  updateButtons();
})();
