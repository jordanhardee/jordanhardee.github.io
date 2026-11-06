// Pure rules for Brainrot Bonanza: five reels, three rows, five fixed paylines.
// All credits are imaginary, and a spin's outcome is chosen before animation.
export const SYMBOLS = [
  { id: 'skibidi', emoji: '🚽', label: 'SKIBIDI', weight: 23, pays: [0, 0, 2, 5, 12] },
  { id: 'rizz', emoji: '😎', label: 'RIZZ', weight: 21, pays: [0, 0, 3, 7, 16] },
  { id: 'sigma', emoji: '🗿', label: 'SIGMA', weight: 18, pays: [0, 0, 4, 9, 22] },
  { id: 'ohio', emoji: '🌽', label: 'OHIO', weight: 16, pays: [0, 0, 5, 12, 28] },
  { id: 'aura', emoji: '🔥', label: 'AURA', weight: 13, pays: [0, 0, 6, 15, 36] },
  { id: 'sixseven', emoji: '6️⃣', label: '6–7', weight: 10, pays: [0, 0, 8, 22, 55] },
  { id: 'brain', emoji: '🧠', label: 'BRAINROT', weight: 7, pays: [0, 0, 10, 30, 80] },
  { id: 'wild', emoji: '💎', label: 'WILD', weight: 3, pays: [0, 0, 18, 65, 250] },
];

export const LINES = [
  [1, 1, 1, 1, 1], // Middle
  [0, 0, 0, 0, 0], // Top
  [2, 2, 2, 2, 2], // Bottom
  [0, 1, 2, 1, 0], // V
  [2, 1, 0, 1, 2], // ^
];

const allWeight = SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0);

export function drawSymbol(random = Math.random) {
  const number = Math.min(0.999999999, Math.max(0, random())) * allWeight;
  let cursor = 0;
  for (const symbol of SYMBOLS) {
    cursor += symbol.weight;
    if (number < cursor) return symbol.id;
  }
  return SYMBOLS[0].id;
}

// board[reel][row], so visual and payout calculations use the same positions.
export function makeBoard(random = Math.random) {
  return Array.from({ length: 5 }, () => Array.from({ length: 3 }, () => drawSymbol(random)));
}

export function evaluateBoard(board, bet) {
  if (!Array.isArray(board) || board.length !== 5 || board.some(reel => !Array.isArray(reel) || reel.length !== 3)) {
    throw new TypeError('A board must have five reels and three symbols per reel');
  }
  if (!Number.isFinite(bet) || bet <= 0) throw new RangeError('Bet must be positive');
  const stake = bet / LINES.length;
  const wins = [];
  LINES.forEach((line, lineIndex) => {
    const visible = line.map((row, reel) => board[reel][row]);
    let best = null;
    for (const candidate of SYMBOLS) {
      let count = 0;
      for (const id of visible) {
        if (id !== candidate.id && id !== 'wild') break;
        count += 1;
      }
      if (count < 3) continue;
      const payout = Math.floor(stake * candidate.pays[count - 1]);
      if (!best || payout > best.payout) best = { symbol: candidate.id, count, payout };
    }
    if (best) wins.push({ line: lineIndex, ...best });
  });
  const scatter = board.flat().filter(symbol => symbol === 'brain').length;
  return {
    wins,
    payout: wins.reduce((sum, win) => sum + win.payout, 0),
    freeSpins: scatter >= 3 ? 2 : 0,
  };
}
