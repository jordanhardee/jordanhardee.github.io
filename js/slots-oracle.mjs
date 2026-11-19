// General Tso's entrance uses an original, locally synthesized metallic gong.
// No announcer recordings, speech synthesis, external audio or autoplay on page load.
export const ORACLE_LINES = Object.freeze({
  greeting: 'BREAKING: THE IMPERIAL CAT HAS ARRIVED! ALL REELS WILL NOW TREMBLE!',
  spinning: 'ATTENTION! THE WHEELS OF DESTINY ARE MOVING! THIS IS NOT A DRILL!',
  miss: 'NATIONAL EMERGENCY! THE REELS HAVE BETRAYED THE GENERAL!',
  win: 'UNPRECEDENTED TRIUMPH! THE EMPIRE DECLARES A GLORIOUS SMALL WIN!',
  jackpot: 'HISTORIC VICTORY! THE HEAVENS RAIN DOWN COMPLETELY IMAGINARY GOLD!',
  refill: 'BY IMPERIAL DECREE! THE TREASURY IS RESTORED WITH FAKE COINS!',
});

export const GONG_DURATION = 4.1;

export function createGongSound(getVolume) {
  let context = null;
  let currentOutput = null;

  function stop() {
    if (!currentOutput || !context) return;
    const now = context.currentTime;
    currentOutput.gain.cancelScheduledValues(now);
    currentOutput.gain.setValueAtTime(Math.max(0.0001, currentOutput.gain.value), now);
    currentOutput.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
    currentOutput = null;
  }

  function ring() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return false;
    try {
      if (!context) context = new AudioContext();
      if (context.state === 'suspended') context.resume().catch(() => {});
      stop();

      const start = context.currentTime + 0.01;
      const output = context.createGain();
      const loudness = Math.max(0.0001, Math.min(1, getVolume()) * 0.34);
      output.gain.setValueAtTime(loudness, start);
      output.connect(context.destination);
      currentOutput = output;

      // Inharmonic partials make the clang bloom into a beating metal resonance.
      const partials = [
        [116, 0.74, 3.8], [167, 0.42, 3.5], [231, 0.32, 3.1],
        [318, 0.20, 2.6], [481, 0.15, 2.0], [727, 0.09, 1.4],
        [932, 0.05, 0.9],
      ];
      for (const [frequency, level, decay] of partials) {
        const oscillator = context.createOscillator();
        const envelope = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency * 1.014, start);
        oscillator.frequency.exponentialRampToValueAtTime(frequency, start + decay);
        envelope.gain.setValueAtTime(0.0001, start);
        envelope.gain.exponentialRampToValueAtTime(level, start + 0.025);
        envelope.gain.exponentialRampToValueAtTime(0.0001, start + decay);
        oscillator.connect(envelope).connect(output);
        oscillator.start(start);
        oscillator.stop(start + decay + 0.02);
      }

      // A short burst of filtered noise gives the strike its percussive edge.
      const strikeLength = Math.ceil(context.sampleRate * 0.13);
      const buffer = context.createBuffer(1, strikeLength, context.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let i = 0; i < samples.length; i += 1) samples[i] = Math.random() * 2 - 1;
      const strike = context.createBufferSource();
      const filter = context.createBiquadFilter();
      const strikeGain = context.createGain();
      strike.buffer = buffer;
      filter.type = 'bandpass';
      filter.frequency.value = 1000;
      filter.Q.value = 0.55;
      strikeGain.gain.setValueAtTime(0.65, start);
      strikeGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.13);
      strike.connect(filter).connect(strikeGain).connect(output);
      strike.start(start);
      strike.stop(start + 0.13);
      return true;
    } catch {
      stop();
      return false;
    }
  }

  return { ring, stop };
}

export function createSlotsOracle({ canSpeak, getVolume }) {
  const overlay = document.createElement('div');
  overlay.id = 'slots-oracle-overlay';
  overlay.className = 'slots-oracle-overlay';
  overlay.hidden = true;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'General Tso gong entrance');
  overlay.innerHTML = `
    <div class="slots-oracle-title">IMPERIAL BREAKING NEWS</div>
    <button class="slots-oracle-close" type="button" aria-label="Dismiss General Tso">×</button>
    <div class="slots-oracle-figure" aria-hidden="true">
      <img src="assets/slots/general-tso-idle.webp" alt="" width="1122" height="1402">
    </div>
    <div class="slots-oracle-caption-panel">
      <div class="slots-oracle-caption" aria-live="polite"></div>
      <button class="slots-oracle-replay" type="button" hidden>▶ RING THE GONG</button>
      <p class="slots-oracle-subtitle-note">ONE GONG · ZERO ANNOUNCERS</p>
    </div>`;
  document.body.appendChild(overlay);

  const closeButton = overlay.querySelector('.slots-oracle-close');
  const caption = overlay.querySelector('.slots-oracle-caption');
  const replayButton = overlay.querySelector('.slots-oracle-replay');
  const gong = createGongSound(getVolume);
  let timeout = 0;
  let previousFocus = null;
  let showToken = 0;

  function hide() {
    ++showToken;
    window.clearTimeout(timeout);
    timeout = 0;
    gong.stop();
    replayButton.hidden = true;
    overlay.hidden = true;
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    previousFocus = null;
  }

  function announce(kind = 'greeting', { automatic = false } = {}) {
    const token = ++showToken;
    window.clearTimeout(timeout);
    gong.stop();
    caption.textContent = ORACLE_LINES[kind] || ORACLE_LINES.greeting;
    overlay.hidden = false;
    overlay.classList.toggle('is-jackpot', kind === 'jackpot');
    replayButton.hidden = true;
    if (!automatic) {
      previousFocus = document.activeElement;
      closeButton.focus({ preventScroll: true });
    }

    // Show the entire gong decay. Muted visitors still see the General and text.
    timeout = window.setTimeout(hide, GONG_DURATION * 1000 + (automatic ? 900 : 2600));
    if (!canSpeak()) return;

    function playGong() {
      if (token !== showToken || !canSpeak()) return;
      replayButton.hidden = gong.ring();
    }
    replayButton.onclick = playGong;
    playGong();
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
