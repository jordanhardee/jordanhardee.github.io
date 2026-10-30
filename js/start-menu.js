// Windows XP Start menu and on-demand desktop app launching.
(function () {
  const start = document.getElementById('xp-start-button');
  const menu = document.getElementById('xp-start-menu');
  const chefFrame = document.getElementById('cyberchef-frame');
  const chefLoading = document.getElementById('cyberchef-loading');
  if (!start || !menu) return;
  let contactScriptRequested = false;
  const onDemandApps = {
    blackjack: new URL('./blackjack.mjs?v=20261029-1', document.currentScript.src).href,
    solitaire: new URL('./solitaire.mjs?v=20261029-2', document.currentScript.src).href,
    chess: new URL('./chess-game.mjs?v=20261029-1', document.currentScript.src).href,
    'unit-converter': new URL('./unit-converter.mjs?v=20261030-catalog', document.currentScript.src).href,
    'graph-calculator': new URL('./graph-calculator.mjs?v=20261029-1', document.currentScript.src).href,
    'fractal-explorer': new URL('./fractal-explorer.mjs?v=20261030-1', document.currentScript.src).href,
  };
  const loadedApps = new Set();
  let soundContext;

  // A tiny original, synthesized raspberry. Create the audio engine only from
  // the Start button's click gesture (necessary for iOS Safari audio playback).
  function playFart() {
    const AudioEngine = window.AudioContext || window.webkitAudioContext;
    if (!AudioEngine) return;
    try {
      if (!soundContext) soundContext = new AudioEngine();
      if (soundContext.state === 'suspended') {
        soundContext.resume().catch(() => {});
      }

      const duration = .57;
      const sampleRate = soundContext.sampleRate;
      const buffer = soundContext.createBuffer(1, Math.round(duration * sampleRate), sampleRate);
      const samples = buffer.getChannelData(0);
      let phase = 0;
      let rumble = 0;
      for (let i = 0; i < samples.length; i++) {
        const t = i / sampleRate;
        const progress = t / duration;
        const frequency = 104 - 64 * progress + 16 * Math.sin(t * 43);
        phase += 2 * Math.PI * frequency / sampleRate;
        rumble = .89 * rumble + .11 * (Math.random() * 2 - 1);
        const flutter = .68 + .32 * Math.sin(2 * Math.PI * 19 * t);
        const envelope = Math.pow(Math.sin(Math.PI * progress), .7);
        samples[i] = (Math.sin(phase) * .47 + Math.sin(phase * 2) * .17 + rumble * .75)
          * flutter * envelope;
      }

      const source = soundContext.createBufferSource();
      const filter = soundContext.createBiquadFilter();
      const volume = soundContext.createGain();
      const now = soundContext.currentTime;
      source.buffer = buffer;
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(620, now);
      filter.frequency.exponentialRampToValueAtTime(160, now + duration);
      volume.gain.value = .25;
      source.connect(filter);
      filter.connect(volume);
      volume.connect(soundContext.destination);
      source.start(now);
    } catch (error) {
      console.warn('Fart button sound unavailable:', error);
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
    if (opening) playFart();
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
  document.addEventListener('xp:closed', event => {
    if (event.detail?.window === 'cyberchef' && chefLoading) chefLoading.hidden = false;
  });
})();
