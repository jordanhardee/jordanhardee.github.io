// General Tso uses excerpts of a real Polish boxing announcer recording, CC0.
// The English overlays are intentionally absurd parody subtitles, not translations.
// Audio is self-hosted. No speech synthesis, microphones, analytics or voice services.
export const ORACLE_LINES = Object.freeze({
  greeting: 'BREAKING: THE IMPERIAL CAT HAS ARRIVED! ALL REELS WILL NOW TREMBLE!',
  spinning: 'ATTENTION! THE WHEELS OF DESTINY ARE MOVING! THIS IS NOT A DRILL!',
  miss: 'NATIONAL EMERGENCY! THE REELS HAVE BETRAYED THE GENERAL!',
  win: 'UNPRECEDENTED TRIUMPH! THE EMPIRE DECLARES A GLORIOUS SMALL WIN!',
  jackpot: 'HISTORIC VICTORY! THE HEAVENS RAIN DOWN COMPLETELY IMAGINARY GOLD!',
  refill: 'BY IMPERIAL DECREE! THE TREASURY IS RESTORED WITH FAKE COINS!',
});

export const ORACLE_CLIPS = Object.freeze(Object.fromEntries(
  Object.keys(ORACLE_LINES).map(kind => [kind, `assets/slots/announcer-${kind}.mp3`])
));

export function createSlotsOracle({ canSpeak, getVolume }) {
  const overlay = document.createElement('div');
  overlay.id = 'slots-oracle-overlay';
  overlay.className = 'slots-oracle-overlay';
  overlay.hidden = true;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'General Tso emergency broadcast');
  overlay.innerHTML = `
    <div class="slots-oracle-title">IMPERIAL BREAKING NEWS</div>
    <button class="slots-oracle-close" type="button" aria-label="Dismiss General Tso">×</button>
    <div class="slots-oracle-figure" aria-hidden="true">
      <img src="assets/slots/general-tso-idle.webp" alt="" width="1122" height="1402">
      <img class="slots-oracle-mouth-open" src="assets/slots/general-tso-talk.webp" alt="" width="1122" height="1402">
    </div>
    <div class="slots-oracle-caption-panel">
      <div class="slots-oracle-caption" aria-live="polite"></div>
      <button class="slots-oracle-replay" type="button" hidden>▶ PLAY THE DECREE</button>
      <p class="slots-oracle-subtitle-note">PARODY SUBTITLES · NOT A TRANSLATION</p>
    </div>`;
  document.body.appendChild(overlay);

  const figure = overlay.querySelector('.slots-oracle-figure');
  const closeButton = overlay.querySelector('.slots-oracle-close');
  const caption = overlay.querySelector('.slots-oracle-caption');
  const replayButton = overlay.querySelector('.slots-oracle-replay');
  let currentAudio = null;
  let timeout = 0;
  let previousFocus = null;
  let showToken = 0;

  function clearVoice() {
    if (!currentAudio) return;
    currentAudio.pause();
    currentAudio.onended = null;
    currentAudio.onerror = null;
    currentAudio = null;
  }

  function hide() {
    ++showToken;
    window.clearTimeout(timeout);
    timeout = 0;
    clearVoice();
    figure.classList.remove('is-speaking');
    replayButton.hidden = true;
    overlay.hidden = true;
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    previousFocus = null;
  }

  function announce(kind = 'greeting', { automatic = false } = {}) {
    const words = ORACLE_LINES[kind] || ORACLE_LINES.greeting;
    const token = ++showToken;
    window.clearTimeout(timeout);
    clearVoice();
    caption.textContent = words;
    overlay.hidden = false;
    overlay.classList.toggle('is-jackpot', kind === 'jackpot');
    replayButton.hidden = true;
    figure.classList.remove('is-speaking');
    if (!automatic) {
      previousFocus = document.activeElement;
      closeButton.focus({ preventScroll: true });
    }

    function finish() {
      if (token !== showToken) return;
      window.clearTimeout(timeout);
      figure.classList.remove('is-speaking');
      timeout = window.setTimeout(hide, automatic ? 850 : 1700);
    }

    // Muted visitors still get readable captions. Nothing starts on page load.
    timeout = window.setTimeout(finish, automatic ? 7000 : 11000);
    if (!canSpeak() || typeof Audio !== 'function') return;

    function playRecording() {
      if (token !== showToken || !canSpeak()) return;
      clearVoice();
      const recording = new Audio(ORACLE_CLIPS[kind] || ORACLE_CLIPS.greeting);
      recording.preload = 'none';
      recording.volume = Math.min(1, Math.max(0, getVolume()));
      recording.playbackRate = 1.08;
      recording.onended = finish;
      recording.onerror = () => {
        if (token !== showToken) return;
        figure.classList.remove('is-speaking');
        replayButton.hidden = false;
      };
      currentAudio = recording;
      try {
        const attempt = recording.play();
        attempt?.then?.(() => {
          if (token === showToken) {
            figure.classList.add('is-speaking');
            replayButton.hidden = true;
          }
        }).catch?.(() => {
          if (token !== showToken) return;
          figure.classList.remove('is-speaking');
          replayButton.hidden = false;
        });
      } catch {
        replayButton.hidden = false;
      }
    }
    replayButton.onclick = playRecording;
    playRecording();
  }

  closeButton.addEventListener('click', hide);
  overlay.addEventListener('click', event => {
    if (event.target === overlay) hide();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !overlay.hidden) hide();
  });
  return { announce, hide, get visible() { return !overlay.hidden; } };
}
