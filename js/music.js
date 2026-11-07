// Background music is streamed from Internet Archive, not copied into this repo.
// Music is opt-in on every visit; the tray or Credits button starts it.
(function () {
  const track = 'https://archive.org/download/super-mario-64-soundtrack/Super%20Mario%2064%20%28Soundtrack%29/1-18%20File%20Select.mp3';
  const trayButton = document.getElementById('xp-music-toggle');
  const creditsButton = document.getElementById('credits-music-toggle');
  const status = document.getElementById('credits-music-status');
  if (!trayButton || !creditsButton) return;

  const audio = new Audio();
  audio.loop = true;
  audio.volume = 0.18;
  audio.preload = 'none';

  let enabled = false;
  const activeVideos = new Set();
  let failure = '';

  function refresh() {
    trayButton.textContent = enabled ? '♫' : '♪';
    trayButton.setAttribute('aria-pressed', String(enabled));
    trayButton.setAttribute('aria-label', enabled ? 'Mute background music' : 'Play background music');
    trayButton.title = enabled ? 'Mute music' : 'Play music';
    creditsButton.textContent = enabled ? 'Mute music' : 'Play music';
    creditsButton.setAttribute('aria-pressed', String(enabled));
    if (status) {
      status.textContent = !enabled ? 'Music is off.' : activeVideos.has('kali') ? 'Paused for Kali soundtrack.' : activeVideos.size ? 'Paused while a video plays.' : failure ||
        (audio.paused ? 'Music will start after a tap if autoplay is blocked.' : 'Playing on repeat.');
    }
  }

  function tryPlay() {
    if (!enabled || activeVideos.size || !audio.paused) return;
    if (!audio.src) audio.src = track;
    failure = '';
    const playback = audio.play();
    if (playback && typeof playback.then === 'function') {
      playback.then(() => {
        failure = '';
        refresh();
      }).catch(error => {
        if (!enabled || activeVideos.size) return;
        failure = error.name === 'NotAllowedError'
          ? 'Tap anywhere on the page to start the music.'
          : 'The Archive.org music stream is unavailable right now.';
        refresh();
      });
    }
    refresh();
  }

  function toggleMusic() {
    enabled = !enabled;
    if (enabled) tryPlay();
    else { audio.pause(); failure = ''; }
    refresh();
  }

  function retryAfterInteraction(event) {
    if (!enabled || activeVideos.size || !audio.paused) return;
    if (event.target instanceof Element && event.target.closest('#xp-music-toggle, #credits-music-toggle, #xp-hack-planet')) return;
    tryPlay();
  }

  trayButton.addEventListener('click', toggleMusic);
  creditsButton.addEventListener('click', toggleMusic);
  for (const kind of ['happy', 'hack', 'huh', 'floppa', 'kali', 'slots']) {
    document.addEventListener(`xp:${kind}-playback-start`, () => {
      activeVideos.add(kind);
      audio.pause();
      refresh();
    });
    document.addEventListener(`xp:${kind}-playback-stop`, () => {
      if (!activeVideos.delete(kind)) return;
      if (enabled) tryPlay();
      refresh();
    });
  }
  // The game has its own audio. Do not mix the SM64 menu music into DOOM.
  document.addEventListener('xp:window-opened', event => {
    if (event.detail?.window !== 'doom') return;
    activeVideos.add('doom');
    audio.pause();
    refresh();
  });
  document.addEventListener('xp:closed', event => {
    if (event.detail?.window !== 'doom' || !activeVideos.delete('doom')) return;
    if (enabled) tryPlay();
    refresh();
  });
  document.addEventListener('click', retryAfterInteraction, { capture: true });
  document.addEventListener('keydown', retryAfterInteraction, { capture: true });
  audio.addEventListener('error', () => {
    failure = 'The Archive.org music stream is unavailable right now.';
    refresh();
  });
  refresh();
})();
