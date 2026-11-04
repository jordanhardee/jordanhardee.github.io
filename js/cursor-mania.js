// The MyWebSearch screenshot remains inert except for the Cursor Mania hotspot.
// These are first-frame PNGs from Jordan's CursorPhreak archive, not add-ons.
// A selection lasts only as long as this document: no cookies or storage.
(function () {
  const launcher = document.getElementById('ie-cursor-mania');
  const grid = document.getElementById('cursor-mania-grid');
  const reset = document.getElementById('cursor-mania-reset');
  const status = document.getElementById('cursor-mania-status');
  if (!launcher || !grid || !reset || !status) return;

  const assets = new URL('../assets/cursors/', document.currentScript.src);
  const choices = [
    { id: 'arrow-1', name: 'Red Arrow', x: 1, y: 1 },
    { id: 'arrow-2', name: 'Green Arrow', x: 0, y: 0 },
    { id: 'colorful-1', name: 'Blue Arrow', x: 0, y: 1 },
    { id: 'colorful-2', name: 'Cyan Arrow', x: 0, y: 0 },
    { id: 'cat-1', name: 'Sparkle Cat', x: 0, y: 0 },
    { id: 'cat-2', name: 'Cat Eyes', x: 0, y: 0 },
    { id: 'cat-3', name: 'Glasses Cat', x: 0, y: 0 },
    { id: 'dog-2', name: 'Cartoon Dog', x: 0, y: 0 },
    { id: 'creature-1', name: 'Purple Creature', x: 0, y: 0 },
    { id: 'creature-2', name: 'Tiny Dinosaur', x: 0, y: 0 },
    { id: 'alien-2', name: 'Alien', x: 0, y: 0 },
    { id: 'smiley-2', name: 'Smiley Face', x: 0, y: 0 },
    { id: 'fun-1', name: 'Banana', x: 0, y: 0 },
    { id: 'popular-4', name: 'USA Heart', x: 0, y: 0 },
    { id: 'popular-5', name: 'Santa', x: 0, y: 0 },
    { id: 'popular-6', name: 'Paper Airplane', x: 0, y: 0 },
  ];
  const buttons = new Map();

  function choose(choice) {
    if (choice) {
      const url = new URL(`${choice.id}.png`, assets).href;
      document.documentElement.style.setProperty('--cursorphreak-cursor', `url("${url}") ${choice.x} ${choice.y}, auto`);
      document.documentElement.classList.add('cursorphreak-active');
      status.textContent = `${choice.name} selected · refresh to reset`;
    } else {
      document.documentElement.classList.remove('cursorphreak-active');
      document.documentElement.style.removeProperty('--cursorphreak-cursor');
      status.textContent = 'Normal cursor restored.';
    }
    buttons.forEach((button, id) => {
      button.setAttribute('aria-pressed', String(id === choice?.id));
    });
  }

  for (const choice of choices) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cursor-mania-choice';
    button.setAttribute('aria-label', `Use ${choice.name} cursor`);
    button.setAttribute('aria-pressed', 'false');
    const img = document.createElement('img');
    img.src = new URL(`${choice.id}.png`, assets).href;
    img.alt = '';
    img.width = 32;
    img.height = 32;
    const label = document.createElement('span');
    label.textContent = choice.name;
    button.append(img, label);
    button.addEventListener('click', () => choose(choice));
    buttons.set(choice.id, button);
    grid.appendChild(button);
  }

  launcher.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('xp:open-window', { detail: { window: 'cursor-mania' } }));
  });
  reset.addEventListener('click', () => choose(null));
})();
