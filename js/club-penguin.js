// Self-contained single-player, Club Penguin-inspired snow playground.
// No server, accounts, multiplayer, or copyrighted game assets are required.
(function () {
  const windowPanel = document.querySelector('[data-window="club-penguin"]');
  const shortcut = document.getElementById('club-penguin-shortcut');
  const canvas = document.getElementById('penguin-game');
  const scoreLabel = document.getElementById('penguin-score');
  const message = document.getElementById('penguin-message');
  const throwButton = document.getElementById('penguin-snowball');
  const waveButton = document.getElementById('penguin-wave');
  if (!windowPanel || !canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = 960, H = 540;
  const sprite = new Image();
  sprite.src = 'assets/nostalgia/club-penguin/orange-penguin.png';
  let room = 'town';
  let points = 0;
  let running = false;
  let frameId = 0;
  let lastFrame = 0;
  let waveUntil = 0;
  const player = { x: 480, y: 405, targetX: 480, targetY: 405, direction: 1 };
  const keys = new Set();
  const fish = [];
  const snowballs = [];
  const flakes = Array.from({ length: 44 }, (_, i) => ({
    x: (i * 197 + 45) % W,
    y: (i * 137 + 91) % H,
    r: 1.2 + (i % 3),
    speed: 8 + (i % 7) * 3,
  }));

  function say(text) { message.textContent = text; }
  function positionFish() {
    fish.length = 0;
    for (let i = 0; i < 6; i++) fish.push({
      x: 105 + ((i * 181 + (room === 'rink' ? 79 : 0)) % 740),
      y: 315 + ((i * 59 + (room === 'hill' ? 30 : 0)) % 157),
      taken: false,
    });
  }
  positionFish();

  function open() {
    document.dispatchEvent(new CustomEvent('xp:open-window', { detail: { window: 'club-penguin' } }));
  }
  shortcut?.addEventListener('click', open);

  function setRoom(next) {
    if (!['town', 'rink', 'hill'].includes(next)) return;
    room = next;
    player.x = 480; player.y = 405;
    player.targetX = 480; player.targetY = 405;
    snowballs.length = 0;
    positionFish();
    document.querySelectorAll('[data-penguin-room]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.penguinRoom === next));
    });
    say(next === 'town' ? 'Welcome to Town! Find the fish!'
      : next === 'rink' ? 'Ice Rink! Slide over to collect fish.'
        : 'Ski Hill! Watch out for the snowdrifts.');
    render(performance.now());
  }
  document.querySelectorAll('[data-penguin-room]').forEach(button => {
    button.addEventListener('click', () => setRoom(button.dataset.penguinRoom));
  });

  function moveTo(x, y) {
    player.targetX = Math.max(45, Math.min(W - 45, x));
    player.targetY = Math.max(290, Math.min(H - 47, y));
    player.direction = player.targetX < player.x ? -1 : 1;
  }
  canvas.addEventListener('pointerdown', event => {
    const rect = canvas.getBoundingClientRect();
    moveTo((event.clientX - rect.left) * W / rect.width, (event.clientY - rect.top) * H / rect.height);
    canvas.focus({ preventScroll: true });
  });
  canvas.addEventListener('keydown', event => {
    const key = event.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', ' '].includes(key)) {
      event.preventDefault();
      if (key === ' ' && !event.repeat) throwSnowball();
      else keys.add(key);
    }
  });
  canvas.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
  canvas.addEventListener('blur', () => keys.clear());

  function throwSnowball() {
    const direction = player.direction;
    snowballs.push({ x: player.x + direction * 38, y: player.y - 40, vx: direction * 290, age: 0 });
    if (snowballs.length > 20) snowballs.shift();
    say('Whoosh! ❄');
  }
  throwButton?.addEventListener('click', throwSnowball);
  waveButton?.addEventListener('click', () => { waveUntil = performance.now() + 1250; say('Waddle on! 👋'); });

  function roundedRect(x, y, width, height, radius, fill, stroke) {
    ctx.beginPath(); ctx.roundRect(x, y, width, height, radius);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 3; ctx.stroke(); }
  }
  function ellipse(x, y, rx, ry, fill) {
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
  }
  function text(value, x, y, size, fill, stroke) {
    ctx.font = `bold ${size}px Tahoma, Arial, sans-serif`;
    ctx.textAlign = 'center';
    if (stroke) { ctx.lineWidth = Math.max(3, size / 4); ctx.strokeStyle = stroke; ctx.strokeText(value, x, y); }
    ctx.fillStyle = fill; ctx.fillText(value, x, y);
  }
  function roof(x, y, width, color) {
    ctx.beginPath(); ctx.moveTo(x - 15, y + 10); ctx.lineTo(x + width / 2, y - 75);
    ctx.lineTo(x + width + 15, y + 10); ctx.closePath(); ctx.fillStyle = color; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 9; ctx.stroke();
  }
  function roomScene() {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, room === 'hill' ? '#2d83bc' : '#3a9ecb');
    sky.addColorStop(.67, '#b4f4ff'); sky.addColorStop(1, '#f5fcff');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    ellipse(805, 82, 48, 48, '#fff4b3');
    for (const [x, y, w] of [[-95, 290, 350], [175, 250, 410], [490, 295, 410], [785, 266, 320]]) {
      ctx.beginPath(); ctx.moveTo(x, 350); ctx.lineTo(x + w * .5, y - 135); ctx.lineTo(x + w, 350);
      ctx.closePath(); ctx.fillStyle = '#b2e6f7'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + w * .33, y - 65); ctx.lineTo(x + w * .5, y - 135); ctx.lineTo(x + w * .67, y - 65);
      ctx.closePath(); ctx.fillStyle = '#f4ffff'; ctx.fill();
    }
    ctx.fillStyle = '#eafcff'; ctx.fillRect(0, 325, W, 215);
    ellipse(520, 467, 620, 170, '#d6f4ff');
    if (room === 'town') {
      roundedRect(95, 221, 242, 147, 14, '#f9af6b', '#9a603d');
      roof(95, 219, 242, '#d53d49');
      roundedRect(176, 287, 74, 81, 7, '#945739', '#fff2c1');
      roundedRect(115, 261, 48, 48, 7, '#85e2f8', '#fff5d2');
      roundedRect(271, 261, 48, 48, 7, '#85e2f8', '#fff5d2');
      roundedRect(616, 202, 246, 166, 12, '#abd2ec', '#5985ab');
      roof(616, 200, 246, '#4b82c7');
      roundedRect(669, 242, 138, 43, 8, '#ffda70', '#c68040');
      text('COFFEE', 738, 270, 23, '#6b3e25');
      for (const x of [636, 804]) roundedRect(x, 302, 40, 46, 5, '#fffbda', '#2e75a1');
      roundedRect(388, 328, 185, 20, 10, '#a6d6f2');
      text('TOWN', 482, 125, 47, '#fff', '#2c70a1');
    } else if (room === 'rink') {
      ellipse(480, 404, 360, 118, '#93dff9');
      ellipse(480, 411, 327, 98, '#c7f8ff');
      ctx.lineWidth = 7; ctx.strokeStyle = '#60a9dd';
      ctx.strokeRect(200, 296, 560, 170);
      ctx.beginPath(); ctx.arc(480, 381, 59, 0, Math.PI * 2); ctx.stroke();
      roundedRect(90, 252, 120, 17, 6, '#c65142');
      roundedRect(755, 252, 120, 17, 6, '#c65142');
      text('ICE RINK', 480, 122, 45, '#fff', '#2468a4');
    } else {
      ctx.beginPath(); ctx.moveTo(80, 385); ctx.lineTo(620, 169); ctx.lineTo(910, 385);
      ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.strokeStyle = '#9cdbf1'; ctx.lineWidth = 8; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(80, 480); ctx.lineTo(800, 254); ctx.strokeStyle = '#b1deee'; ctx.lineWidth = 34; ctx.stroke();
      for (const [x, y] of [[175, 327], [750, 300], [830, 365]]) {
        ctx.fillStyle = '#246c72';
        ctx.beginPath(); ctx.moveTo(x, y - 84); ctx.lineTo(x - 32, y); ctx.lineTo(x + 32, y); ctx.closePath(); ctx.fill();
        ctx.fillRect(x - 5, y - 2, 10, 24);
      }
      text('SKI HILL', 480, 119, 45, '#fff', '#266baf');
    }
    for (let i = 0; i < 9; i++) {
      const x = (i * 137 + 31) % W;
      ellipse(x, 496 + (i % 3) * 10, 23, 8, '#f4ffff');
    }
  }

  function drawFish(item, time) {
    if (item.taken) return;
    const y = item.y + Math.sin(time / 270 + item.x) * 5;
    ctx.save(); ctx.translate(item.x, y); ctx.rotate(-.1);
    ellipse(0, 0, 21, 11, '#ffca61');
    ctx.beginPath(); ctx.moveTo(-19, 0); ctx.lineTo(-33, -12); ctx.lineTo(-33, 12); ctx.closePath();
    ctx.fillStyle = '#f39749'; ctx.fill();
    ellipse(13, -3, 2.5, 2.5, '#1b4970');
    ctx.restore();
  }
  function drawPlayer(time) {
    ellipse(player.x, player.y + 6, 54, 12, '#4388af66');
    const moving = Math.hypot(player.targetX - player.x, player.targetY - player.y) > 5;
    const bob = moving ? Math.sin(time / 65) * 5 : Math.sin(time / 370) * 2;
    ctx.save(); ctx.translate(player.x, player.y - 87 + bob);
    ctx.scale(player.direction, 1);
    if (sprite.complete && sprite.naturalWidth) ctx.drawImage(sprite, -64, 0, 128, 90);
    else {
      ellipse(0, 42, 35, 45, '#f18a22'); ellipse(0, 45, 21, 30, '#fff');
      ellipse(-12, 12, 5, 7, '#101e2d'); ellipse(12, 12, 5, 7, '#101e2d');
    }
    if (time < waveUntil) {
      ctx.save(); ctx.rotate(Math.sin(time / 105) * .25);
      ctx.font = '42px sans-serif'; ctx.fillText('👋', 52, 7); ctx.restore();
    }
    ctx.restore();
    text('YOU', player.x, player.y - 107 + bob, 15, '#fff', '#226795');
  }
  function render(time = 0) {
    ctx.clearRect(0, 0, W, H);
    roomScene();
    fish.forEach(item => drawFish(item, time));
    snowballs.forEach(item => { ellipse(item.x, item.y, 10, 10, '#fff'); ellipse(item.x - 3, item.y - 3, 3, 3, '#c4f3ff'); });
    drawPlayer(time);
    for (const flake of flakes) ellipse(flake.x, flake.y, flake.r, flake.r, '#ffffffc8');
  }

  function tick(now) {
    if (!running) return;
    const delta = Math.min(.05, Math.max(0, (now - (lastFrame || now)) / 1000));
    lastFrame = now;
    if (!windowPanel.classList.contains('module-minimized') && !document.hidden) {
      let vx = 0, vy = 0;
      if (keys.has('arrowleft') || keys.has('a')) vx -= 1;
      if (keys.has('arrowright') || keys.has('d')) vx += 1;
      if (keys.has('arrowup') || keys.has('w')) vy -= 1;
      if (keys.has('arrowdown') || keys.has('s')) vy += 1;
      if (vx || vy) {
        const magnitude = Math.hypot(vx, vy);
        player.x = Math.max(45, Math.min(W - 45, player.x + (vx / magnitude) * 220 * delta));
        player.y = Math.max(290, Math.min(H - 47, player.y + (vy / magnitude) * 220 * delta));
        player.targetX = player.x; player.targetY = player.y;
        if (vx) player.direction = vx < 0 ? -1 : 1;
      } else {
        const dist = Math.hypot(player.targetX - player.x, player.targetY - player.y);
        if (dist > 1) {
          const step = Math.min(dist, 190 * delta);
          player.x += (player.targetX - player.x) / dist * step;
          player.y += (player.targetY - player.y) / dist * step;
        }
      }
      for (const item of fish) {
        if (!item.taken && Math.hypot(player.x - item.x, (player.y - 30) - item.y) < 48) {
          item.taken = true;
          points += 1; scoreLabel.textContent = `🐟 ${points}`;
          say(points % 6 === 0 ? 'All six fish! Change rooms to collect more. 🐟' : 'Nice catch! 🐟');
        }
      }
      for (const item of snowballs) { item.x += item.vx * delta; item.age += delta; }
      for (let i = snowballs.length - 1; i >= 0; i--) if (snowballs[i].age > 2.5) snowballs.splice(i, 1);
      flakes.forEach(flake => { flake.y += flake.speed * delta; if (flake.y > H) { flake.y = -5; flake.x = (flake.x + 173) % W; } });
      render(now);
    }
    frameId = requestAnimationFrame(tick);
  }
  function start() {
    if (running) return;
    running = true;
    lastFrame = 0;
    frameId = requestAnimationFrame(tick);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(frameId);
    keys.clear();
  }
  document.addEventListener('xp:window-opened', event => {
    if (event.detail?.window === 'club-penguin') start();
  });
  document.addEventListener('xp:closed', event => {
    if (event.detail?.window === 'club-penguin') stop();
  });
  sprite.addEventListener('load', () => render(performance.now()));
  render(0);
})();
