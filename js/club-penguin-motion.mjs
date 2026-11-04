// Local-only walking rules for the Coffee Shop (stage coordinates: 760 x 480).
// The floor narrows toward the back and widens toward the front of the room.
export const STAGE_WIDTH = 760;
export const STAGE_HEIGHT = 480;
const FLOOR = [
  { y: 260, left: 205, right: 425 },
  { y: 320, left: 180, right: 465 },
  { y: 380, left: 75, right: 625 },
  { y: 445, left: 24, right: 728 },
];

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

export function floorBounds(y) {
  const boundedY = clamp(y, FLOOR[0].y, FLOOR[FLOOR.length - 1].y);
  const nextIndex = FLOOR.findIndex(point => point.y >= boundedY);
  const next = FLOOR[Math.max(0, nextIndex)];
  const previous = FLOOR[Math.max(0, nextIndex - 1)];
  const t = next.y === previous.y ? 0 : (boundedY - previous.y) / (next.y - previous.y);
  return {
    left: previous.left + (next.left - previous.left) * t,
    right: previous.right + (next.right - previous.right) * t,
  };
}

export function clampToFloor(x, y) {
  const boundedY = clamp(y, FLOOR[0].y, FLOOR[FLOOR.length - 1].y);
  const { left, right } = floorBounds(boundedY);
  return { x: clamp(x, left, right), y: boundedY };
}

export function facingForVector(dx, dy) {
  if (dx === 0 && dy === 0) return { direction: 1, flip: false };
  const ax = Math.abs(dx), ay = Math.abs(dy);
  // Sprite directions are front, front-side, side, back-side, back.
  // The archived art faces left, so the right-facing poses are mirrored.
  const direction = ay >= ax * 1.75 ? (dy >= 0 ? 1 : 5)
    : ax >= ay * 1.75 ? 3 : (dy >= 0 ? 2 : 4);
  return { direction, flip: dx > 0 };
}

export function walkToward(position, destination, distance) {
  const dx = destination.x - position.x;
  const dy = destination.y - position.y;
  const remaining = Math.hypot(dx, dy);
  if (remaining < 0.001 || distance >= remaining) return { ...destination, arrived: true };
  const next = clampToFloor(position.x + dx / remaining * distance,
    position.y + dy / remaining * distance);
  return { ...next, arrived: Math.hypot(destination.x - next.x, destination.y - next.y) < 1 };
}

// A pet catches up only when it is farther away than the trailing gap.
// Do not return an artificial animation step after it has caught up.
export function followWithGap(follower, leader, maxStep, gap) {
  const dx = leader.x - follower.x;
  const dy = leader.y - follower.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= gap || maxStep <= 0) return { ...follower, moved: false };
  const step = Math.min(distance - gap, maxStep);
  const next = clampToFloor(follower.x + dx / distance * step,
    follower.y + dy / distance * step);
  return { ...next, moved: Math.hypot(next.x - follower.x, next.y - follower.y) > 0.05 };
}
