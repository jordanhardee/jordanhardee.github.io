// A viewport-sized, transparent aquarium background. The original star
// wallpaper shows through the alpha of the fish and aquascape artwork.
(function () {
  const canvas = document.getElementById('site-aquarium-canvas');
  const context = canvas?.getContext('2d', { alpha: true });
  if (!canvas || !context) return;

  const plants = new Image();
  const sprites = new Image();
  const catfishSprites = new Image();
  plants.src = 'assets/aquascape.webp';
  sprites.src = 'assets/fish-atlas-clean.webp';
  catfishSprites.src = 'assets/catfish-atlas.webp';

  // Each cutout has its own crop, including whole noses, fins, and tails.
  const regions = [
    [45, 55, 500, 294], [555, 55, 485, 292], [1050, 55, 470, 290],
    [12, 360, 551, 278], [565, 345, 470, 295], [1045, 360, 482, 290],
    [35, 645, 520, 340], [563, 645, 481, 295], [1045, 665, 480, 283],
  ];
  const fish = [
    [.13, .21, .018, 0, 1.03], [.68, .14, -.014, 1, .91],
    [.87, .34, -.013, 2, .94], [.32, .62, .024, 3, 1.01],
    [.60, .46, -.019, 4, .96], [.25, .39, .015, 5, .92],
    [.79, .65, -.024, 6, 1.03], [.48, .73, .013, 7, 1.04],
    [.11, .76, .017, 8, .86], [.90, .18, -.020, 0, .71],
    [.40, .28, .016, 5, .76], [.73, .81, -.012, 3, .71],
  ].map(([x, y, vx, sprite, size], index) => ({
    x, y, vx, vy: 0, sprite, size, phase: index * 1.72,
    initial: { x, y, vx }, removed: false, flight: null, pose: null,
  }));

  let width = 1;
  let height = 1;
  let elapsed = 0;
  let previous = performance.now();
  let frame = 0;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stats = canvas.dataset || {};
  let drain = { stage: 0, progress: 0, level: 0, anchor: { x: .8, y: .7 }, outlet: { x: .8, y: .7 } };
  let catfishBlend = 0;
  let catfishTarget = 0;
  const pointer = { active: false, x: 0, y: 0, speed: 0, lastAt: 0 };

  function startLoop() {
    if (!frame && !reducedMotion && !document.hidden && !(drain.stage === 5 && drain.progress >= 1)) {
      previous = performance.now();
      frame = requestAnimationFrame(tick);
    }
  }

  function updateSuction(f) {
    if (f.removed || !f.flight) return false;
    const flight = f.flight;
    const p = Math.max(0, Math.min(1, (drain.progress - flight.delay) / flight.duration));
    if (!p) return false;
    if (p >= 1) { f.removed = true; f.pose = null; return true; }
    if (!flight.start) flight.start = { x: f.x, y: f.y };
    const { x, y } = drain.outlet;
    if (p < .68) {
      const t = p / .68;
      const pull = Math.pow(t, 2.2);
      const swirl = Math.sin(t * 15 + f.phase) * t * (1 - t);
      f.pose = {
        x: flight.start.x + (x - flight.start.x) * pull + swirl * .065,
        y: flight.start.y + (y - flight.start.y) * pull + swirl * .035,
        rotation: Math.atan2((y - flight.start.y) * height, (x - flight.start.x) * width) + Math.sin(t * 10) * t * .7,
        scale: 1 - pull * .73, outflow: false,
      };
    } else {
      const t = (p - .68) / .32;
      f.pose = {
        x: x + Math.sin(t * 16 + f.phase) * .028,
        y: y + Math.pow(t, 1.3) * (1.25 - y),
        rotation: Math.PI / 2 + t * 7, scale: .27 + t * .2, outflow: true,
      };
    }
    return true;
  }

  function publishStats() {
    const remaining = fish.filter(f => !f.removed && !f.pose?.outflow).length;
    stats.fishRemaining = String(remaining);
    stats.fishEscaped = String(fish.length - remaining);
    stats.waterLevel = drain.level.toFixed(4);
    stats.swimSpeed = drain.stage === 5 && drain.progress >= 1 ? '0' : drain.stage >= 4 ? '12' : '1';
    stats.phase = drain.stage === 5 ? drain.progress >= 1 ? 'dry' : 'emptying'
      : drain.stage === 4 ? drain.progress >= 1 ? 'low' : 'lowering' : 'full';
  }

  document.addEventListener('xp:aquarium-drain', event => {
    const state = event.detail;
    if (!state || ![0, 3, 4, 5].includes(state.stage)) return;
    const changed = state.stage !== drain.stage;
    const wasSettled = drain.progress >= 1;
    drain = {
      stage: state.stage,
      progress: reducedMotion && state.stage >= 4 ? 1 : Math.max(0, Math.min(1, state.progress || 0)),
      level: Math.max(0, Math.min(1.05, state.level || 0)),
      anchor: state.anchor || drain.anchor, outlet: state.outlet || state.anchor || drain.outlet,
    };
    if (state.stage < 4) {
      for (const f of fish) Object.assign(f, f.initial, { vy: 0, removed: false, flight: null, pose: null });
    } else if (changed) {
      const survivors = fish.filter(f => !f.removed).sort((a, b) => b.y - a.y);
      // Leave at least three fish in the lower pool, including on short phone layouts.
      const lower = new Set(survivors.filter((f, i) => i < 3 || f.y >= drain.anchor.y - .012));
      survivors.forEach((f, i) => {
        if (state.stage === 4 && lower.has(f)) return;
        f.flight = {
          delay: state.stage === 4 ? .035 + Math.min(1, f.y / drain.anchor.y) * .28 + i % 3 * .025 : .025 + i % 4 * .03,
          duration: state.stage === 4 ? .38 + Math.abs(f.x - drain.anchor.x) * .12 : .68,
          start: null,
        };
      });
    }
    for (const f of fish) updateSuction(f);
    publishStats();
    if (reducedMotion || drain.stage === 0 || (drain.progress >= 1 && !wasSettled)) draw();
    startLoop();
  });

  function resize() {
    // Measure the actual canvas box (excluding desktop scrollbars) so sprites
    // line up with the visible background instead of stretching sideways.
    width = Math.max(1, canvas.clientWidth);
    height = Math.max(1, canvas.clientHeight);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    draw();
  }

  function draw() {
    context.clearRect(0, 0, width, height);
    if (plants.naturalWidth) {
      // The aquascape already has a transparent water column. Preserve its
      // alpha instead of filling the starry sky with a solid blue rectangle.
      // Keep the image's proportions on portrait phones, anchoring it to the
      // bottom rather than stretching the plants up the entire screen.
      const imageWidth = width * 1.12;
      const imageHeight = imageWidth * plants.naturalHeight / plants.naturalWidth;
      context.globalAlpha = .7 + Math.min(1, drain.level) * .13;
      context.drawImage(plants, (width - imageWidth) / 2, height - imageHeight,
        imageWidth, imageHeight);
      context.globalAlpha = 1;
    }

    if (drain.stage >= 4 && drain.level > 0) {
      const surface = Math.min(height + 20, drain.level * height);
      // The exposed part loses its cool water tint and becomes slightly brighter.
      const air = context.createLinearGradient(0, 0, 0, height);
      air.addColorStop(0, 'rgba(194, 226, 230, .13)');
      air.addColorStop(1, 'rgba(255, 230, 181, .12)');
      context.fillStyle = air;
      context.fillRect(0, 0, width, Math.min(height, surface));
      if (surface < height) {
        context.beginPath();
        for (let x = 0; x <= width + 20; x += 20) {
          const y = surface + Math.sin(x * .017 + elapsed * 4) * 3 + Math.sin(x * .035 - elapsed * 3) * 1.5;
          if (!x) context.moveTo(x, y); else context.lineTo(x, y);
        }
        context.lineTo(width, height);
        context.lineTo(0, height);
        context.closePath();
        context.fillStyle = 'rgba(14, 114, 173, .18)';
        context.fill();
        context.beginPath();
        for (let x = 0; x <= width + 20; x += 20) {
          const y = surface + Math.sin(x * .017 + elapsed * 4) * 3 + Math.sin(x * .035 - elapsed * 3) * 1.5;
          if (!x) context.moveTo(x, y); else context.lineTo(x, y);
        }
        context.strokeStyle = 'rgba(213, 251, 255, .82)';
        context.lineWidth = 2;
        context.stroke();
      }
    }

    if (sprites.naturalWidth) {
      const nominalWidth = Math.max(80, Math.min(width * .135, height * .26, 210));
      const showCatfish = catfishSprites.naturalWidth > 0 ? catfishBlend : 0;
      for (const f of fish) {
        if (f.removed) continue;
        const [cropX, cropY, cropW, cropH] = regions[f.sprite];
        const fishWidth = nominalWidth * f.size;
        const fishHeight = fishWidth * cropH / cropW;
        context.save();
        const pose = f.pose;
        context.translate((pose?.x ?? f.x) * width, (pose?.y ?? f.y) * height + (pose ? 0 : Math.sin(elapsed * 1.4 + f.phase) * 7));
        if (pose) { context.rotate(pose.rotation); context.scale(pose.scale, pose.scale); }
        else if (f.vx < 0) context.scale(-1, 1);
        context.scale(1 + Math.sin(elapsed * 6.5 + f.phase) * .016, 1);
        if (showCatfish < 1) {
          const sx = sprites.naturalWidth / 1536;
          const sy = sprites.naturalHeight / 1024;
          context.globalAlpha = .92 * (1 - showCatfish);
          context.drawImage(sprites, cropX * sx, cropY * sy, cropW * sx, cropH * sy,
            -fishWidth / 2, -fishHeight / 2, fishWidth, fishHeight);
        }
        if (showCatfish > 0) {
          const sx = catfishSprites.naturalWidth / 1536;
          const sy = catfishSprites.naturalHeight / 1024;
          context.globalAlpha = .92 * showCatfish;
          context.drawImage(catfishSprites, cropX * sx, cropY * sy, cropW * sx, cropH * sy,
            -fishWidth / 2, -fishHeight / 2, fishWidth, fishHeight);
        }
        context.restore();
      }
    }

    // Fine glassy bubbles; keep these subtle so the original stars read through.
    context.lineWidth = 1;
    for (let i = 0; i < (drain.level >= 1 ? 0 : 25); i++) {
      const x = (.05 + ((i * 41) % 91) / 100) * width + Math.sin(elapsed + i) * 3;
      const y = drain.level * height + ((i * .137 - elapsed * (.008 + i % 4 * .002)) % 1 + 1) % 1 * height * (1 - drain.level);
      context.beginPath();
      context.arc(x, y, 1.5 + i % 3, 0, Math.PI * 2);
      context.strokeStyle = 'rgba(206,248,255,.24)';
      context.stroke();
    }
    publishStats();
  }

  function tick(now) {
    frame = 0;
    // A gentle 30 fps is enough for fish and saves battery on mobile devices.
    if (now - previous < 30) {
      if (!document.hidden) frame = requestAnimationFrame(tick);
      return;
    }
    const dt = Math.min(.06, Math.max(0, (now - previous) / 1000));
    previous = now;
    elapsed += dt;
    // The second atlas is drawn at the exact same coordinates, so the fish
    // keep swimming uninterrupted while their faces gently transform.
    const target = catfishSprites.naturalWidth ? catfishTarget : 0;
    catfishBlend += Math.sign(target - catfishBlend) * Math.min(Math.abs(target - catfishBlend), dt / .65);

    for (const f of fish) {
      if (f.removed || updateSuction(f)) continue;
      if (pointer.active) {
        const dx = pointer.x - f.x;
        const dy = pointer.y - f.y;
        const distance = Math.max(.03, Math.hypot(dx, dy));
        if (distance < .2) {
          const force = pointer.speed > .001 ? -.014 : .008;
          f.vx += dx / distance * force * dt;
          f.vy += dy / distance * force * dt * .4;
        }
      }
      f.vx = Math.max(-.035, Math.min(.035, f.vx));
      f.vy *= Math.max(0, 1 - dt * 1.4);
      const panic = drain.stage >= 4 ? 12 : 1;
      f.x += f.vx * dt * panic;
      f.y += f.vy * dt * panic;
      if (panic > 1) f.y += Math.sin(elapsed * 13 + f.phase) * dt * .075;
      const edge = Math.min(.16, Math.max(.075, 60 / width));
      if (f.x < edge || f.x > 1 - edge) f.vx = -f.vx;
      f.x = Math.max(edge, Math.min(1 - edge, f.x));
      const floor = .91;
      const waterTop = drain.stage >= 4 ? Math.min(floor - .025, drain.level + .045) : .09;
      f.y = Math.max(waterTop, Math.min(drain.stage >= 4 ? floor : .87, f.y));
    }
    draw();
    if (!reducedMotion && !document.hidden && !(drain.stage === 5 && drain.progress >= 1)) frame = requestAnimationFrame(tick);
  }

  window.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') return;
    const now = performance.now();
    const x = event.clientX / width;
    const y = event.clientY / height;
    pointer.speed = pointer.lastAt ? Math.hypot(x - pointer.x, y - pointer.y) / Math.max(1, now - pointer.lastAt) : 0;
    Object.assign(pointer, { x, y, active: true, lastAt: now });
  }, { passive: true });
  window.addEventListener('pointerleave', () => { pointer.active = false; });
  window.addEventListener('resize', resize);
  document.addEventListener('xp:cats-state', event => {
    catfishTarget = event.detail?.released ? 1 : 0;
    if (reducedMotion) catfishBlend = catfishSprites.naturalWidth ? catfishTarget : 0;
    draw();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
    else startLoop();
  });
  plants.onload = draw;
  sprites.onload = draw;
  catfishSprites.onload = () => {
    if (reducedMotion) catfishBlend = catfishTarget;
    draw();
  };
  resize();
  if (!reducedMotion) frame = requestAnimationFrame(tick);
})();
