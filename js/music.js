// Background music is streamed from Internet Archive, not copied into this repo.
// Browser autoplay rules apply: retry after a visitor's first interaction.
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

  const preference = 'jordanhardee-background-music-v1';
  let enabled = true;
  let failure = '';
  try { enabled = localStorage.getItem(preference) !== 'off'; }
  catch { /* Site still works in private browsing. */ }

  function refresh() {
    trayButton.textContent = enabled ? '♫' : '♪';
    trayButton.setAttribute('aria-pressed', String(enabled));
    trayButton.setAttribute('aria-label', enabled ? 'Mute background music' : 'Play background music');
    trayButton.title = enabled ? 'Mute music' : 'Play music';
    creditsButton.textContent = enabled ? 'Mute music' : 'Play music';
    creditsButton.setAttribute('aria-pressed', String(enabled));
    if (status) {
      status.textContent = !enabled ? 'Music is off.' : failure ||
        (audio.paused ? 'Music will start after a tap if autoplay is blocked.' : 'Playing on repeat.');
    }
  }

  function tryPlay() {
    if (!enabled || !audio.paused) return;
    if (!audio.src) audio.src = track;
    failure = '';
    const playback = audio.play();
    if (playback && typeof playback.then === 'function') {
      playback.then(() => {
        failure = '';
        refresh();
      }).catch(error => {
        if (!enabled) return;
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
    try { localStorage.setItem(preference, enabled ? 'on' : 'off'); }
    catch { /* Preferences need not persist for the player to work. */ }
    if (enabled) tryPlay();
    else { audio.pause(); failure = ''; }
    refresh();
  }

  function retryAfterInteraction(event) {
    if (!enabled || !audio.paused) return;
    if (event.target instanceof Element && event.target.closest('#xp-music-toggle, #credits-music-toggle')) return;
    tryPlay();
  }

  trayButton.addEventListener('click', toggleMusic);
  creditsButton.addEventListener('click', toggleMusic);
  document.addEventListener('click', retryAfterInteraction, { capture: true });
  document.addEventListener('keydown', retryAfterInteraction, { capture: true });
  audio.addEventListener('error', () => {
    failure = 'The Archive.org music stream is unavailable right now.';
    refresh();
  });
  refresh();
  if (enabled) tryPlay();
})();
