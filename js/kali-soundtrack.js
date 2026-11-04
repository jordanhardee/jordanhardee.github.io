// Nostalgia-only OpenSSH/Kali music cue. Never preload or copy this MP3:
// playback streams directly from the user-supplied Internet Archive URL.
// All other site-owned audio yields while this track is actually requested.
(function () {
  const panel = document.querySelector('[data-window="kali-terminal"]');
  const button = document.getElementById('kali-sound-toggle');
  const status = document.getElementById('kali-sound-status');
  if (!panel || !button || !status || typeof Audio !== 'function') return;

  const track = 'https://archive.org/download/prodigydisco_202004/The%20Prodigy/The%20Prodigy/1994%20-%20The%20Prodigy%20-%20Voodoo%20People/01.%20The%20Prodigy%20-%20Voodoo%20People.mp3';
  const audio = new Audio();
  audio.preload = 'none';
  audio.loop = false;
  audio.volume = 0.88;
  let ownsAudio = false;
  let playToken = 0;

  function tellEmbeddedGames(muted) {
    const origin = document.location?.origin;
    if (!origin) return;
    for (const frame of document.querySelectorAll('#doom-frame, #club-penguin-frame')) {
      frame.contentWindow?.postMessage({ type: 'xp:audio-focus', muted }, origin);
    }
  }
  // Games lazy-load their iframes. Keep them muted if one opens mid-track.
  for (const frame of document.querySelectorAll?.('#doom-frame, #club-penguin-frame') || []) {
    frame.addEventListener('load', () => { if (ownsAudio) tellEmbeddedGames(true); });
  }

  function show(label, action, pressed) {
    status.textContent = label;
    button.textContent = action;
    button.setAttribute('aria-label', pressed ? 'Mute Kali soundtrack' : 'Play Kali soundtrack');
    button.setAttribute('aria-pressed', String(pressed));
  }

  function takeAudioFocus() {
    if (ownsAudio) return;
    ownsAudio = true;
    document.dispatchEvent(new CustomEvent('xp:kali-playback-start', { detail: { window: 'kali-terminal' } }));
    tellEmbeddedGames(true);
  }

  function releaseAudioFocus() {
    if (!ownsAudio) return;
    ownsAudio = false;
    document.dispatchEvent(new CustomEvent('xp:kali-playback-stop', { detail: { window: 'kali-terminal' } }));
    tellEmbeddedGames(false);
  }

  function stop(reset = false) {
    ++playToken; // Invalidate a pending play() promise after close/minimize.
    audio.pause();
    if (reset) audio.currentTime = 0;
    releaseAudioFocus();
    show('VOODOO PEOPLE · AUDIO OFF', '▶ PLAY', false);
  }

  function play(restart = false) {
    if (panel.classList.contains('module-closed') || panel.classList.contains('module-minimized')) return;
    if (ownsAudio && !audio.paused) return;
    if (!audio.src) audio.src = track;
    if (restart || audio.ended) audio.currentTime = 0;
    const token = ++playToken;
    takeAudioFocus();
    show('VOODOO PEOPLE · LOADING…', '■ STOP', true);
    // Called synchronously from the OpenSSH / taskbar click for Safari audio activation.
    try {
      const result = audio.play();
      result?.then?.(() => {
        if (token === playToken) show('♫ VOODOO PEOPLE', '■ STOP', true);
      }).catch?.(error => {
        if (token !== playToken) return;
        releaseAudioFocus();
        show(error.name === 'NotAllowedError' ? 'TAP PLAY TO ENABLE SOUND' : 'AUDIO UNAVAILABLE · RETRY', '▶ PLAY', false);
      });
    } catch {
      releaseAudioFocus();
      show('AUDIO UNAVAILABLE · RETRY', '▶ PLAY', false);
    }
  }

  document.addEventListener('xp:window-opened', event => {
    if (event.detail?.window === 'kali-terminal') play(true);
  });
  document.addEventListener('xp:minimized', event => {
    if (event.detail?.window === 'kali-terminal') stop();
  });
  document.addEventListener('xp:restored', event => {
    if (event.detail?.window === 'kali-terminal') play();
  });
  document.addEventListener('xp:closed', event => {
    if (event.detail?.window === 'kali-terminal') stop(true);
  });
  button.addEventListener('click', () => {
    if (ownsAudio) stop();
    else play();
  });
  audio.addEventListener('ended', () => {
    ++playToken;
    releaseAudioFocus();
    show('TRACK ENDED', '▶ REPLAY', false);
  });
  audio.addEventListener('error', () => {
    ++playToken;
    releaseAudioFocus();
    show('AUDIO UNAVAILABLE · RETRY', '▶ PLAY', false);
  });
})();
