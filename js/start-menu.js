// Windows XP Start menu and on-demand desktop app launching.
(function () {
  const start = document.getElementById('xp-start-button');
  const menu = document.getElementById('xp-start-menu');
  const chefFrame = document.getElementById('cyberchef-frame');
  const chefLoading = document.getElementById('cyberchef-loading');
  if (!start || !menu) return;

  function showMenu(open) {
    menu.hidden = !open;
    start.setAttribute('aria-expanded', String(open));
  }

  start.addEventListener('click', () => showMenu(menu.hidden));
  menu.querySelectorAll('[data-open-window]').forEach(button => {
    button.addEventListener('click', () => {
      showMenu(false);
      document.dispatchEvent(new CustomEvent('xp:open-window', {
        detail: { window: button.dataset.openWindow }
      }));
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
