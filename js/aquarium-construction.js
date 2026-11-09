// Three deliberate taps turn the small aquarium leak into a broken pane.
// Audio is created in the tap gesture, so this also works on mobile Safari.
(function () {
  const glass = document.querySelector('.aquarium-construction');
  const controls = document.querySelector('.aquarium-construction-controls');
  const tap = controls?.querySelector('.aquarium-glass-tap');
  const status = controls?.querySelector('.aquarium-glass-status');
  const canvas = glass?.querySelector('.aquarium-burst-canvas');
  const sign = glass?.querySelector('.aquarium-construction-sign');
  if (!glass || !tap || !canvas) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const competingAudio = new Set();
  let damage = 0;
  let brokenAt = 0;
  let resetTimer = 0;
  let frame = 0;
  let lastFrame = 0;
  let bump;
  let context;
  let master;
  let noiseBuffer;
  let waterSound;
  let ownsAudio = false;
  let drawing;
  let width = 1;
  let height = 1;
  let anchor = { x: 0, y: 0, size: 80 };
  const shards = Array.from({ length: 20 }, (_, i) => ({
    vx: Math.cos(i * 2.399) * (75 + i % 5 * 29),
    vy: -65 - i % 7 * 23,
    size: 4 + i % 5 * 2,
    spin: (i % 2 ? -1 : 1) * (2 + i % 4),
  }));

  function announceSound(active) {
    controls.dataset.sound = active ? 'playing' : 'off';
    if (ownsAudio === active) return;
    ownsAudio = active;
    document.dispatchEvent(new CustomEvent(`xp:aquarium-playback-${active ? 'start' : 'stop'}`));
  }

  function unlockAudio() {
    const AudioType = window.AudioContext || window.webkitAudioContext;
    if (!AudioType || document.hidden || competingAudio.size) return false;
    try {
      if (!context || context.state === 'closed') {
        context = new AudioType();
        master = context.createGain();
        master.gain.value = .58;
        master.connect(context.destination);
        noiseBuffer = context.createBuffer(2, context.sampleRate * 3, context.sampleRate);
        for (let channel = 0; channel < 2; channel++) {
          const data = noiseBuffer.getChannelData(channel);
          let low = 0;
          for (let i = 0; i < data.length; i++) {
            const white = Math.random() * 2 - 1;
            low = (low + white * .02) / 1.02;
            data[i] = white * .58 + low * .9;
          }
        }
      }
      const result = context.resume();
      result?.catch?.(() => { controls.dataset.sound = 'unavailable'; });
      return true;
    } catch {
      controls.dataset.sound = 'unavailable';
      return false;
    }
  }

  function noise(duration, gain, frequency, when, type = 'highpass') {
    const source = context.createBufferSource();
    source.buffer = noiseBuffer;
    const filter = context.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(.0001, when);
    envelope.gain.exponentialRampToValueAtTime(gain, when + .003);
    envelope.gain.exponentialRampToValueAtTime(.0001, when + duration);
    source.connect(filter).connect(envelope).connect(master);
    source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect(); };
    source.start(when, Math.random() * .8);
    source.stop(when + duration + .02);
  }

  function ring(frequency, gain, duration, when) {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, when);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * .69, when + duration);
    envelope.gain.setValueAtTime(gain, when);
    envelope.gain.exponentialRampToValueAtTime(.0001, when + duration);
    oscillator.connect(envelope).connect(master);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
    oscillator.start(when);
    oscillator.stop(when + duration + .02);
  }

  function crackSound(stage) {
    if (!unlockAudio()) return;
    const now = context.currentTime;
    noise(.13 + stage * .035, .42, 1400, now);
    ring(195 - stage * 22, .21, .12, now);
    for (let i = 0; i < (stage === 3 ? 15 : 4 + stage * 2); i++) {
      ring(1150 + Math.random() * 6100, stage === 3 ? .028 : .018,
        .06 + Math.random() * (stage === 3 ? .6 : .19), now + Math.random() * stage * .035);
    }
    if (stage === 3) {
      noise(.34, .46, 650, now + .035);
      noise(.22, .22, 2800, now + .14);
    }
  }

  function startWaterSound() {
    if (damage !== 3 || waterSound || !unlockAudio()) return;
    try {
      const source = context.createBufferSource();
      source.buffer = noiseBuffer;
      source.loop = true;
      const lowpass = context.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 1950;
      const highpass = context.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = 95;
      const envelope = context.createGain();
      envelope.gain.setValueAtTime(.0001, context.currentTime);
      envelope.gain.linearRampToValueAtTime(.7, context.currentTime + .65);
      const swell = context.createOscillator();
      swell.frequency.value = .23;
      const depth = context.createGain();
      depth.gain.value = .08;
      swell.connect(depth).connect(envelope.gain);
      source.connect(lowpass).connect(highpass).connect(envelope).connect(master);
      source.start();
      swell.start();
      waterSound = { source, lowpass, highpass, envelope, swell, depth };
      announceSound(true);
    } catch {
      controls.dataset.sound = 'unavailable';
    }
  }

  function stopWaterSound() {
    if (waterSound) {
      const nodes = waterSound;
      waterSound = null;
      nodes.envelope.gain.cancelScheduledValues(context.currentTime);
      nodes.envelope.gain.setValueAtTime(nodes.envelope.gain.value, context.currentTime);
      nodes.envelope.gain.linearRampToValueAtTime(0, context.currentTime + .08);
      nodes.source.onended = () => Object.values(nodes).forEach(node => node.disconnect());
      nodes.source.stop(context.currentTime + .1);
      nodes.swell.stop(context.currentTime + .1);
    }
    announceSound(false);
  }

  function resize() {
    const rect = glass.getBoundingClientRect();
    width = window.innerWidth;
    height = window.innerHeight;
    anchor = { x: rect.left + rect.width * .49032, y: rect.top + rect.height * .29032, size: rect.width };
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    drawing?.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function draw(now) {
    frame = 0;
    if (damage !== 3 || document.hidden || !drawing) return;
    if (now - lastFrame < 32 && !reducedMotion.matches) {
      frame = requestAnimationFrame(draw);
      return;
    }
    lastFrame = now;
    const age = Math.max(0, (now - brokenAt) / 1000);
    const still = reducedMotion.matches;
    const time = still ? 2 : age;
    const { x, y, size } = anchor;
    const hole = Math.max(26, size * .15);
    const bottom = still ? height + 60 : Math.min(height + 60, y + age * 1100);
    const depth = Math.max(1, height - y);
    drawing.clearRect(0, 0, width, height);

    // An angular missing piece of glass, with the water issuing from its edge.
    drawing.beginPath();
    [[-.85,-.45],[-.35,-.9],[.25,-.78],[.77,-.36],[.64,.2],[.88,.68],[.1,.82],[-.7,.5],[-.55,.06]].forEach(([a,b], i) => {
      if (!i) drawing.moveTo(x + a * hole, y + b * hole);
      else drawing.lineTo(x + a * hole, y + b * hole);
    });
    drawing.closePath();
    drawing.fillStyle = 'rgba(0, 23, 42, .73)';
    drawing.fill();
    drawing.strokeStyle = 'rgba(212, 251, 255, .9)';
    drawing.lineWidth = 1.4;
    drawing.stroke();

    function center(at) { return x + Math.sin(time * 3.8 - at * .018) * Math.min(5, at * .06); }
    function breadth(at) { return hole * (.57 + Math.min(1, at / depth) * 1.25) * (1 + Math.sin(at * .039 + time * 4) * .055); }
    drawing.beginPath();
    for (let side = -1; side <= 1; side += 2) {
      const length = Math.max(1, bottom - y);
      const steps = Math.max(1, Math.ceil(length / 15));
      for (let i = 0; i <= steps; i++) {
        const at = length * (side < 0 ? i / steps : 1 - i / steps);
        const px = center(at) + side * breadth(at);
        if (side < 0 && !i) drawing.moveTo(px, y + at);
        else drawing.lineTo(px, y + at);
      }
    }
    drawing.closePath();
    const curtain = drawing.createLinearGradient(x - hole * 2, 0, x + hole * 2, 0);
    [[0,'rgba(61, 159, 187, .08)'],[.21,'rgba(166, 235, 247, .55)'],[.43,'rgba(69, 162, 196, .5)'],[.62,'rgba(179, 237, 249, .64)'],[.84,'rgba(84, 175, 202, .4)'],[1,'rgba(211, 250, 255, .1)']].forEach(([at,color]) => curtain.addColorStop(at,color));
    drawing.fillStyle = curtain;
    drawing.fill();

    // Fast irregular highlights stay within the single continuous curtain.
    drawing.save();
    drawing.clip();
    for (let i = 0; i < 30; i++) {
      const at = ((i * 79 + time * (460 + i % 4 * 75)) % (depth + 110)) - 50;
      const px = center(at) + Math.sin(i * 2.399) * breadth(at) * .85;
      drawing.beginPath();
      drawing.moveTo(px, y + at);
      drawing.quadraticCurveTo(px - 3, y + at + 11, px + 1, y + at + 17 + i % 4 * 8);
      drawing.lineWidth = 1 + i % 3;
      drawing.strokeStyle = `rgba(227, 253, 255, ${.12 + i % 4 * .055})`;
      drawing.stroke();
    }
    drawing.restore();

    // Spray at the opening and a splash where the falling sheet meets the floor.
    for (let i = 0; i < 30; i++) {
      const flight = ((time * 1.35 + i * .137) % 1);
      const direction = i % 2 ? -1 : 1;
      const floorSpray = i >= 12;
      if (floorSpray && bottom < height) continue;
      const px = x + direction * (floorSpray ? hole * .6 + flight * hole * 2.5 : flight * hole * 1.7);
      const py = floorSpray ? height - 8 - Math.sin(flight * Math.PI) * (20 + i % 5 * 8)
        : y + flight * flight * 155 - flight * 38;
      drawing.beginPath();
      drawing.ellipse(px, py, .8 + i % 3 * .65, 1.6 + i % 4, direction * .35, 0, Math.PI * 2);
      drawing.fillStyle = `rgba(220, 251, 255, ${(1 - flight) * .65})`;
      drawing.fill();
    }
    if (!still && age < 1.6) {
      shards.forEach((shard, i) => {
        drawing.save();
        drawing.translate(x + shard.vx * age, y + shard.vy * age + 380 * age * age);
        drawing.rotate(age * shard.spin + i);
        drawing.beginPath();
        drawing.moveTo(-shard.size, -shard.size * .4);
        drawing.lineTo(shard.size * .4, -shard.size);
        drawing.lineTo(shard.size, shard.size * .7);
        drawing.closePath();
        drawing.fillStyle = `rgba(194, 239, 251, ${Math.max(0, .63 - age * .39)})`;
        drawing.strokeStyle = `rgba(239, 255, 255, ${Math.max(0, .9 - age * .55)})`;
        drawing.fill();
        drawing.stroke();
        drawing.restore();
      });
    }
    if (!still) frame = requestAnimationFrame(draw);
  }

  function startDrawing() {
    if (frame || damage !== 3 || document.hidden || !drawing) return;
    lastFrame = 0;
    frame = requestAnimationFrame(draw);
  }

  function reset() {
    damage = 0;
    clearTimeout(resetTimer);
    cancelAnimationFrame(frame);
    frame = 0;
    bump?.cancel();
    glass.dataset.damage = controls.dataset.damage = '0';
    canvas.hidden = true;
    drawing?.clearRect(0, 0, width, height);
    tap.removeAttribute('aria-disabled');
    tap.setAttribute('aria-label', 'Tap the cracked aquarium glass');
    tap.title = 'Tap the cracked glass';
    status.textContent = 'Aquarium glass repaired.';
    stopWaterSound();
  }

  tap.addEventListener('click', () => {
    if (damage === 3) {
      if (performance.now() - brokenAt >= 1100) reset();
      return;
    }
    damage++;
    glass.dataset.damage = controls.dataset.damage = String(damage);
    bump?.cancel();
    // Missing or blocked audio must never prevent the visual sequence.
    try { crackSound(damage); } catch { controls.dataset.sound = 'unavailable'; }
    if (damage < 3) {
      if (!reducedMotion.matches) bump = sign?.animate?.([
        { transform: 'rotate(0)' }, { transform: `rotate(${damage * -2}deg)` }, { transform: 'rotate(0)' },
      ], { duration: 170, easing: 'ease-out' });
      tap.setAttribute('aria-label', damage === 1 ? 'Tap again to deepen the cracks' : 'Tap again to break the aquarium glass');
      status.textContent = damage === 1 ? 'The glass cracks further.' : 'The cracks spread across the pane.';
      return;
    }
    brokenAt = performance.now();
    drawing = canvas.getContext('2d', { alpha: true });
    canvas.hidden = false;
    resize();
    startDrawing();
    startWaterSound();
    tap.setAttribute('aria-label', 'Repair aquarium glass');
    tap.setAttribute('aria-disabled', 'true');
    tap.title = 'Repair glass';
    status.textContent = 'The glass breaks, the sign falls, and water rushes out. Tap Repair glass to reset.';
    resetTimer = setTimeout(() => tap.removeAttribute('aria-disabled'), 1100);
  });

  window.addEventListener('resize', () => {
    if (damage !== 3) return;
    resize();
    if (reducedMotion.matches) draw(performance.now());
  });
  reducedMotion.addEventListener?.('change', () => {
    cancelAnimationFrame(frame);
    frame = 0;
    startDrawing();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
      stopWaterSound();
      context?.suspend()?.catch?.(() => {});
    } else if (damage === 3) {
      startDrawing();
      startWaterSound();
    }
  });
  for (const kind of ['kali', 'happy', 'hack', 'huh', 'floppa', 'slots']) {
    document.addEventListener(`xp:${kind}-playback-start`, () => {
      competingAudio.add(kind);
      stopWaterSound();
    });
    document.addEventListener(`xp:${kind}-playback-stop`, () => {
      competingAudio.delete(kind);
      if (!competingAudio.size) startWaterSound();
    });
  }
  window.addEventListener('pagehide', () => {
    cancelAnimationFrame(frame);
    frame = 0;
    stopWaterSound();
    context?.suspend()?.catch?.(() => {});
  });
  window.addEventListener('pageshow', () => {
    if (damage === 3) { startDrawing(); startWaterSound(); }
  });
})();
