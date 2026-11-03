import { STAGE_WIDTH, STAGE_HEIGHT, clampToFloor, facingForVector, walkToward } from './club-penguin-motion.mjs';

// Recreates the original click-to-waddle interaction without accounts or a server.
// The avatar frames are composed exclusively from archived original Flash sprites.
const viewport = document.querySelector('.cp-game-viewport');
const avatar = document.getElementById('cp-avatar');
const sprite = document.getElementById('cp-avatar-sprite');

if (viewport && avatar && sprite) {
  const keys = new Set();
  const movementKeys = new Set(['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd']);
  const keyVector = {
    arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1],
    arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0],
  };
  const imageBase = '/assets/clubpenguin/avatar/';
  const speed = 155; // Original-stage pixels per second; independent of window size.
  let position = { x: 310, y: 393 };
  let destination = null;
  let direction = 1;
  let flip = false;
  let spriteKey = '';
  let previousTime = 0;

  // Load the five genuine idle poses and walking cycles for instant direction changes.
  for (let index = 1; index <= 5; index++) {
    for (const action of ['idle', 'walk']) {
      const frame = new Image();
      frame.src = `${imageBase}${action}-${index}.webp`;
    }
  }

  function draw(walking) {
    avatar.style.left = `${position.x / STAGE_WIDTH * 100}%`;
    avatar.style.top = `${position.y / STAGE_HEIGHT * 100}%`;
    avatar.style.setProperty('--penguin-scale', String(0.72 + (position.y - 260) / 185 * 0.34));
    avatar.style.zIndex = position.y < 393 ? '2' : '4';
    avatar.classList.toggle('is-facing-right', flip);
    const key = `${walking ? 'walk' : 'idle'}-${direction}`;
    if (key !== spriteKey) {
      sprite.src = `${imageBase}${key}.webp`;
      spriteKey = key;
    }
  }

  viewport.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const rect = viewport.getBoundingClientRect();
    destination = clampToFloor(
      (event.clientX - rect.left) / rect.width * STAGE_WIDTH,
      (event.clientY - rect.top) / rect.height * STAGE_HEIGHT
    );
    event.preventDefault();
    // The isolated room SWF has no backend for doors or other room navigation.
    event.stopPropagation();
  }, true);

  window.addEventListener('keydown', event => {
    const key = event.key.toLowerCase();
    if (event.metaKey || event.ctrlKey || event.altKey || !movementKeys.has(key)) return;
    event.preventDefault();
    // A quick tap still waddles a visible step; holding the key continues
    // smoothly in requestAnimationFrame rather than relying on OS key repeat.
    if (!keys.has(key)) {
      const [stepX, stepY] = keyVector[key];
      position = clampToFloor(position.x + stepX * 12, position.y + stepY * 12);
      ({ direction, flip } = facingForVector(stepX, stepY));
      draw(true);
    }
    keys.add(key);
    destination = null;
  }, true);
  window.addEventListener('keyup', event => {
    const key = event.key.toLowerCase();
    if (!movementKeys.has(key)) return;
    event.preventDefault();
    keys.delete(key);
  }, true);
  window.addEventListener('blur', () => keys.clear());

  function animate(now) {
    const dt = previousTime ? Math.min((now - previousTime) / 1000, 0.05) : 0;
    previousTime = now;
    const dx = Number(keys.has('arrowright') || keys.has('d')) - Number(keys.has('arrowleft') || keys.has('a'));
    const dy = Number(keys.has('arrowdown') || keys.has('s')) - Number(keys.has('arrowup') || keys.has('w'));
    let walking = false;

    if (dx || dy) {
      const norm = Math.hypot(dx, dy);
      const next = clampToFloor(position.x + dx / norm * speed * dt,
        position.y + dy / norm * speed * dt);
      walking = Math.hypot(next.x - position.x, next.y - position.y) > 0.01;
      position = next;
      ({ direction, flip } = facingForVector(dx, dy));
    } else if (destination) {
      const vector = { x: destination.x - position.x, y: destination.y - position.y };
      ({ direction, flip } = facingForVector(vector.x, vector.y));
      const next = walkToward(position, destination, speed * dt);
      walking = !next.arrived;
      position = { x: next.x, y: next.y };
      if (next.arrived) destination = null;
    }
    draw(walking);
    requestAnimationFrame(animate);
  }

  draw(false);
  requestAnimationFrame(animate);
}
