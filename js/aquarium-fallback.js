// Independent Canvas 2D aquarium. This script intentionally has no imports:
// fish remain visible on phones even if the optional 3D module fails to load.
(function () {
  const canvas = document.getElementById('aquarium-fallback-canvas');
  const water = canvas && canvas.parentElement;
  const ctx = canvas && canvas.getContext('2d');
  if (!ctx || !water) return;

  const fish = [
    [.16, .35, .042, '#ffcf52', '#f58242', .94],
    [.73, .20, -.033, '#9de6fa', '#367ad5', .72],
    [.56, .58, .039, '#ff9eb9', '#ee727f', .81],
    [.83, .48, -.037, '#c4f278', '#4ca673', .67],
    [.27, .69, .029, '#e0b7fa', '#9471cc', .62],
    [.41, .18, -.038, '#e5da9f', '#324852', .65],
    [.79, .75, .035, '#ffe47f', '#557fdd', .57],
    [.13, .78, .032, '#f3a289', '#e76b58', .59],
    [.59, .32, -.03, '#8ce3b0', '#337c73', .65],
  ].map(([x, y, speed, body, fins, size], i) => ({ x, y, speed, body, fins, size, phase: i * 1.7 }));

  // These original photographic cutouts give the tank a naturalistic look.
  // The previous painted scene remains as a fallback while images load.
  const aquascapeArt = new Image();
  const fishAtlas = new Image();
  // WebP keeps the full-resolution artwork small enough to ship intact.
  aquascapeArt.src = 'assets/aquascape.webp';
  fishAtlas.src = 'assets/fish-atlas.webp';
  aquascapeArt.onload = () => draw();
  fishAtlas.onload = () => draw();

  let width = 1;
  let height = 1;
  let phase = 0;
  let frame = 0;
  let last = performance.now();
  let visible = true;
  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pointer = { active: false, x: 0, y: 0, speed: 0, last: 0 };

  function resize() {
    width = Math.max(1, water.clientWidth);
    height = Math.max(1, water.clientHeight);
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    draw();
  }

  function draw() {
    if (aquascapeArt.naturalWidth && fishAtlas.naturalWidth) {
      drawPhotographicScene();
      return;
    }
    ctx.clearRect(0, 0, width, height);

    // A warm gravel bed and an original, rough driftwood silhouette.
    const sand = ctx.createLinearGradient(0, height * .82, 0, height);
    sand.addColorStop(0, 'rgba(219,195,144,0)');
    sand.addColorStop(1, '#c0ac83');
    ctx.fillStyle = sand;
    ctx.beginPath();
    ctx.moveTo(0, height * .91);
    ctx.quadraticCurveTo(width * .45, height * .86, width, height * .93);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.fill();

    ctx.fillStyle = '#86664d';
    ctx.beginPath();
    ctx.moveTo(width * .29, height * .84);
    ctx.bezierCurveTo(width * .31, height * .67, width * .43, height * .58, width * .52, height * .62);
    ctx.bezierCurveTo(width * .60, height * .65, width * .68, height * .77, width * .72, height * .87);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#76513c';
    ctx.lineWidth = Math.max(5, width * .026);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(width * .44, height * .74);
    ctx.lineTo(width * .31, height * .56);
    ctx.moveTo(width * .52, height * .75);
    ctx.lineTo(width * .66, height * .55);
    ctx.stroke();

    // Dense, swaying aquatic plants in greens and coral pink.
    const stems = [.025, .055, .085, .12, .17, .23, .33, .62, .73, .78, .83, .87, .92, .96];
    stems.forEach((base, i) => {
      const red = i >= 9 && i <= 12;
      const tip = height * (.38 + (i % 4) * .075);
      const sway = Math.sin(phase * 1.25 + i * .83) * width * .012;
      ctx.strokeStyle = red ? '#ea6c80' : i % 2 ? '#61dd89' : '#159e72';
      ctx.lineWidth = Math.max(2, width * (.009 + (i % 3) * .002));
      ctx.beginPath();
      ctx.moveTo(base * width, height * .96);
      ctx.bezierCurveTo(base * width - 9, height * .72, base * width + sway, height * .55, base * width + sway * 2, tip);
      ctx.stroke();
      for (const fraction of [.36, .56, .75]) {
        const y = height * .96 + (tip - height * .96) * fraction;
        const x = base * width + sway * fraction;
        ctx.fillStyle = red ? '#f68c92' : (i % 2 ? '#54e58e' : '#2bc184');
        ctx.beginPath();
        ctx.ellipse(x + (i % 2 ? 5 : -5), y, Math.max(6, width * .027), 3, i % 2 ? -.5 : .5, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    for (let i = 0; i < 45; i++) {
      const x = ((i * 53 + 29) % 101) / 101 * width;
      const y = height * (.94 + (i % 5) * .013);
      ctx.fillStyle = ['#e7d8b8', '#87a7a3', '#b9967c', '#f3e2d0'][i % 4];
      ctx.beginPath();
      ctx.ellipse(x, y, 2 + i % 4, 1.4 + i % 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < 20; i++) {
      const x = (.10 + ((i * 37) % 81) / 100) * width + Math.sin(phase + i) * 3;
      const y = ((i * .137 - phase * (.035 + (i % 3) * .007)) % 1 + 1) % 1 * height;
      ctx.strokeStyle = 'rgba(225,255,255,.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, 1.7 + i % 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    fish.forEach((f) => {
      const scale = f.size * Math.min(1.3, width / 320);
      ctx.save();
      ctx.translate(f.x * width, f.y * height + Math.sin(phase * 2 + f.phase) * 2.5);
      if (f.speed < 0) ctx.scale(-1, 1);
      ctx.scale(scale, scale);
      ctx.fillStyle = f.fins;
      ctx.beginPath();
      ctx.moveTo(-16, 0);
      ctx.lineTo(-39, -16 + Math.sin(phase * 9 + f.phase) * 4);
      ctx.lineTo(-31, 0);
      ctx.lineTo(-39, 16 - Math.sin(phase * 9 + f.phase) * 4);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-13, -6);
      ctx.lineTo(-5, -18);
      ctx.lineTo(8, -7);
      ctx.fill();
      const sheen = ctx.createLinearGradient(-18, -12, 17, 12);
      sheen.addColorStop(0, '#fff5d8');
      sheen.addColorStop(.35, f.body);
      sheen.addColorStop(1, f.fins);
      ctx.fillStyle = sheen;
      ctx.beginPath();
      ctx.ellipse(0, 0, 22, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      if (f.phase === 8.5 || f.phase === 10.2) {
        ctx.strokeStyle = '#253e4d';
        ctx.lineWidth = 2.8;
        for (const x of [-8, 0, 8]) {
          ctx.beginPath(); ctx.moveTo(x, -10); ctx.lineTo(x - 2, 10); ctx.stroke();
        }
      }
      ctx.fillStyle = '#fffef2';
      ctx.beginPath(); ctx.arc(11, -4, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#09243b';
      ctx.beginPath(); ctx.arc(12, -4, 2.1, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
  }

  function drawPhotographicScene() {
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(aquascapeArt, 0, 0, width, height);

    // Fine bubbles add movement without hiding the stars through the water.
    for (let i = 0; i < 17; i++) {
      const x = (.09 + ((i * 31) % 83) / 100) * width + Math.sin(phase * 1.1 + i) * 2;
      const y = ((i * .139 - phase * (.04 + (i % 3) * .008)) % 1 + 1) % 1 * height;
      ctx.strokeStyle = 'rgba(210,255,255,.38)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, 1.3 + i % 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Each cell in the 3x3 atlas is a different, original fish cutout.
    const cellWidth = fishAtlas.naturalWidth / 3;
    const cellHeight = fishAtlas.naturalHeight / 3;
    fish.forEach((f, i) => {
      const destinationWidth = width * (0.19 + f.size * .028);
      const destinationHeight = destinationWidth * cellHeight / cellWidth;
      const col = i % 3;
      const row = Math.floor(i / 3);
      ctx.save();
      ctx.translate(f.x * width, f.y * height + Math.sin(phase * 1.7 + f.phase) * 2);
      if (f.speed < 0) ctx.scale(-1, 1);
      ctx.scale(1 + Math.sin(phase * 8 + f.phase) * .018, 1);
      ctx.drawImage(
        fishAtlas, col * cellWidth, row * cellHeight, cellWidth, cellHeight,
        -destinationWidth / 2, -destinationHeight / 2,
        destinationWidth, destinationHeight
      );
      ctx.restore();
    });
  }

  function tick(now) {
    frame = 0;
    const dt = Math.min(.05, Math.max(0, (now - last) / 1000));
    last = now;
    phase += dt;
    fish.forEach((f) => {
      if (pointer.active) {
        const dx = pointer.x - f.x, dy = pointer.y - f.y;
        const distance = Math.max(.05, Math.hypot(dx, dy));
        if (distance < .36) {
          const force = pointer.speed > .001 ? -.17 : .045;
          f.speed += dx / distance * force * dt;
          f.y += dy / distance * force * dt * .4;
        }
      }
      f.speed = Math.max(-.16, Math.min(.16, f.speed));
      f.x += f.speed * dt;
      // Leave room for the whole fish sprite, including its nose and tail.
      if (f.x < .16 || f.x > .84) f.speed = -f.speed;
      f.x = Math.max(.16, Math.min(.84, f.x));
      f.y = Math.max(.14, Math.min(.84, f.y));
    });
    draw();
    if (!reducedMotion && visible && !document.hidden) frame = requestAnimationFrame(tick);
  }

  water.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch') return;
    const bounds = water.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    const now = performance.now();
    pointer.speed = pointer.last ? Math.hypot(x - pointer.x, y - pointer.y) / Math.max(1, now - pointer.last) : 0;
    Object.assign(pointer, { active: true, x, y, last: now });
  });
  water.addEventListener('pointerleave', () => { pointer.active = false; });
  water.addEventListener('pointerdown', (event) => {
    const b = water.getBoundingClientRect();
    pointer.x = (event.clientX - b.left) / b.width;
    pointer.y = (event.clientY - b.top) / b.height;
    pointer.speed = 0;
    pointer.active = true;
    setTimeout(() => { pointer.active = false; }, 1500);
  });

  if (window.ResizeObserver) new ResizeObserver(resize).observe(water);
  else window.addEventListener('resize', resize);
  if (window.IntersectionObserver) new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible) { cancelAnimationFrame(frame); frame = 0; }
    else if (!frame && !reducedMotion) { last = performance.now(); frame = requestAnimationFrame(tick); }
  }).observe(water);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
    else if (visible && !frame && !reducedMotion) { last = performance.now(); frame = requestAnimationFrame(tick); }
  });

  resize();
  if (!reducedMotion) frame = requestAnimationFrame(tick);
})();
