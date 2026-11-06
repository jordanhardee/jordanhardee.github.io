// General Tso is two transparent photo frames plus the visitor's local Web Speech voice.
// No microphone, analytics, network calls, or third-party voice service.
export const ORACLE_LINES = Object.freeze({
  greeting: 'Greetings, traveler. I am General Tso. Fortune favors the bold. The house favors mathematics.',
  spinning: 'The wheels of destiny turn. The coins of destiny are completely imaginary.',
  miss: 'A wise general knows when to retreat. A slot player does not.',
  win: 'Fortune smiles upon you. Do not mistake its teeth for kindness.',
  jackpot: 'Behold! The heavens rain gold! Imaginary gold, but glorious nonetheless.',
  refill: 'The imperial treasury is restored. No actual money was harmed.',
});

export function selectOracleVoice(voices) {
  if (!Array.isArray(voices)) return null;
  // Native Mandarin voices sometimes pronounce English with the requested accent.
  // Availability and actual pronunciation are device dependent.
  return voices.find(voice => /^zh[-_](CN|HK|TW)/i.test(voice.lang))
    || voices.find(voice => /chinese|mandarin/i.test(voice.name))
    || voices.find(voice => /^en/i.test(voice.lang) && /male|daniel|aaron|fred|arthur|rishi/i.test(voice.name))
    || voices.find(voice => /^en/i.test(voice.lang))
    || voices[0] || null;
}

export function createSlotsOracle({ canSpeak, getVolume }) {
  const overlay = document.createElement('div');
  overlay.id = 'slots-oracle-overlay';
  overlay.className = 'slots-oracle-overlay';
  overlay.hidden = true;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'General Tso speaks');
  overlay.innerHTML = `
    <div class="slots-oracle-title">GENERAL TSO SPEAKS</div>
    <button class="slots-oracle-close" type="button" aria-label="Dismiss General Tso">×</button>
    <div class="slots-oracle-figure" aria-hidden="true">
      <img src="assets/slots/general-tso-idle.webp" alt="" width="1122" height="1402">
      <img class="slots-oracle-mouth-open" src="assets/slots/general-tso-talk.webp" alt="" width="1122" height="1402">
    </div>
    <div class="slots-oracle-caption" aria-live="polite"></div>`;
  document.body.appendChild(overlay);

  const figure = overlay.querySelector('.slots-oracle-figure');
  const closeButton = overlay.querySelector('.slots-oracle-close');
  const caption = overlay.querySelector('.slots-oracle-caption');
  const synth = window.speechSynthesis;
  let currentUtterance = null;
  let timeout = 0;
  let previousFocus = null;
  let showToken = 0;

  function clearVoice() {
    currentUtterance = null;
    if (synth?.speaking || synth?.pending) synth.cancel();
  }

  function hide() {
    ++showToken;
    window.clearTimeout(timeout);
    timeout = 0;
    clearVoice();
    figure.classList.remove('is-speaking');
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

    // Captions and the mouth animation work even on muted/unsupported devices.
    figure.classList.add('is-speaking');
    const fallbackMs = Math.max(2700, words.length * 62);
    timeout = window.setTimeout(finish, fallbackMs);
    if (!canSpeak() || !synth || typeof window.SpeechSynthesisUtterance !== 'function') return;
    try {
      const line = new window.SpeechSynthesisUtterance(words);
      const voice = selectOracleVoice(synth.getVoices());
      if (voice) line.voice = voice;
      line.lang = voice?.lang || 'en-US';
      line.pitch = 0.58; // Low, aged-sounding narrator.
      line.rate = 0.82;
      line.volume = Math.min(1, Math.max(0, getVolume()));
      line.onend = finish;
      line.onerror = finish;
      currentUtterance = line;
      synth.speak(line);
    } catch {
      // Some mobile voice packs are not installed; captions remain available.
      currentUtterance = null;
    }
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
