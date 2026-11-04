// A harmless XP browser shell around the public SmolNet HTTP gateway.
// No historical toolbars are installed and no direct Gemini sockets are opened.
(function () {
  const frame = document.getElementById('ie-portal-frame');
  const form = document.getElementById('ie-address-form');
  const address = document.getElementById('ie-address');
  const message = document.getElementById('ie-browser-message');
  const homeButton = document.getElementById('ie-home');
  const refreshButton = document.getElementById('ie-refresh');
  if (!frame || !form || !address || !message) return;

  const home = 'https://portal.mozz.us/';
  const protocols = new Set(['gemini:', 'gopher:', 'finger:', 'spartan:', 'text:', 'nex:', 'scroll:']);

  function gatewayUrl(value) {
    try {
      const url = new URL(value.trim());
      if (url.username || url.password) return null;
      if (url.protocol === 'https:' && url.origin === 'https://portal.mozz.us') return url.href;
      if (protocols.has(url.protocol) && url.hostname) {
        return `${home}${url.protocol.slice(0, -1)}/${url.host}${url.pathname}${url.search}${url.hash}`;
      }
    } catch { /* Invalid URL. */ }
    return null;
  }

  function navigate(url) {
    frame.src = url;
    message.hidden = true;
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    const url = gatewayUrl(address.value);
    if (url) navigate(url);
    else {
      message.textContent = 'Use a gemini://, gopher://, finger://, spartan://, text://, nex:// or scroll:// address. HTTPS addresses must be on portal.mozz.us.';
      message.hidden = false;
    }
  });
  homeButton?.addEventListener('click', () => {
    address.value = home;
    navigate(home);
  });
  refreshButton?.addEventListener('click', () => {
    navigate(frame.getAttribute('src') || home);
  });
  document.addEventListener('xp:closed', event => {
    if (event.detail?.window !== 'internet-explorer') return;
    address.value = home;
    message.hidden = true;
  });
})();
