import { Chess } from './vendor/chess.mjs';

// Original touch-friendly chess UI with a small, entirely local computer AI.
// chess.js (BSD-2-Clause) handles legality, castling, en passant and promotion.
const values = { p: 100, n: 320, b: 335, r: 510, q: 900, k: 0 };
const symbols = {
  w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
  b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
};
const names = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' };

export function evaluateForBlack(game) {
  if (game.isCheckmate()) return game.turn() === 'w' ? 100000 : -100000;
  if (game.isDraw()) return 0;
  let score = 0;
  for (const row of game.board()) {
    for (const piece of row) {
      if (!piece) continue;
      const file = piece.square.charCodeAt(0) - 97;
      const rank = Number(piece.square[1]) - 1;
      const centrality = (3.5 - Math.abs(file - 3.5)) + (3.5 - Math.abs(rank - 3.5));
      const pawnAdvance = piece.type === 'p' ? (piece.color === 'b' ? 6 - rank : rank - 1) * 2 : 0;
      const value = values[piece.type] + centrality * (piece.type === 'n' || piece.type === 'b' ? 5 : 1) + pawnAdvance;
      score += piece.color === 'b' ? value : -value;
    }
  }
  if (game.isCheck()) score += game.turn() === 'w' ? 25 : -25;
  return score;
}

export function chooseComputerMove(game, depth = 2) {
  if (game.isGameOver() || game.turn() !== 'b') return null;
  const moves = game.moves({ verbose: true });
  let bestScore = -Infinity, bestMove = null;
  for (const candidate of moves) {
    game.move(candidate);
    let score = evaluateForBlack(game);
    if (depth >= 2 && !game.isGameOver()) {
      let worstReply = Infinity;
      for (const reply of game.moves({ verbose: true })) {
        game.move(reply);
        worstReply = Math.min(worstReply, evaluateForBlack(game));
        game.undo();
      }
      score = worstReply;
    }
    game.undo();
    // Small random variation between equal moves keeps casual games different.
    score += Math.random() * 1.5;
    if (score > bestScore) { bestScore = score; bestMove = candidate; }
  }
  return bestMove;
}

const board = typeof document !== 'undefined' ? document.getElementById('chess-board') : null;
const status = typeof document !== 'undefined' ? document.getElementById('chess-status') : null;
const history = typeof document !== 'undefined' ? document.getElementById('chess-history') : null;
const newButton = typeof document !== 'undefined' ? document.getElementById('chess-new') : null;
const undoButton = typeof document !== 'undefined' ? document.getElementById('chess-undo') : null;
const level = typeof document !== 'undefined' ? document.getElementById('chess-level') : null;

if (board && status && history && newButton && undoButton && level) {
  const game = new Chess();
  let selected = null;
  let legal = new Set();
  let pending = null;

  function updateStatus() {
    if (game.isCheckmate()) status.textContent = game.turn() === 'w' ? 'Checkmate — computer wins.' : 'Checkmate — you win!';
    else if (game.isDraw()) status.textContent = 'Drawn game.';
    else if (pending) status.textContent = 'Computer is thinking…';
    else status.textContent = `${game.turn() === 'w' ? 'Your move' : 'Computer to move'}${game.isCheck() ? ' — check!' : '.'}`;
  }

  function render() {
    const pieces = game.board();
    const cells = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = pieces[row][col];
        const square = `${'abcdefgh'[col]}${8 - row}`;
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = `chess-square ${(row + col) % 2 ? 'is-dark' : 'is-light'}`;
        if (selected === square) cell.classList.add('is-selected');
        if (legal.has(square)) cell.classList.add('is-legal');
        cell.dataset.square = square;
        cell.setAttribute('aria-label', `${square}: ${piece ? `${piece.color === 'w' ? 'white' : 'black'} ${names[piece.type]}` : 'empty'}${legal.has(square) ? ', legal destination' : ''}`);
        if (piece) {
          const symbol = document.createElement('span');
          symbol.className = `chess-piece is-${piece.color === 'w' ? 'white' : 'black'}`;
          symbol.textContent = symbols[piece.color][piece.type];
          cell.appendChild(symbol);
        } else if (legal.has(square)) {
          const hint = document.createElement('span');
          hint.className = 'chess-move-hint';
          cell.appendChild(hint);
        }
        cell.addEventListener('click', () => chooseSquare(square));
        cells.push(cell);
      }
    }
    board.replaceChildren(...cells);
    const moves = game.history();
    history.replaceChildren();
    for (let i = 0; i < moves.length; i += 2) {
      const line = document.createElement('li');
      line.textContent = `${moves[i]} ${moves[i + 1] || ''}`.trim();
      history.appendChild(line);
    }
    undoButton.disabled = !moves.length;
    updateStatus();
  }

  function chooseSquare(square) {
    if (pending || game.isGameOver() || game.turn() !== 'w') return;
    const piece = game.get(square);
    if (selected && legal.has(square)) {
      game.move({ from: selected, to: square, promotion: 'q' });
      selected = null;
      legal.clear();
      if (!game.isGameOver()) {
        pending = window.setTimeout(() => {
          pending = null;
          const computerMove = chooseComputerMove(game, Number(level.value));
          if (computerMove) game.move(computerMove);
          render();
        }, 280);
      }
      render();
      return;
    }
    selected = piece?.color === 'w' ? square : null;
    legal = new Set(selected ? game.moves({ square: selected, verbose: true }).map(move => move.to) : []);
    render();
  }

  newButton.addEventListener('click', () => {
    if (pending) window.clearTimeout(pending);
    pending = null;
    game.reset();
    selected = null;
    legal.clear();
    render();
  });
  undoButton.addEventListener('click', () => {
    if (pending) { window.clearTimeout(pending); pending = null; game.undo(); }
    else { game.undo(); if (game.turn() === 'b') game.undo(); }
    selected = null;
    legal.clear();
    render();
  });
  render();
}
