// Original single-room SWF via self-hosted Ruffle. No gameplay backend.
(function () {
  const mount = document.getElementById('coffee-player');
  const status = document.getElementById('cp-loading');
  const fullscreen = document.getElementById('cp-fullscreen');
  if (!mount || !status) return;

  if (new URLSearchParams(window.location.search).get('fullscreen') === '1') {
    document.body.classList.add('cp-full-tab');
  }

  function error(message) {
    status.hidden = false;
    status.textContent = message;
  }

  try {
    const ruffle = window.RufflePlayer?.newest?.();
    if (!ruffle) throw new Error('Ruffle was not bundled with this page');
    const player = ruffle.createPlayer();
    player.setAttribute('aria-label', 'Original Club Penguin Coffee Shop 2010');
    mount.appendChild(player);
    Promise.resolve(player.ruffle().load({
      url: '/assets/clubpenguin/coffee.swf',
      allowScriptAccess: false,
      autoplay: 'on',
      unmuteOverlay: 'hidden',
      letterbox: 'on',
      scale: 'showAll',
      forceScale: true,
      quality: 'high',
      // Mobile Safari treats sustained touches as right-clicks otherwise.
      contextMenu: 'off',
    }))
      .then(() => { status.hidden = true; })
      .catch(() => error('Coffee Shop could not load. Check /assets/clubpenguin/coffee.swf.'));
  } catch (e) {
    console.error('Club Penguin Ruffle startup:', e);
    error('The local Flash emulator is unavailable. Please try again after deployment finishes.');
  }

  function labelFullscreen() {
    if (fullscreen) fullscreen.textContent = document.fullscreenElement ? '✕ EXIT FULLSCREEN' : '⛶ FULLSCREEN';
  }
  fullscreen?.addEventListener('click', async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen?.();
    } else {
      try { await document.documentElement.requestFullscreen?.(); }
      catch (e) { console.info('Browser fullscreen unavailable:', e.message); }
    }
    labelFullscreen();
  });
  document.addEventListener('fullscreenchange', labelFullscreen);
})();
