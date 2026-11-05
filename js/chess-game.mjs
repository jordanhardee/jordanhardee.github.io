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

function orderedMoves(game) {
  return game.moves({ verbose: true }).sort((a, b) =>
    ((b.captured ? values[b.captured] * 10 - values[b.piece] : 0) + (b.promotion ? 850 : 0) + (b.san.includes('+') ? 40 : 0)) -
    ((a.captured ? values[a.captured] * 10 - values[a.piece] : 0) + (a.promotion ? 850 : 0) + (a.san.includes('+') ? 40 : 0)));
}

function search(game, depth, alpha, beta, budget) {
  budget.nodes += 1;
  if (depth === 0 || game.isGameOver() || budget.nodes > budget.limit) return evaluateForBlack(game);
  const maximize = game.turn() === 'b';
  let best = maximize ? -Infinity : Infinity;
  for (const move of orderedMoves(game)) {
    game.move(move);
    const score = search(game, depth - 1, alpha, beta, budget);
    game.undo();
    best = maximize ? Math.max(best, score) : Math.min(best, score);
    if (maximize) alpha = Math.max(alpha, best);
    else beta = Math.min(beta, best);
    if (beta <= alpha || budget.nodes > budget.limit) break;
  }
  return best;
}

// 0 = deliberately forgiving beginner, 1 = one-ply, 2 = two-ply,
// 3 = capped three-ply alpha-beta. This is not a grandmaster engine.
export function chooseComputerMove(game, depth = 2) {
  if (game.isGameOver() || game.turn() !== 'b') return null;
  const moves = orderedMoves(game);
  if (depth <= 0) {
    // Beginners still see normal legal chess, but the opponent makes mistakes.
    return moves[Math.floor(Math.random() * moves.length)];
  }
  const budget = { nodes: 0, limit: depth >= 3 ? 6500 : 2400 };
  let bestScore = -Infinity, bestMove = null;
  for (const candidate of moves) {
    game.move(candidate);
    let score = search(game, Math.min(depth, 3) - 1, -Infinity, Infinity, budget);
    game.undo();
    score += Math.random() * (depth === 1 ? 20 : 1.5);
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
const coach = typeof document !== 'undefined' ? document.getElementById('chess-coach') : null;
const coachText = typeof document !== 'undefined' ? document.getElementById('chess-coach-text') : null;
const hintButton = typeof document !== 'undefined' ? document.getElementById('chess-hint') : null;

if (board && status && history && newButton && undoButton && level && coach && coachText && hintButton) {
  const game = new Chess();
  let selected = null;
  let legal = new Set();
  let pending = null;
  let hinted = null;
  let coachNote = 'Select a white piece to reveal legal moves, or tap Hint for a suggestion.';

  function hintForWhite() {
    if (game.turn() !== 'w' || game.isGameOver()) return null;
    let best = null, bestScore = -Infinity;
    for (const move of game.moves({ verbose: true })) {
      game.move(move);
      let score = -evaluateForBlack(game);
      if (game.isCheckmate()) score += 50000;
      if (move.captured) score += values[move.captured] * .15;
      if (move.san.includes('+')) score += 20;
      game.undo();
      if (score > bestScore) { best = move; bestScore = score; }
    }
    return best;
  }

  function explain(move) {
    if (move.san.includes('#')) return 'delivers checkmate';
    if (move.flags.includes('k') || move.flags.includes('q')) return 'castles to bring your king to safety';
    if (move.captured) return `captures a ${names[move.captured]}`;
    if (move.promotion) return 'promotes your pawn';
    if (move.san.includes('+')) return 'puts the king in check';
    if (['n', 'b'].includes(move.piece)) return `develops your ${names[move.piece]}`;
    return 'improves your position';
  }

  function updateStatus() {
    if (game.isCheckmate()) status.textContent = game.turn() === 'w' ? 'Checkmate — computer wins.' : 'Checkmate — you win!';
    else if (game.isDraw()) status.textContent = 'Drawn game.';
    else if (pending) status.textContent = 'Computer is thinking…';
    else status.textContent = `${game.turn() === 'w' ? 'Your move' : 'Computer to move'}${game.isCheck() ? ' — CHECK!' : selected ? ` · ${legal.size} legal destinations highlighted` : '.'}`;
  }

  function render() {
    const pieces = game.board();
    const last = game.history({ verbose: true }).at(-1);
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
        if (last && (last.from === square || last.to === square)) cell.classList.add('is-last-move');
        if (hinted?.from === square) cell.classList.add('is-hint-from');
        if (hinted?.to === square) cell.classList.add('is-hint-to');
        if (game.isCheck() && piece?.type === 'k' && piece.color === game.turn()) cell.classList.add('is-check');
        cell.dataset.square = square;
        if (row === 7) cell.dataset.file = 'abcdefgh'[col];
        if (col === 0) cell.dataset.rank = String(8 - row);
        cell.setAttribute('aria-label', `${square}: ${piece ? `${piece.color === 'w' ? 'white' : 'black'} ${names[piece.type]}` : 'empty'}${legal.has(square) ? ', legal destination' : ''}`);
        if (piece) {
          const image = document.createElement('img');
          image.className = 'chess-piece-image';
          image.src = `assets/chess/${piece.color}${piece.type.toUpperCase()}.svg`;
          image.alt = '';
          image.draggable = false;
          image.onerror = () => {
            const symbol = document.createElement('span');
            symbol.className = `chess-piece is-${piece.color === 'w' ? 'white' : 'black'}`;
            symbol.textContent = symbols[piece.color][piece.type];
            image.replaceWith(symbol);
          };
          cell.appendChild(image);
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
      line.textContent = `${Math.floor(i / 2) + 1}. ${moves[i]} ${moves[i + 1] || '…'}`;
      history.appendChild(line);
    }
    undoButton.disabled = !moves.length;
    hintButton.disabled = !coach.checked || Boolean(pending) || game.isGameOver() || game.turn() !== 'w';
    coachText.textContent = coach.checked ? coachNote : 'Coach is off. Play on your own — turn it on any time.';
    updateStatus();
  }

  function chooseSquare(square) {
    if (pending || game.isGameOver() || game.turn() !== 'w') return;
    const piece = game.get(square);
    if (selected && legal.has(square)) {
      const move = game.move({ from: selected, to: square, promotion: 'q' });
      selected = null;
      legal.clear();
      hinted = null;
      coachNote = `${move.san} — ${explain(move)}. ${game.isCheck() ? 'Check!' : 'Watch how Black responds.'}`;
      if (!game.isGameOver()) {
        pending = window.setTimeout(() => {
          pending = null;
          const computerMove = chooseComputerMove(game, Number(level.value));
          if (computerMove) game.move(computerMove);
          coachNote = computerMove
            ? `Black played ${computerMove.san}. ${game.isCheck() ? 'Your king is in check — respond to the threat.' : 'Look for captures and undefended pieces.'}`
            : coachNote;
          render();
        }, 280);
      }
      render();
      return;
    }
    selected = piece?.color === 'w' ? square : null;
    legal = new Set(selected ? game.moves({ square: selected, verbose: true }).map(move => move.to) : []);
    hinted = null;
    if (coach.checked) coachNote = selected
      ? `${names[piece.type][0].toUpperCase() + names[piece.type].slice(1)} on ${selected}: ${legal.size} legal moves. Tap a highlighted destination.`
      : 'Choose a white piece or tap Hint for a suggested move.';
    render();
  }

  hintButton.addEventListener('click', () => {
    if (!coach.checked || pending || game.turn() !== 'w' || game.isGameOver()) return;
    const move = hintForWhite();
    if (!move) return;
    hinted = { from: move.from, to: move.to };
    selected = move.from;
    legal = new Set(game.moves({ square: selected, verbose: true }).map(option => option.to));
    coachNote = `TRY ${move.san}: ${explain(move)}. Follow the blue-marked squares. This is a suggestion, not a guaranteed best move.`;
    render();
  });
  coach.addEventListener('change', () => { hinted = null; render(); });
  level.addEventListener('change', () => {
    if (level.value === '0') coach.checked = true;
    coachNote = `${level.selectedOptions[0].textContent} selected. Changes take effect on Black's next turn.`;
    render();
  });

  newButton.addEventListener('click', () => {
    if (pending) window.clearTimeout(pending);
    pending = null;
    game.reset();
    selected = null;
    legal.clear();
    hinted = null;
    coachNote = 'New game. Control the center, develop pieces, and protect your king.';
    render();
  });
  undoButton.addEventListener('click', () => {
    if (pending) { window.clearTimeout(pending); pending = null; game.undo(); }
    else { game.undo(); if (game.turn() === 'b') game.undo(); }
    selected = null;
    legal.clear();
    hinted = null;
    coachNote = 'Last turn undone. Take a different approach.';
    render();
  });
  render();
}
