// Five taps crack, break, burst, and finally empty the aquarium.
// Audio is created in the tap gesture, so this also works on mobile Safari.
(function () {
  const glass = document.querySelector('.aquarium-construction');
  const controls = document.querySelector('.aquarium-construction-controls');
  const tap = controls?.querySelector('.aquarium-glass-tap');
  const repair = controls?.querySelector('.aquarium-glass-repair');
  const warningSign = document.querySelector('.aquarium-fish-killer-sign');
  const status = controls?.querySelector('.aquarium-glass-status');
  const canvas = glass?.querySelector('.aquarium-burst-canvas');
  const sign = glass?.querySelector('.aquarium-construction-sign');
  if (!glass || !tap || !canvas || !repair) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const competingAudio = new Set();
  let damage = 0;
  let brokenAt = 0;
  let resetTimer = 0;
  let phaseTimer = 0;
  let phaseAt = 0;
  let phaseProgress = 0;
  let phaseSettled = false;
  let hasEmptied = false;
  let burstAt = -10000;
  let lastSoundAt = -1;
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
  let paneShards = [];
  let repairAt = 0;
  let repairPauseAt = 0;
  let repairPhase = '';
  let repairStartLevel = 0;
  const repairPaneMs = 2200;
  const repairFillMs = 5000;
  const repairFishMs = 3800;
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
      result?.catch?.(() => {
        stopWaterSound();
        controls.dataset.sound = 'unavailable';
      });
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
    if (repairPhase || damage < 3 || (damage === 5 && phaseSettled) || waterSound || !unlockAudio()) return;
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
    if (damage === 5) fracturePane();
  }

  function fracturePane() {
    // Shared vertices tile the entire front pane. The original opening stays
    // put; only the actual pieces of glass travel away from their positions.
    const angles = Array.from({ length: 22 }, (_, i) => i / 22 * Math.PI * 2);
    for (const [x, y] of [[0, 0], [width, 0], [width, height], [0, height]]) {
      angles.push((Math.atan2(y - anchor.y, x - anchor.x) + Math.PI * 2) % (Math.PI * 2));
    }
    angles.sort((a, b) => a - b);
    const count = angles.length;
    const rings = [[], [], [], []];
    for (let i = 0; i < count; i++) {
      const angle = angles[i];
      const dx = Math.cos(angle), dy = Math.sin(angle);
      const edge = Math.min(
        dx > 0 ? (width - anchor.x) / dx : dx < 0 ? -anchor.x / dx : Infinity,
        dy > 0 ? (height - anchor.y) / dy : dy < 0 ? -anchor.y / dy : Infinity,
      );
      const inner = Math.min(edge, Math.max(26, anchor.size * .15) * 1.5 * (.78 + i % 3 * .09));
      [0, .24 + i % 3 * .025, .56 + i % 2 * .04, 1].forEach((fraction, ring) => {
        const distance = inner + (edge - inner) * fraction;
        rings[ring].push({ x: anchor.x + dx * distance, y: anchor.y + dy * distance });
      });
    }
    paneShards = [];
    for (let ring = 0; ring < 3; ring++) {
      for (let i = 0; i < count; i++) {
        const next = (i + 1) % count;
        const points = [rings[ring][i], rings[ring + 1][i], rings[ring + 1][next], rings[ring][next]];
        const x = points.reduce((sum, p) => sum + p.x, 0) / 4;
        const y = points.reduce((sum, p) => sum + p.y, 0) / 4;
        paneShards.push({ points, x, y, delay: ring * .045 + i % 3 * .012,
          vx: (x - anchor.x) * .2, vy: -35 - i % 4 * 18,
          spin: (i % 2 ? -1 : 1) * (.18 + i % 5 * .12) });
      }
    }
  }

  function drawPaneBreak(now) {
    if (reducedMotion.matches) return;
    const age = (now - phaseAt) / 1000;
    paneShards.forEach(shard => {
      const t = Math.max(0, age - shard.delay);
      const opacity = Math.max(0, 1 - Math.max(0, t - .55) / 1.1);
      if (!opacity) return;
      drawing.save();
      drawing.translate(shard.x + shard.vx * t, shard.y + shard.vy * t + height * .85 * t * t);
      drawing.rotate(shard.spin * t);
      drawing.beginPath();
      shard.points.forEach((p, i) => {
        if (!i) drawing.moveTo(p.x - shard.x, p.y - shard.y);
        else drawing.lineTo(p.x - shard.x, p.y - shard.y);
      });
      drawing.closePath();
      drawing.fillStyle = `rgba(188, 234, 246, ${opacity * .055})`;
      drawing.strokeStyle = `rgba(218, 249, 255, ${opacity * .62})`;
      drawing.lineWidth = .85;
      drawing.fill();
      drawing.stroke();
      drawing.restore();
    });
  }

  function drawFinalWater(state, time) {
    if (state.progress >= 1) return;
    // With the front pane gone, the lower pool spills across its whole width.
    // This moving edge is the water surface, never a moving hole in the glass.
    const top = Math.min(height, state.level * height);
    const remaining = 1 - state.progress;
    const sheet = drawing.createLinearGradient(0, top, 0, height);
    sheet.addColorStop(0, `rgba(168, 235, 249, ${remaining * .32})`);
    sheet.addColorStop(.22, `rgba(81, 180, 210, ${remaining * .27})`);
    sheet.addColorStop(1, `rgba(195, 247, 255, ${remaining * .48})`);
    drawing.beginPath();
    for (let px = 0; px <= width + 20; px += 20) {
      const py = top + Math.sin(px * .024 + time * 6) * 3 * remaining;
      if (!px) drawing.moveTo(px, py); else drawing.lineTo(px, py);
    }
    drawing.lineTo(width, height + 30);
    drawing.lineTo(0, height + 30);
    drawing.closePath();
    drawing.fillStyle = sheet;
    drawing.fill();
    drawing.save();
    drawing.clip();
    for (let i = 0; i < 55; i++) {
      const px = (i + .5) / 55 * width + Math.sin(time * 3 + i) * 5;
      const py = top + ((time * (250 + i % 4 * 80) + i * 59) % Math.max(1, height - top));
      drawing.beginPath();
      drawing.moveTo(px, py);
      drawing.quadraticCurveTo(px + 4, py + 16, px + 1, py + 32 + i % 5 * 7);
      drawing.lineWidth = 1 + i % 3 * .5;
      drawing.strokeStyle = `rgba(229, 253, 255, ${remaining * .3})`;
      drawing.stroke();
    }
    drawing.restore();
  }

  function tankState() {
    const point = { x: anchor.x / width, y: anchor.y / height };
    const progress = phaseProgress * phaseProgress * (3 - 2 * phaseProgress);
    const level = damage === 4 ? point.y * progress
      : damage === 5 ? point.y + (1.05 - point.y) * progress : 0;
    const outlet = { x: point.x, y: point.y };
    return { stage: damage, progress: phaseProgress, level, anchor: point, outlet };
  }

  function publishTank() {
    const state = tankState();
    controls.dataset.waterLevel = state.level.toFixed(4);
    document.dispatchEvent(new CustomEvent('xp:aquarium-drain', { detail: state }));
    return state;
  }

  function publishRepair(stage, progress, level) {
    const point = { x: anchor.x / width, y: anchor.y / height };
    controls.dataset.waterLevel = level.toFixed(4);
    document.dispatchEvent(new CustomEvent('xp:aquarium-drain', {
      detail: { stage, progress, level, anchor: point, outlet: point, repair: repairPhase },
    }));
  }

  function drawRepairPane(progress, installing) {
    // An intact, full-height sheet moves down as one piece. The moving line is
    // its bottom edge, not the original hole or a detached patch of glass.
    const bottom = height * progress;
    const top = bottom - height;
    drawing.fillStyle = 'rgba(180, 235, 248, .045)';
    drawing.fillRect(0, top, width, height);
    drawing.strokeStyle = 'rgba(215, 251, 255, .38)';
    drawing.lineWidth = 3;
    drawing.strokeRect(2, top + 2, width - 4, height - 4);
    const glint = drawing.createLinearGradient(0, 0, width, 0);
    glint.addColorStop(0, 'rgba(229, 254, 255, .17)');
    glint.addColorStop(.03, 'rgba(194, 238, 255, .015)');
    glint.addColorStop(.75, 'rgba(215, 251, 255, .018)');
    glint.addColorStop(.77, 'rgba(225, 254, 255, .10)');
    glint.addColorStop(1, 'rgba(225, 254, 255, .01)');
    drawing.fillStyle = glint;
    drawing.fillRect(0, top, width, height);
    if (installing) {
      drawing.fillStyle = 'rgba(231, 254, 255, .65)';
      drawing.fillRect(0, bottom - 3, width, 3);
      drawing.fillStyle = 'rgba(0, 59, 89, .3)';
      drawing.fillRect(0, bottom, width, 3);
    }
  }

  function drawRefillStream(now, level) {
    if (level <= .008) return;
    const surface = level * height;
    const x = width * .63;
    const wobble = Math.sin(now * .008) * 3;
    const stream = drawing.createLinearGradient(x - 10, 0, x + 10, 0);
    stream.addColorStop(0, 'rgba(105, 195, 227, .04)');
    stream.addColorStop(.3, 'rgba(195, 248, 255, .4)');
    stream.addColorStop(.65, 'rgba(109, 198, 227, .23)');
    stream.addColorStop(1, 'rgba(223, 253, 255, .07)');
    drawing.beginPath();
    drawing.moveTo(x - 8, -8);
    drawing.bezierCurveTo(x - 9 + wobble, surface * .4, x - 7 - wobble, surface * .7, x - 12, surface);
    drawing.lineTo(x + 12, surface);
    drawing.bezierCurveTo(x + 8 + wobble, surface * .65, x + 9 - wobble, surface * .3, x + 8, -8);
    drawing.closePath();
    drawing.fillStyle = stream;
    drawing.fill();
    drawing.beginPath();
    drawing.ellipse(x, surface, 18 + Math.sin(now * .009) * 4, 4, 0, 0, Math.PI * 2);
    drawing.strokeStyle = 'rgba(218, 251, 255, .62)';
    drawing.lineWidth = 2;
    drawing.stroke();
  }

  function drawRepair(now) {
    const age = Math.max(0, now - repairAt);
    if (age >= repairPaneMs + repairFillMs + repairFishMs) {
      reset();
      return;
    }
    const nextPhase = age < repairPaneMs ? 'pane'
      : age < repairPaneMs + repairFillMs ? 'refill' : 'fish';
    if (nextPhase !== repairPhase) {
      repairPhase = nextPhase;
      controls.dataset.repair = nextPhase;
      status.textContent = nextPhase === 'refill' ? 'The replacement glass is installed. Water is filling the aquarium from the bottom.'
        : 'The water is back. The missing fish are being lowered into the aquarium one by one.';
    }
    const paneProgress = Math.min(1, age / repairPaneMs);
    const fillProgress = Math.max(0, Math.min(1, (age - repairPaneMs) / repairFillMs));
    const fishProgress = Math.max(0, Math.min(1, (age - repairPaneMs - repairFillMs) / repairFishMs));
    const level = repairStartLevel * (1 - fillProgress * fillProgress * (3 - 2 * fillProgress));
    publishRepair(nextPhase === 'fish' ? 7 : 6, nextPhase === 'fish' ? fishProgress : fillProgress, level);
    drawing.clearRect(0, 0, width, height);
    drawRepairPane(paneProgress, nextPhase === 'pane');
    if (nextPhase === 'refill') drawRefillStream(now, level);
    if (!reducedMotion.matches) frame = requestAnimationFrame(draw);
  }

  function beginRepair() {
    if (repairPhase) return;
    // Preserve the real waterline and escaped-fish state; don't reset them.
    repairStartLevel = damage === 5 && phaseSettled ? 1 : tankState().level;
    clearTimeout(resetTimer);
    clearTimeout(phaseTimer);
    cancelAnimationFrame(frame);
    frame = 0;
    bump?.cancel();
    stopWaterSound();
    if (reducedMotion.matches) { reset(); return; }
    repairAt = performance.now();
    repairPauseAt = 0;
    repairPhase = 'pane';
    glass.dataset.repair = 'pane';
    controls.dataset.repair = 'pane';
    controls.dataset.flow = 'repair';
    repair.disabled = true;
    repair.textContent = 'Repairing…';
    tap.disabled = true;
    tap.setAttribute('aria-disabled', 'true');
    status.textContent = 'A new, intact glass pane is sliding down into the aquarium.';
    publishRepair(6, 0, repairStartLevel);
    startDrawing();
  }

  function finishPhase() {
    if (phaseSettled || damage < 4) return;
    phaseProgress = 1;
    phaseSettled = true;
    clearTimeout(phaseTimer);
    publishTank();
    if (damage === 4) {
      controls.dataset.flow = 'low';
      tap.removeAttribute('aria-disabled');
      tap.setAttribute('aria-label', 'Tap again to empty the aquarium');
      tap.title = 'Tap again to empty the aquarium';
      status.textContent = 'The water has fallen to the crack. The remaining fish are racing around below it. Tap again to empty the tank.';
    } else {
      hasEmptied = true;
      controls.dataset.flow = 'dry';
      tap.setAttribute('aria-label', 'Aquarium empty. Use Repair glass to refill it');
      tap.setAttribute('aria-disabled', 'true');
      stopWaterSound();
      status.textContent = 'The aquarium is dry and every fish has been swept out. Repair glass will refill the tank.';
    }
  }

  function explosionSound() {
    if (!unlockAudio()) return;
    const now = context.currentTime;
    noise(1.2, .7, 350, now, 'lowpass');
    noise(.85, .48, 1500, now + .025);
    ring(72, .22, .65, now);
  }

  function escalate() {
    damage++;
    phaseAt = burstAt = performance.now();
    phaseProgress = 0;
    phaseSettled = false;
    if (damage === 5) fracturePane();
    glass.dataset.damage = controls.dataset.damage = String(damage);
    controls.dataset.flow = damage === 4 ? 'upper-drain' : 'lower-drain';
    tap.setAttribute('aria-disabled', 'true');
    tap.setAttribute('aria-label', damage === 4 ? 'Water draining to the crack' : 'Aquarium emptying');
    status.textContent = damage === 4
      ? 'A huge burst of water erupts. The waterline is falling and the upper fish are being pulled out.'
      : 'The entire front pane shatters. The remaining water and fish spill out across the open front.';
    try { explosionSound(); } catch { controls.dataset.sound = 'unavailable'; }
    publishTank();
    if (reducedMotion.matches) phaseProgress = 1;
    else phaseTimer = setTimeout(() => {
      finishPhase();
      cancelAnimationFrame(frame);
      frame = 0;
      draw(performance.now());
    }, damage === 4 ? 6500 : 4500);
    cancelAnimationFrame(frame);
    frame = 0;
    startDrawing();
    startWaterSound();
  }

  function draw(now) {
    frame = 0;
    if (damage < 3 || document.hidden || !drawing) return;
    if (now - lastFrame < 32 && !reducedMotion.matches) {
      frame = requestAnimationFrame(draw);
      return;
    }
    lastFrame = now;
    if (repairPhase) { drawRepair(now); return; }
    const age = Math.max(0, (now - brokenAt) / 1000);
    const still = reducedMotion.matches;
    const time = still ? 2 : age;
    if (damage >= 4 && !phaseSettled) {
      phaseProgress = still ? 1 : Math.min(1, (now - phaseAt) / (damage === 4 ? 6500 : 4500));
      if (phaseProgress >= 1) finishPhase();
    }
    const state = damage >= 4 ? publishTank() : tankState();
    const dry = damage === 5 && phaseSettled;
    const x = anchor.x, y = anchor.y, size = anchor.size;
    const blast = still ? 0 : Math.max(0, 1 - (now - burstAt) / 1800);
    const hole = Math.max(26, size * .15) * (damage >= 4 ? 1.5 : 1);
    const bottom = still ? height + 60 : Math.min(height + 60, y + age * 1100);
    const depth = Math.max(1, height - y);
    drawing.clearRect(0, 0, width, height);

    if (dry) return;
    if (waterSound && context.currentTime - lastSoundAt > .12) {
      lastSoundAt = context.currentTime;
      const gain = damage === 3 ? .7 : damage === 4 ? .95 : .95 * (1 - phaseProgress) + .02;
      waterSound.envelope.gain.cancelScheduledValues(context.currentTime);
      waterSound.envelope.gain.setValueAtTime(waterSound.envelope.gain.value, context.currentTime);
      waterSound.envelope.gain.linearRampToValueAtTime(gain, context.currentTime + .18);
      waterSound.lowpass.frequency.value = damage >= 4 ? 2750 : 1950;
    }

    if (damage === 5) {
      drawFinalWater(state, time);
      drawPaneBreak(now);
      if (!still) frame = requestAnimationFrame(draw);
      return;
    }

    // The small opening is fixed in the pane until the entire pane breaks.
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
    function breadth(at) { return hole * (.57 + Math.min(1, at / depth) * 1.25)
      * (damage >= 4 ? 1.65 + blast * 1.2 : 1) * (1 + Math.sin(at * .039 + time * 4) * .055); }
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
    const curtain = drawing.createLinearGradient(x - hole * (damage >= 4 ? 4 : 2), 0, x + hole * (damage >= 4 ? 4 : 2), 0);
    [[0,'rgba(61, 159, 187, .08)'],[.21,'rgba(166, 235, 247, .55)'],[.43,'rgba(69, 162, 196, .5)'],[.62,'rgba(179, 237, 249, .64)'],[.84,'rgba(84, 175, 202, .4)'],[1,'rgba(211, 250, 255, .1)']].forEach(([at,color]) => curtain.addColorStop(at,color));
    drawing.fillStyle = curtain;
    drawing.fill();

    // Fast irregular highlights stay within the single continuous curtain.
    drawing.save();
    drawing.clip();
    for (let i = 0; i < (damage >= 4 ? 65 : 30); i++) {
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
    for (let i = 0; i < (damage >= 4 ? 95 : 30); i++) {
      const flight = ((time * 1.35 + i * .137) % 1);
      const direction = i % 2 ? -1 : 1;
      const floorSpray = i >= 12;
      if (floorSpray && bottom < height) continue;
      const px = x + direction * (floorSpray ? hole * .6 + flight * hole * 2.5 : flight * hole * (1.7 + blast * 3.5));
      const py = floorSpray ? height - 8 - Math.sin(flight * Math.PI) * (20 + i % 5 * 8)
        : y + flight * flight * (155 + blast * 170) - flight * (38 + blast * 130);
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
    if (frame || damage < 3 || document.hidden || !drawing) return;
    lastFrame = 0;
    frame = requestAnimationFrame(draw);
  }

  function reset() {
    damage = 0;
    repairPhase = '';
    repairPauseAt = 0;
    delete glass.dataset.repair;
    repair.disabled = false;
    tap.disabled = false;
    repair.textContent = 'Repair glass';
    delete controls.dataset.repair;
    clearTimeout(resetTimer);
    clearTimeout(phaseTimer);
    cancelAnimationFrame(frame);
    frame = 0;
    bump?.cancel();
    glass.dataset.damage = controls.dataset.damage = '0';
    phaseProgress = 0;
    phaseSettled = false;
    paneShards = [];
    controls.dataset.flow = 'full';
    publishTank();
    repair.hidden = true;
    if (hasEmptied && warningSign) warningSign.removeAttribute('hidden');
    canvas.hidden = true;
    drawing?.clearRect(0, 0, width, height);
    tap.removeAttribute('aria-disabled');
    tap.setAttribute('aria-label', 'Tap the cracked aquarium glass');
    tap.title = 'Tap the cracked glass';
    status.textContent = hasEmptied ? 'Aquarium refilled and fish restored. A FISH KILLER sign now stands in the scenery.' : 'Aquarium glass repaired.';
    stopWaterSound();
  }

  tap.addEventListener('click', () => {
    if (repairPhase) return;
    if (damage >= 3) {
      if (damage === 3 && performance.now() - brokenAt >= 1100) escalate();
      else if (damage === 4 && phaseSettled) escalate();
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
    repair.hidden = false;
    controls.dataset.flow = 'waterfall';
    tap.setAttribute('aria-label', 'Tap again for an explosive waterfall');
    tap.setAttribute('aria-disabled', 'true');
    tap.title = 'Tap again for an explosive waterfall';
    status.textContent = 'The glass breaks, the sign falls, and water rushes out. Tap the glass again for a bigger burst, or use Repair glass to reset.';
    resetTimer = setTimeout(() => tap.removeAttribute('aria-disabled'), 1100);
  });
  repair.addEventListener('click', beginRepair);

  window.addEventListener('resize', () => {
    if (damage < 3) return;
    resize();
    if (reducedMotion.matches) draw(performance.now());
  });
  reducedMotion.addEventListener?.('change', () => {
    cancelAnimationFrame(frame);
    frame = 0;
    if (repairPhase && reducedMotion.matches) { reset(); return; }
    startDrawing();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (repairPhase && !repairPauseAt) repairPauseAt = performance.now();
      cancelAnimationFrame(frame);
      frame = 0;
      stopWaterSound();
      context?.suspend()?.catch?.(() => {});
    } else if (damage >= 3) {
      if (repairPauseAt) { repairAt += performance.now() - repairPauseAt; repairPauseAt = 0; }
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
    if (repairPhase && !repairPauseAt) repairPauseAt = performance.now();
    cancelAnimationFrame(frame);
    frame = 0;
    stopWaterSound();
    context?.suspend()?.catch?.(() => {});
  });
  window.addEventListener('pageshow', () => {
    if (repairPauseAt) { repairAt += performance.now() - repairPauseAt; repairPauseAt = 0; }
    if (damage >= 3) { startDrawing(); startWaterSound(); }
  });
})();
