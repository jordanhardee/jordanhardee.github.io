// A viewport-sized, transparent aquarium background. The original star
// wallpaper shows through the alpha of the fish and aquascape artwork.
(function () {
  const canvas = document.getElementById('site-aquarium-canvas');
  const context = canvas?.getContext('2d', { alpha: true });
  if (!canvas || !context) return;

  const plants = new Image();
  const sprites = new Image();
  plants.src = 'assets/aquascape.webp';
  sprites.src = 'assets/fish-atlas-clean.webp';

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
  }));

  let width = 1;
  let height = 1;
  let elapsed = 0;
  let previous = performance.now();
  let frame = 0;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pointer = { active: false, x: 0, y: 0, speed: 0, lastAt: 0 };

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
      context.globalAlpha = .7;
      context.drawImage(plants, (width - imageWidth) / 2, height - imageHeight,
        imageWidth, imageHeight);
      context.globalAlpha = 1;
    }

    if (sprites.naturalWidth) {
      const sx = sprites.naturalWidth / 1536;
      const sy = sprites.naturalHeight / 1024;
      const nominalWidth = Math.max(80, Math.min(width * .135, height * .26, 210));
      for (const f of fish) {
        const [cropX, cropY, cropW, cropH] = regions[f.sprite];
        const fishWidth = nominalWidth * f.size;
        const fishHeight = fishWidth * cropH / cropW;
        context.save();
        context.translate(f.x * width, f.y * height + Math.sin(elapsed * 1.4 + f.phase) * 7);
        if (f.vx < 0) context.scale(-1, 1);
        context.scale(1 + Math.sin(elapsed * 6.5 + f.phase) * .016, 1);
        context.globalAlpha = .92;
        context.drawImage(sprites, cropX * sx, cropY * sy, cropW * sx, cropH * sy,
          -fishWidth / 2, -fishHeight / 2, fishWidth, fishHeight);
        context.restore();
      }
    }

    // Fine glassy bubbles; keep these subtle so the original stars read through.
    context.lineWidth = 1;
    for (let i = 0; i < 25; i++) {
      const x = (.05 + ((i * 41) % 91) / 100) * width + Math.sin(elapsed + i) * 3;
      const y = ((i * .137 - elapsed * (.008 + i % 4 * .002)) % 1 + 1) % 1 * height;
      context.beginPath();
      context.arc(x, y, 1.5 + i % 3, 0, Math.PI * 2);
      context.strokeStyle = 'rgba(206,248,255,.24)';
      context.stroke();
    }
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

    for (const f of fish) {
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
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      const edge = Math.min(.16, Math.max(.075, 60 / width));
      if (f.x < edge || f.x > 1 - edge) f.vx = -f.vx;
      f.x = Math.max(edge, Math.min(1 - edge, f.x));
      f.y = Math.max(.09, Math.min(.87, f.y));
    }
    draw();
    if (!reducedMotion && !document.hidden) frame = requestAnimationFrame(tick);
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
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(frame);
    else if (!reducedMotion) { previous = performance.now(); frame = requestAnimationFrame(tick); }
  });
  plants.onload = draw;
  sprites.onload = draw;
  resize();
  if (!reducedMotion) frame = requestAnimationFrame(tick);
})();
