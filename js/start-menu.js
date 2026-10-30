// Windows XP Start menu and on-demand desktop app launching.
(function () {
  const start = document.getElementById('xp-start-button');
  const startLabel = document.getElementById('xp-start-label');
  const menu = document.getElementById('xp-start-menu');
  const chefFrame = document.getElementById('cyberchef-frame');
  const chefLoading = document.getElementById('cyberchef-loading');
  const skyFrame = document.getElementById('stellarium-frame');
  const skyLoading = document.getElementById('stellarium-loading');
  const hackButton = document.getElementById('xp-hack-planet');
  const hackOverlay = document.getElementById('xp-hack-video-overlay');
  const hackVideo = document.getElementById('xp-hack-video');
  const hackClose = document.getElementById('xp-hack-video-close');
  if (!start || !menu) return;
  let contactScriptRequested = false;
  const onDemandApps = {
    blackjack: new URL('./blackjack.mjs?v=20261029-1', document.currentScript.src).href,
    solitaire: new URL('./solitaire.mjs?v=20261029-2', document.currentScript.src).href,
    chess: new URL('./chess-game.mjs?v=20261029-1', document.currentScript.src).href,
    'unit-converter': new URL('./unit-converter.mjs?v=20261030-catalog', document.currentScript.src).href,
    'graph-calculator': new URL('./graph-calculator.mjs?v=20261029-1', document.currentScript.src).href,
    'fractal-explorer': new URL('./fractal-explorer.mjs?v=20261030-koch3', document.currentScript.src).href,
    'wikipedia-featured': new URL('./wikipedia-featured.mjs?v=20261030-1', document.currentScript.src).href,
    news: new URL('./news.mjs?v=20261030-1', document.currentScript.src).href,
  };
  const loadedApps = new Set();
  let openedOnce = false;
  // The short "Dry fart" sound from the Archive.org Fart Sounds collection.
  // Playing directly inside the click handler satisfies iOS audio gesture rules.
  const fartAudio = typeof Audio === 'function'
    ? new Audio('https://archive.org/download/fart-with-reverb/dry-fart.mp3')
    : null;
  if (fartAudio) {
    fartAudio.preload = 'auto';
    fartAudio.volume = 0.9;
  }

  function playFart() {
    if (!fartAudio) return;
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
  // Start audio on the actual button click, which grants playback on iOS too.
  // The fixed overlay fills the viewport if a browser doesn't support the
  // Fullscreen API for arbitrary elements (notably some Safari versions).
  const hackVideoUrl = new URL('../assets/hack-the-planet.mp4?v=20261030', document.currentScript.src).href;
  let hackOpen = false;
  let enteredFullscreen = false;
  function closeHackVideo() {
    if (!hackOpen || !hackOverlay || !hackVideo) return;
    hackOpen = false;
    hackVideo.pause();
    hackVideo.removeAttribute('src');
    hackVideo.load();
    hackVideo.controls = false;
    hackOverlay.hidden = true;
    if (document.fullscreenElement === hackOverlay) document.exitFullscreen?.().catch(() => {});
    enteredFullscreen = false;
    document.dispatchEvent(new CustomEvent('xp:hack-playback-stop'));
  }
  hackButton?.addEventListener('click', () => {
    showMenu(false);
    if (!hackOverlay || !hackVideo) return;
    closeHackVideo();
    hackOverlay.hidden = false;
    hackOpen = true;
    hackVideo.src = hackVideoUrl;
    hackVideo.muted = false;
    hackVideo.volume = 1;
    document.dispatchEvent(new CustomEvent('xp:hack-playback-start'));
    // Do not await either promise: both must be initiated within the gesture.
    const playback = hackVideo.play();
    playback?.catch(error => {
      console.warn('Hack the Planet autoplay needs a tap:', error);
      if (hackOpen) hackVideo.controls = true;
    });
    if (typeof hackOverlay.requestFullscreen === 'function') {
      const request = hackOverlay.requestFullscreen();
      request?.then(() => {
        enteredFullscreen = true;
      }).catch(() => {});
    } else if (typeof hackVideo.webkitEnterFullscreen === 'function') {
      // iPhone Safari can fullscreen the video even when it cannot fullscreen
      // the surrounding overlay. The overlay remains a fullscreen fallback.
      try { hackVideo.webkitEnterFullscreen(); } catch { /* Use viewport overlay. */ }
    }
  });
  hackVideo?.addEventListener('ended', closeHackVideo);
  hackVideo?.addEventListener('error', closeHackVideo);
  hackVideo?.addEventListener('webkitendfullscreen', closeHackVideo);
  hackClose?.addEventListener('click', closeHackVideo);
  hackOverlay?.addEventListener('click', event => {
    if (event.target === hackOverlay) closeHackVideo();
  });
  document.addEventListener('fullscreenchange', () => {
    if (hackOpen && enteredFullscreen && document.fullscreenElement !== hackOverlay) closeHackVideo();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && hackOpen) closeHackVideo();
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
