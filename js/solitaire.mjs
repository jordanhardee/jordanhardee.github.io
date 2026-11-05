import { shuffledDeck, isRed, makeCardElement, SUITS, canStackTableau, canStackFoundation } from './cards-core.mjs';

// Draw-one Klondike: pointer-based stack dragging works with mouse, pen and touch.
const stockView = document.getElementById('solitaire-stock');
const wasteView = document.getElementById('solitaire-waste');
const foundationView = document.getElementById('solitaire-foundations');
const tableauView = document.getElementById('solitaire-tableau');
const status = document.getElementById('solitaire-status');
const newButton = document.getElementById('solitaire-new');
const undoButton = document.getElementById('solitaire-undo');

if (stockView && wasteView && foundationView && tableauView && newButton && undoButton) {
  let stock = [], waste = [], foundations = [], tableau = [], moves = 0;
  let selection = null;
  let undoStack = [];
  let pointerDrag = null;
  let suppressClickUntil = 0;

  function sourcePile(source) {
    if (source.area === 'waste') return waste;
    if (source.area === 'foundation') return foundations[source.pile];
    if (source.area === 'tableau') return tableau[source.pile];
    return null;
  }

  function sequence(source) {
    const pile = sourcePile(source);
    if (!pile || source.index < 0 || source.index >= pile.length) return null;
    if (source.area !== 'tableau' && source.index !== pile.length - 1) return null;
    const cards = pile.slice(source.index);
    if (cards.some(card => !card.faceUp)) return null;
    for (let i = 1; i < cards.length; i += 1) {
      if (cards[i].rank !== cards[i - 1].rank - 1 || isRed(cards[i]) === isRed(cards[i - 1])) return null;
    }
    return cards;
  }

  function canMove(source, targetArea, targetIndex) {
    const cards = sequence(source);
    if (!cards || !cards.length) return false;
    if (targetArea === 'tableau') {
      if (source.area === 'tableau' && source.pile === targetIndex) return false;
      const pile = tableau[targetIndex];
      const top = pile.at(-1);
      return (!top || top.faceUp) && canStackTableau(cards[0], top);
    }
    if (targetArea === 'foundation' && cards.length === 1) {
      if (source.area === 'foundation') return false;
      const top = foundations[targetIndex].at(-1);
      return canStackFoundation(cards[0], top, targetIndex);
    }
    return false;
  }

  function remember() {
    undoStack.push(JSON.stringify({ stock, waste, foundations, tableau, moves }));
    if (undoStack.length > 100) undoStack.shift();
  }

  function tryMove(source, targetArea, targetIndex) {
    if (!canMove(source, targetArea, targetIndex)) return false;
    remember();
    const from = sourcePile(source);
    const moving = from.splice(source.index);
    const destination = targetArea === 'tableau' ? tableau[targetIndex] : foundations[targetIndex];
    destination.push(...moving);
    if (source.area === 'tableau' && from.length && !from.at(-1).faceUp) from.at(-1).faceUp = true;
    moves += 1;
    selection = null;
    render();
    return true;
  }

  function selectOrMove(source) {
    if (performance.now() < suppressClickUntil) return;
    if (selection && selection.area === source.area && selection.pile === source.pile && selection.index === source.index) {
      selection = null;
      render();
      return;
    }
    if (selection && (source.area === 'tableau' || source.area === 'foundation') && tryMove(selection, source.area, source.pile)) return;
    selection = sequence(source) ? source : null;
    render();
  }

  function moveToFoundation(source) {
    for (let i = 0; i < 4; i += 1) if (tryMove(source, 'foundation', i)) return;
  }

  function attachDrag(cardEl, source) {
    if (!sequence(source)) return;
    // Native HTML drag-and-drop creates only a single-card image for tableau
    // runs and is unreliable in iOS Safari. Pointer events unify all devices.
    cardEl.draggable = false;
    cardEl.classList.add('is-draggable');
    cardEl.addEventListener('pointerdown', event => {
      if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
      pointerDrag = {
        source, cardEl, pointerId: event.pointerId,
        startX: event.clientX, startY: event.clientY,
        x: event.clientX, y: event.clientY, started: false,
        ghost: null, target: null,
      };
      try { cardEl.setPointerCapture(event.pointerId); } catch { /* Safari fallback: window listeners. */ }
    });
  }

  function attachDrop(slot, area, pile) {
    slot.dataset.solitaireDrop = area;
    slot.dataset.pile = String(pile);
  }

  function clearDropHighlight() {
    document.querySelectorAll('.solitaire-board .is-drop-target')
      .forEach(element => element.classList.remove('is-drop-target'));
  }

  function paintGhost(drag) {
    const stack = sequence(drag.source);
    if (!stack) return;
    const ghost = document.createElement('div');
    ghost.className = 'solitaire-drag-ghost';
    stack.forEach((card, index) => {
      const image = makeCardElement(card, { faceDown: false });
      image.style.top = `${index * 29}px`;
      ghost.append(image);
    });
    document.body.append(ghost);
    drag.ghost = ghost;
    drag.started = true;
    document.body.classList.add('solitaire-drag-active');
    drag.cardEl.classList.add('is-drag-origin');
  }

  function moveDrag(event) {
    const drag = pointerDrag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    drag.x = event.clientX;
    drag.y = event.clientY;
    if (!drag.started && Math.hypot(drag.x - drag.startX, drag.y - drag.startY) < 7) return;
    if (!drag.started) paintGhost(drag);
    if (!drag.ghost) return;
    event.preventDefault();
    drag.ghost.style.transform = `translate3d(${drag.x - 32}px, ${drag.y - 28}px, 0)`;
    clearDropHighlight();
    const element = document.elementFromPoint(drag.x, drag.y)?.closest('[data-solitaire-drop]');
    const area = element?.dataset.solitaireDrop;
    const pile = Number(element?.dataset.pile);
    drag.target = area && canMove(drag.source, area, pile) ? { area, pile } : null;
    if (drag.target) element.classList.add('is-drop-target');
  }

  function endDrag(event, cancelled = false) {
    const drag = pointerDrag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    pointerDrag = null;
    clearDropHighlight();
    if (drag.started) {
      suppressClickUntil = performance.now() + 400;
      drag.ghost?.remove();
      document.body.classList.remove('solitaire-drag-active');
      drag.cardEl.classList.remove('is-drag-origin');
      if (!cancelled && drag.target) tryMove(drag.source, drag.target.area, drag.target.pile);
    }
    try { if (drag.cardEl.hasPointerCapture(drag.pointerId)) drag.cardEl.releasePointerCapture(drag.pointerId); }
    catch { /* The source card might have been re-rendered. */ }
  }
  window.addEventListener('pointermove', moveDrag, { passive: false });
  window.addEventListener('pointerup', event => endDrag(event));
  window.addEventListener('pointercancel', event => endDrag(event, true));

  function placeholder(label, interactive = false) {
    const el = document.createElement(interactive ? 'button' : 'div');
    if (interactive) el.type = 'button';
    el.className = 'solitaire-empty-card';
    el.textContent = label;
    return el;
  }

  function drawStock() {
    if (!stock.length && !waste.length) return;
    remember();
    if (stock.length) {
      const next = stock.pop();
      next.faceUp = true;
      waste.push(next);
    } else {
      stock = waste.reverse();
      stock.forEach(card => { card.faceUp = false; });
      waste = [];
    }
    selection = null;
    moves += 1;
    render();
  }

  function render() {
    stockView.replaceChildren();
    wasteView.replaceChildren();
    foundationView.replaceChildren();
    tableauView.replaceChildren();

    const stockCard = stock.length ? makeCardElement(null, { faceDown: true, interactive: true }) : placeholder(waste.length ? '↻' : '', Boolean(waste.length));
    stockCard.classList.add('solitaire-stock-card');
    if (stock.length || waste.length) {
      stockCard.setAttribute('aria-label', stock.length ? `Draw a card (${stock.length} remain)` : 'Recycle waste pile');
      stockCard.addEventListener('click', drawStock);
    }
    stockView.append(stockCard);

    const wasteCard = waste.at(-1);
    if (wasteCard) {
      const el = makeCardElement(wasteCard, { interactive: true, faceDown: false });
      const source = { area: 'waste', pile: 0, index: waste.length - 1 };
      if (selection?.area === 'waste') el.classList.add('is-selected');
      el.addEventListener('click', () => selectOrMove(source));
      el.addEventListener('dblclick', () => moveToFoundation(source));
      attachDrag(el, source);
      wasteView.append(el);
    } else wasteView.append(placeholder(''));

    foundations.forEach((pile, i) => {
      const slot = document.createElement('div');
      slot.className = 'solitaire-foundation-slot';
      slot.setAttribute('aria-label', `Foundation ${i + 1}`);
      slot.addEventListener('click', () => { if (selection) tryMove(selection, 'foundation', i); });
      attachDrop(slot, 'foundation', i);
      const top = pile.at(-1);
      if (top) {
        const el = makeCardElement(top, { interactive: true, faceDown: false });
        const source = { area: 'foundation', pile: i, index: pile.length - 1 };
        if (selection?.area === 'foundation' && selection.pile === i) el.classList.add('is-selected');
        el.addEventListener('click', event => { event.stopPropagation(); selectOrMove(source); });
        attachDrag(el, source);
        slot.append(el);
      } else slot.append(placeholder(SUITS[i]));
      foundationView.append(slot);
    });

    tableau.forEach((pile, i) => {
      const column = document.createElement('div');
      column.className = 'solitaire-tableau-pile';
      column.setAttribute('aria-label', `Tableau column ${i + 1}`);
      column.addEventListener('click', () => { if (selection) tryMove(selection, 'tableau', i); });
      attachDrop(column, 'tableau', i);
      let top = 0;
      if (!pile.length) column.append(placeholder('K'));
      pile.forEach((card, j) => {
        const el = makeCardElement(card, { interactive: true });
        el.style.top = `${top}px`;
        el.style.zIndex = String(j + 1);
        top += card.faceUp ? 30 : 19;
        const source = { area: 'tableau', pile: i, index: j };
        if (selection?.area === 'tableau' && selection.pile === i && j >= selection.index) el.classList.add('is-selected');
        el.addEventListener('click', event => { event.stopPropagation(); if (card.faceUp) selectOrMove(source); });
        if (card.faceUp) {
          el.addEventListener('dblclick', event => { event.stopPropagation(); if (j === pile.length - 1) moveToFoundation(source); });
          attachDrag(el, source);
        }
        column.append(el);
      });
      column.style.minHeight = `${Math.max(130, top + 98)}px`;
      tableauView.append(column);
    });

    const home = foundations.reduce((total, pile) => total + pile.length, 0);
    status.textContent = home === 52 ? `You win! All 52 cards home in ${moves} moves.` : `Moves ${moves} · Stock ${stock.length} · Home ${home}/52`;
    undoButton.disabled = undoStack.length === 0;
  }

  function deal() {
    stock = shuffledDeck();
    waste = [];
    foundations = [[], [], [], []];
    tableau = Array.from({ length: 7 }, () => []);
    for (let i = 0; i < 7; i += 1) {
      for (let j = 0; j <= i; j += 1) {
        const card = stock.pop();
        card.faceUp = j === i;
        tableau[i].push(card);
      }
    }
    selection = null;
    moves = 0;
    undoStack = [];
    render();
  }

  undoButton.addEventListener('click', () => {
    const previous = undoStack.pop();
    if (!previous) return;
    ({ stock, waste, foundations, tableau, moves } = JSON.parse(previous));
    selection = null;
    render();
  });
  newButton.addEventListener('click', deal);
  deal();
}
