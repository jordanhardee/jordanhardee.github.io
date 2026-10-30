// Windows XP Start menu and on-demand desktop app launching.
(function () {
  const start = document.getElementById('xp-start-button');
  const menu = document.getElementById('xp-start-menu');
  const chefFrame = document.getElementById('cyberchef-frame');
  const chefLoading = document.getElementById('cyberchef-loading');
  if (!start || !menu) return;
  let contactScriptRequested = false;
  const cardGames = {
    blackjack: new URL('./blackjack.mjs?v=20261029-1', document.currentScript.src).href,
    solitaire: new URL('./solitaire.mjs?v=20261029-2', document.currentScript.src).href,
  };
  const loadedGames = new Set();

  function loadContactOnDemand() {
    if (contactScriptRequested) return;
    contactScriptRequested = true;
    const script = document.createElement('script');
    script.src = 'js/contact.js?v=20261029-pgp-challenge2';
    script.onerror = () => {
      contactScriptRequested = false;
      console.error('Contact image could not load. Please reopen Contact.exe.');
    };
    document.body.appendChild(script);
  }

  function showMenu(open) {
    menu.hidden = !open;
    start.setAttribute('aria-expanded', String(open));
  }

  start.addEventListener('click', () => showMenu(menu.hidden));
  const folderButtons = Array.from(menu.querySelectorAll('[data-folder-toggle]'));
  folderButtons.forEach(button => {
    button.addEventListener('click', () => {
      const opening = button.getAttribute('aria-expanded') !== 'true';
      // Only one folder is expanded at once so the Start menu stays compact
      // on phones and doesn't make the visitor hunt through a long list.
      folderButtons.forEach(folder => {
        folder.setAttribute('aria-expanded', 'false');
        const contents = document.getElementById(folder.getAttribute('aria-controls'));
        if (contents) contents.hidden = true;
      });
      if (opening) {
        button.setAttribute('aria-expanded', 'true');
        const contents = document.getElementById(button.getAttribute('aria-controls'));
        if (contents) contents.hidden = false;
      }
    });
  });
  menu.querySelectorAll('[data-open-window]').forEach(button => {
    button.addEventListener('click', () => {
      showMenu(false);
      document.dispatchEvent(new CustomEvent('xp:open-window', {
        detail: { window: button.dataset.openWindow }
      }));
      if (button.dataset.openWindow === 'contact') loadContactOnDemand();
      const game = button.dataset.openWindow;
      if (cardGames[game] && !loadedGames.has(game)) {
        loadedGames.add(game);
        import(cardGames[game]).catch(error => {
          loadedGames.delete(game);
          console.error(`${game} could not start:`, error);
        });
      }
    });
  });
  document.addEventListener('pointerdown', event => {
    if (!menu.hidden && !menu.contains(event.target) && !start.contains(event.target)) showMenu(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !menu.hidden) {
      showMenu(false);
      start.focus();
    }
  });

  // CyberChef downloads nothing until someone explicitly opens its window.
  chefFrame?.addEventListener('load', () => {
    if (chefLoading && chefFrame.getAttribute('src')) chefLoading.hidden = true;
  });
  document.addEventListener('xp:closed', event => {
    if (event.detail?.window === 'cyberchef' && chefLoading) chefLoading.hidden = false;
  });
})();
