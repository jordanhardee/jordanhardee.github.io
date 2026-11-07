// The roaming Floppa visits on local Fridays; Floppa.exe opens the show on demand.
(function () {
  const shortcut = document.getElementById('floppa-exe-shortcut');
  const trigger = document.getElementById('floppa-friday-trigger');
  const fridayToggle = document.getElementById('xp-floppa-toggle');
  const fridayDescription = document.getElementById('xp-floppa-description');
  const show = document.getElementById('floppa-friday-show');
  const close = document.getElementById('floppa-friday-close');
  const canvas = document.getElementById('floppa-friday-particles');
  const smiley = document.getElementById('floppa-friday-holy-moly');
  const video = document.getElementById('happy-video');
  if (!shortcut || !trigger || !show || !close || !canvas || !smiley) return;

  const context = canvas.getContext('2d');
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
  const fractal = new Image();
  fractal.decoding = 'async';
  let fractalReady = false;
  fractal.addEventListener('load', () => { fractalReady = true; });

  let width = window.innerWidth;
  let height = window.innerHeight;
  let x = width * .63;
  let y = height * .34;
  let vx = 270;
  let vy = 208;
  let lastOrbit = 0;
  let orbitFrame = 0;
  let effectFrame = 0;
  let lastEffect = 0;
  let lastSpawn = 0;
  let active = false;
  let resumeHappy = false;
  let particles = [];
  let generation = 0;
  let touchShortcut = false;
  const roamingPreference = 'jordanhardee-floppa-friday-roaming';
  let roamingEnabled = true;
  try { roamingEnabled = localStorage.getItem(roamingPreference) !== 'off'; }
  catch { /* Keep the roaming cat available when storage is blocked. */ }

  function refreshFridayToggle() {
    fridayToggle?.setAttribute('aria-checked', String(roamingEnabled));
    if (fridayDescription) fridayDescription.textContent = roamingEnabled
      ? 'On · roaming Floppa visible'
      : 'Off · roaming Floppa hidden';
  }
  refreshFridayToggle();

  let audioContext = null;
  let audioBufferPromise = null;
  let audioSource = null;
  let audioFallback = null;
  let kaliSoundActive = false;

  // Match the title's Mario font and independently cycling primary colours.
  const colours = ['rainbow-textRed', 'rainbow-textBlue', 'rainbow-textYellow', 'rainbow-textGreen'];
  for (const line of show.querySelectorAll('[data-rainbow-text]')) {
    for (const [index, character] of [...line.dataset.rainbowText].entries()) {
      const letter = document.createElement('span');
      letter.className = colours[index % colours.length];
      letter.textContent = character === ' ' ? '\u00a0' : character;
      letter.setAttribute('aria-hidden', 'true');
      line.appendChild(letter);
    }
  }

  function emit(name) {
    document.dispatchEvent(new CustomEvent(name, { detail: { window: 'floppa-friday' } }));
  }

  function bounds() {
    width = window.innerWidth;
    height = window.innerHeight;
    const side = trigger.offsetWidth || 110;
    const maxX = Math.max(8, width - side - 8);
    const maxY = Math.max(44, height - side - 46); // Keep the ! and XP taskbar visible.
    x = Math.min(Math.max(8, x), maxX);
    y = Math.min(Math.max(44, y), maxY);
    trigger.style.transform = `translate3d(${x}px,${y}px,0)`;
    if (context) {
      const scale = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      context.setTransform(scale, 0, 0, scale, 0, 0);
    }
  }

  function orbit(time) {
    if (active) return;
    const elapsed = lastOrbit ? Math.min((time - lastOrbit) / 1000, .05) : 0;
    lastOrbit = time;
    if (!reducedMotion) {
      const side = trigger.offsetWidth || 110;
      const maxX = Math.max(8, width - side - 8);
      const maxY = Math.max(44, height - side - 46);
      x += vx * elapsed;
      y += vy * elapsed;
      if (x < 8 || x > maxX) { x = Math.min(Math.max(x, 8), maxX); vx = -vx; }
      if (y < 44 || y > maxY) { y = Math.min(Math.max(y, 44), maxY); vy = -vy; }
      trigger.style.transform = `translate3d(${x}px,${y}px,0)`;
    }
    orbitFrame = requestAnimationFrame(orbit);
  }

  function newParticle(burst = false) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (burst ? 105 : 20) + Math.random() * (burst ? 490 : 220);
    const size = (burst ? 25 : 16) + Math.random() * (burst ? 80 : 64);
    return {
      x: width / 2, y: height / 2,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      spin: (Math.random() - .5) * 5, rotation: Math.random() * 6,
      size, age:0, life:1.7 + Math.random() * 3.2,
      kind:Math.floor(Math.random() * 3), hue:Math.random() * 80 + 160,
    };
  }

  function burst() {
    particles = Array.from({ length: width < 650 ? 70 : 118 }, () => newParticle(true));
  }

  function drawParticle(p) {
    if (!context) return;
    const opacity = Math.min(1, (p.life - p.age) / .85);
    context.save();
    context.globalAlpha = Math.max(0, opacity) * .87;
    context.translate(p.x, p.y);
    context.rotate(p.rotation);
    context.shadowBlur = 12;
    context.shadowColor = '#47fafa';
    if (fractalReady && p.kind !== 2) {
      context.beginPath();
      if (p.kind === 0) context.arc(0, 0, p.size / 2, 0, Math.PI * 2);
      else context.rect(-p.size / 2, -p.size / 2, p.size, p.size);
      context.clip();
      // A big Floppa face, or the electric branches from the supplied image.
      const crop = p.kind === 0 ? [18, 22, 505, 540] : [430, 45, 460, 440];
      context.drawImage(fractal, ...crop, -p.size / 2, -p.size / 2, p.size, p.size);
    } else {
      context.strokeStyle = `hsl(${p.hue} 100% 70%)`;
      context.lineWidth = 2.5;
      for (let branch = 0; branch < 7; branch++) {
        const angle = branch * Math.PI * 2 / 7;
        context.beginPath();
        context.moveTo(0, 0);
        context.lineTo(Math.cos(angle) * p.size * .27, Math.sin(angle) * p.size * .27);
        context.lineTo(Math.cos(angle + .12) * p.size * .55, Math.sin(angle + .12) * p.size * .55);
        context.stroke();
      }
    }
    context.restore();
  }

  function effect(time) {
    if (!active) return;
    const elapsed = lastEffect ? Math.min((time - lastEffect) / 1000, .05) : 0;
    lastEffect = time;
    if (context) context.clearRect(0, 0, width, height);
    if (time - lastSpawn > 100 && !reducedMotion) {
      lastSpawn = time;
      for (let i = 0; i < 3; i++) particles.push(newParticle());
      if (particles.length > 165) particles.splice(0, particles.length - 165);
    }
    particles = particles.filter(p => p.age < p.life);
    for (const p of particles) {
      if (!reducedMotion) {
        p.x += p.vx * elapsed;
        p.y += p.vy * elapsed;
        p.rotation += p.spin * elapsed;
        p.age += elapsed;
      }
      drawParticle(p);
    }
    if (!reducedMotion) effectFrame = requestAnimationFrame(effect);
  }

  function sound() {
    if (kaliSoundActive) { show.dataset.audio = 'muted-for-kali'; return; }
    const token = generation;
    show.dataset.audio = 'loading';
    const Type = window.AudioContext || window.webkitAudioContext;
    if (Type) {
      try {
        if (!audioContext) audioContext = new Type();
        // resume() must happen synchronously inside the click on iOS.
        const unlocked = audioContext.resume();
        if (!audioBufferPromise) {
          audioBufferPromise = fetch('assets/floppa-friday/holy-moly.mp3')
            .then(response => {
              if (!response.ok) throw new Error('Holy moly audio unavailable');
              return response.arrayBuffer();
            })
            .then(bytes => audioContext.decodeAudioData(bytes))
            .catch(error => { audioBufferPromise = null; throw error; });
        }
        Promise.all([unlocked, audioBufferPromise]).then(([, buffer]) => {
          if (!active || token !== generation) return;
          const source = audioContext.createBufferSource();
          const gain = audioContext.createGain();
          gain.gain.value = .94;
          source.buffer = buffer;
          source.connect(gain);
          gain.connect(audioContext.destination);
          source.onended = () => {
            if (token === generation) { audioSource = null; show.dataset.audio = 'ended'; }
          };
          audioSource = source;
          source.start(audioContext.currentTime + .35);
          show.dataset.audio = 'playing';
        }).catch(() => fallbackSound(token));
        return;
      } catch { /* Use HTML audio if Web Audio is unavailable. */ }
    }
    fallbackSound(token);
  }

  function fallbackSound(token) {
    if (!active || token !== generation) return;
    if (!audioFallback) {
      audioFallback = new Audio('assets/floppa-friday/holy-moly.mp3');
      audioFallback.preload = 'none';
      audioFallback.volume = .94;
    }
    audioFallback.onended = () => { if (token === generation) show.dataset.audio = 'ended'; };
    audioFallback.currentTime = 0;
    const result = audioFallback.play();
    show.dataset.audio = 'playing';
    result?.catch?.(() => { if (token === generation) show.dataset.audio = 'blocked'; });
  }

  function selectShortcut(selected) {
    shortcut.classList.toggle('is-selected', selected);
    shortcut.setAttribute('aria-pressed', String(selected));
  }

  function localFriday() {
    return new Date().getDay() === 5;
  }

  // A Friday is based on the visitor's calendar, not the server's timezone.
  // Recheck while the tab stays open so the cat arrives/leaves at midnight.
  function syncFriday() {
    const isFriday = localFriday();
    if (fridayToggle) fridayToggle.hidden = !isFriday;
    if (active) return;
    if (isFriday && roamingEnabled) {
      if (!trigger.hidden) return;
      trigger.hidden = false;
      lastOrbit = 0;
      bounds();
      cancelAnimationFrame(orbitFrame);
      orbitFrame = requestAnimationFrame(orbit);
    } else if (!trigger.hidden) {
      trigger.hidden = true;
      cancelAnimationFrame(orbitFrame);
      orbitFrame = 0;
    }
  }

  fridayToggle?.addEventListener('click', () => {
    roamingEnabled = !roamingEnabled;
    try { localStorage.setItem(roamingPreference, roamingEnabled ? 'on' : 'off'); }
    catch { /* This visit's choice still applies. */ }
    refreshFridayToggle();
    syncFriday();
  });

  function launch() {
    if (active) return;
    selectShortcut(true);
    // The shortcut is available every day. Only the roaming square is Friday-only.
    // Keep sound inside the activation gesture for mobile Safari.
    start();
  }

  shortcut.addEventListener('pointerdown', event => {
    touchShortcut = event.pointerType === 'touch' || event.pointerType === 'pen';
  });
  shortcut.addEventListener('touchstart', () => { touchShortcut = true; }, { passive:true });
  shortcut.addEventListener('click', event => {
    selectShortcut(true);
    // Safari may send a MouseEvent for the synthetic click after a touch;
    // remember the real pointer/touch event and launch on one mobile tap.
    const touch = touchShortcut || event.pointerType === 'touch';
    touchShortcut = false;
    if (touch || event.detail >= 2) launch();
  });
  shortcut.addEventListener('dblclick', launch);
  shortcut.addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); launch(); }
  });
  document.addEventListener('pointerdown', event => {
    if (!shortcut.contains(event.target)) selectShortcut(false);
  });

  function start() {
    if (active) return;
    active = true;
    generation++;
    cancelAnimationFrame(orbitFrame);
    trigger.hidden = true;
    show.hidden = false;
    document.body.classList.add('floppa-friday-active');
    show.dataset.state = 'exploding';
    if (!smiley.src) smiley.src = smiley.dataset.src;
    if (!fractal.src) fractal.src = 'assets/floppa-friday/fractal-floppas.webp';
    resumeHappy = !!video && !video.paused;
    // Stop site music before any underlying video can resume it.
    emit('xp:floppa-playback-start');
    if (resumeHappy) video.pause();
    sound();
    bounds();
    burst();
    lastEffect = 0;
    if (effectFrame) cancelAnimationFrame(effectFrame);
    effectFrame = requestAnimationFrame(effect);
    close.focus();
  }

  function stop() {
    if (!active) return;
    active = false;
    generation++;
    cancelAnimationFrame(effectFrame);
    effectFrame = 0;
    if (audioSource) {
      audioSource.onended = null;
      try { audioSource.stop(); } catch { /* already finished */ }
      audioSource.disconnect();
      audioSource = null;
    }
    if (audioFallback) { audioFallback.pause(); audioFallback.currentTime = 0; }
    show.dataset.audio = 'stopped';
    show.dataset.state = 'closed';
    show.hidden = true;
    trigger.hidden = true;
    document.body.classList.remove('floppa-friday-active');
    emit('xp:floppa-playback-stop');
    if (resumeHappy && !kaliSoundActive) video?.play().catch?.(() => {});
    resumeHappy = false;
    lastOrbit = 0;
    shortcut.focus();
    syncFriday();
  }

  trigger.addEventListener('click', start);
  document.addEventListener('xp:kali-playback-start', () => {
    kaliSoundActive = true;
    ++generation; // Prevent an in-flight sound fetch from starting later.
    if (audioSource) {
      audioSource.onended = null;
      try { audioSource.stop(); } catch { /* Already ended. */ }
      audioSource.disconnect();
      audioSource = null;
    }
    if (audioFallback) { audioFallback.pause(); audioFallback.currentTime = 0; }
    if (active) show.dataset.audio = 'muted-for-kali';
  });
  document.addEventListener('xp:kali-playback-stop', () => {
    kaliSoundActive = false;
    if (active && show.dataset.audio === 'muted-for-kali') sound();
  });
  close.addEventListener('click', stop);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && active) { event.preventDefault(); stop(); }
  });
  window.addEventListener('resize', bounds);
  window.addEventListener('focus', syncFriday);
  document.addEventListener('visibilitychange', syncFriday);
  window.setInterval(syncFriday, 60_000);
  bounds();
  syncFriday();
})();
