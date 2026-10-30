// Windows XP Start menu and on-demand desktop app launching.
(function () {
  const start = document.getElementById('xp-start-button');
  const startLabel = document.getElementById('xp-start-label');
  const menu = document.getElementById('xp-start-menu');
  const chefFrame = document.getElementById('cyberchef-frame');
  const chefLoading = document.getElementById('cyberchef-loading');
  const skyFrame = document.getElementById('stellarium-frame');
  const skyLoading = document.getElementById('stellarium-loading');
  if (!start || !menu) return;
  let contactScriptRequested = false;
  const onDemandApps = {
    blackjack: new URL('./blackjack.mjs?v=20261029-1', document.currentScript.src).href,
    solitaire: new URL('./solitaire.mjs?v=20261029-2', document.currentScript.src).href,
    chess: new URL('./chess-game.mjs?v=20261029-1', document.currentScript.src).href,
    'unit-converter': new URL('./unit-converter.mjs?v=20261030-catalog', document.currentScript.src).href,
    'graph-calculator': new URL('./graph-calculator.mjs?v=20261029-1', document.currentScript.src).href,
    'fractal-explorer': new URL('./fractal-explorer.mjs?v=20261030-1', document.currentScript.src).href,
    'wikipedia-featured': new URL('./wikipedia-featured.mjs?v=20261030-1', document.currentScript.src).href,
    news: new URL('./news.mjs?v=20261030-1', document.currentScript.src).href,
  };
  const loadedApps = new Set();
  let openedOnce = false;
  // The short "Dry fart" sound from the Archive.org Fart Sounds collection.
  // Playing directly inside the click handler satisfies iOS audio gesture rules.
  const fartAudio = new Audio('https://archive.org/download/fart-with-reverb/dry-fart.mp3');
  fartAudio.preload = 'auto';
  fartAudio.volume = 0.9;

  function playFart() {
    try {
      fartAudio.pause();
      fartAudio.currentTime = 0;
      fartAudio.play().catch(error => {
        console.warn('Dry fart sound unavailable:', error);
      });
    } catch (error) {
      console.warn('Dry fart sound unavailable:', error);
    }
  }

  function loadContactOnDemand() {
    if (contactScriptRequested) return;
    contactScriptRequested = true;
    const script = document.createElement('script');
    script.src = 'js/contact.js?v=20261029-pgp-challenge2';
    script.onerror = () => {
      contactScriptRequested = false;
      console.error('Contact image could not load. Please reopen Contact.');
    };
    document.body.appendChild(script);
  }

  function showMenu(open) {
    menu.hidden = !open;
    start.setAttribute('aria-expanded', String(open));
  }

  start.addEventListener('click', () => {
    const opening = menu.hidden;
    if (opening) {
      playFart();
      if (!openedOnce) {
        openedOnce = true;
        if (startLabel) startLabel.textContent = 'fart';
        menu.setAttribute('aria-label', 'Windows XP Fart menu');
      }
    }
    showMenu(opening);
  });
  const folderButtons = Array.from(menu.querySelectorAll('[data-folder-toggle]'));
  folderButtons.forEach(button => {
    button.addEventListener('click', () => {
      const opening = button.getAttribute('aria-expanded') !== 'true';
      // Only one folder is expanded at once so the Start menu stays compact
      // on phones and doesn't make the visitor hunt through a long list.
      folderButtons.forEach(folder => {
        folder.setAttribute('aria-expanded', 'false');
        const contents = document.getElementById(folder.getAttribute('aria-controls'));
        if (contents) contents.hidden = true;
      });
      if (opening) {
        button.setAttribute('aria-expanded', 'true');
        const contents = document.getElementById(button.getAttribute('aria-controls'));
        if (contents) contents.hidden = false;
      }
    });
  });
  menu.querySelectorAll('[data-open-window]').forEach(button => {
    button.addEventListener('click', () => {
      showMenu(false);
      document.dispatchEvent(new CustomEvent('xp:open-window', {
        detail: { window: button.dataset.openWindow }
      }));
      if (button.dataset.openWindow === 'contact') loadContactOnDemand();
      const app = button.dataset.openWindow;
      if (onDemandApps[app] && !loadedApps.has(app)) {
        loadedApps.add(app);
        import(onDemandApps[app]).catch(error => {
          loadedApps.delete(app);
          console.error(`${app} could not start:`, error);
        });
      }
    });
  });
  menu.querySelectorAll('a.xp-external-link').forEach(link => {
    link.addEventListener('click', () => showMenu(false));
  });
  document.addEventListener('pointerdown', event => {
    if (!menu.hidden && !menu.contains(event.target) && !start.contains(event.target)) showMenu(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !menu.hidden) {
      showMenu(false);
      start.focus();
    }
  });

  // CyberChef downloads nothing until someone explicitly opens its window.
  chefFrame?.addEventListener('load', () => {
    if (chefLoading && chefFrame.getAttribute('src')) chefLoading.hidden = true;
  });
  skyFrame?.addEventListener('load', () => {
    if (skyLoading && skyFrame.getAttribute('src')) skyLoading.hidden = true;
  });
  document.addEventListener('xp:closed', event => {
    if (event.detail?.window === 'cyberchef' && chefLoading) chefLoading.hidden = false;
    if (event.detail?.window === 'stellarium' && skyLoading) skyLoading.hidden = false;
  });
})();
