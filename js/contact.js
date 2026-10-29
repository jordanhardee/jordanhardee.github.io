// Best-effort contact obfuscation for a static GitHub Pages site.
// This is a client-side visual challenge, NOT server-verified protection:
// a determined bot can execute or inspect JavaScript and access public files.
(function () {
  const form = document.getElementById('contact-challenge');
  const canvas = document.getElementById('contact-captcha');
  const answer = document.getElementById('contact-captcha-answer');
  const feedback = document.getElementById('contact-feedback');
  const revealed = document.getElementById('contact-revealed');
  const key = document.getElementById('contact-key');
  const download = document.getElementById('contact-key-download');
  const refresh = document.getElementById('contact-captcha-new');
  const speak = document.getElementById('contact-captcha-speak');
  const copyEmail = document.getElementById('contact-email-copy');
  if (!form || !canvas || !answer || !feedback || !revealed || !key || !download) return;

  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const keyPath = 'assets/jordanhardee-public.asc';
  let solution = '';
  let attempts = 0;

  function randomInt(max) {
    const bytes = new Uint32Array(1);
    window.crypto.getRandomValues(bytes);
    return bytes[0] % max;
  }

  function newChallenge() {
    solution = Array.from({ length: 5 }, () => alphabet[randomInt(alphabet.length)]).join('');
    attempts = 0;
    answer.value = '';
    feedback.textContent = '';
    const ctx = canvas.getContext('2d');
    const width = 430, height = 160;
    canvas.width = width * 2;
    canvas.height = height * 2;
    ctx.setTransform(2, 0, 0, 2, 0, 0);

    const background = ctx.createLinearGradient(0, 0, width, height);
    background.addColorStop(0, '#e1f0ff');
    background.addColorStop(0.55, '#f5f7ec');
    background.addColorStop(1, '#c1ddf1');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < 58; i++) {
      ctx.strokeStyle = `rgba(${35 + randomInt(65)},${65 + randomInt(60)},${135 + randomInt(60)},.18)`;
      ctx.beginPath();
      ctx.moveTo(randomInt(width), randomInt(height));
      ctx.lineTo(randomInt(width), randomInt(height));
      ctx.stroke();
    }

    const lines = [
      'my email is:',
      'the domain name minus the .com',
      '@mailbox.org',
    ];
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(26,68,114,.20)';
    ctx.shadowBlur = 1;
    ctx.fillStyle = '#193e71';
    lines.forEach((line, index) => {
      ctx.font = `${index === 1 ? 'bold 19px' : 'bold 21px'} Georgia, serif`;
      ctx.fillText(line, 22, 22 + index * 29, width - 40);
    });

    ctx.fillStyle = '#394661';
    ctx.font = 'bold 13px Tahoma, sans-serif';
    ctx.fillText('ENTER CODE:', 22, 126);
    ctx.font = 'bold 27px Georgia, serif';
    [...solution].forEach((character, index) => {
      const x = 152 + index * 46;
      const y = 128 + (randomInt(7) - 3);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((randomInt(15) - 7) * Math.PI / 180);
      ctx.fillStyle = index % 2 ? '#145780' : '#8a3455';
      ctx.fillText(character, 0, 0);
      ctx.restore();
    });
  }

  function announce() {
    if (!('speechSynthesis' in window)) {
      feedback.textContent = 'Speech output is not supported by this browser.';
      return;
    }
    window.speechSynthesis.cancel();
    const words = 'My email is: the domain name minus the dot com, at mailbox dot org. Verification code: ' + [...solution].join(', ');
    const utterance = new SpeechSynthesisUtterance(words);
    utterance.rate = 0.8;
    window.speechSynthesis.speak(utterance);
  }

  async function reveal() {
    form.hidden = true;
    revealed.hidden = false;
    download.href = keyPath;
    try {
      const response = await fetch(keyPath, { cache: 'force-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const publicKey = await response.text();
      if (!publicKey.includes('-----BEGIN PGP PUBLIC KEY BLOCK-----')) throw new Error('Invalid public key');
      key.textContent = publicKey;
    } catch (error) {
      key.textContent = 'Unable to display the public key. Use the download link below.';
      console.info('Public key could not be loaded:', error.message);
    }
  }

  function reset() {
    form.hidden = false;
    revealed.hidden = true;
    key.textContent = 'Loading public key...';
    download.removeAttribute('href');
    newChallenge();
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    const supplied = answer.value.trim().toUpperCase().replace(/\s/g, '');
    if (supplied === solution) {
      feedback.textContent = '';
      reveal();
    } else {
      feedback.textContent = 'That code does not match. Please try again.';
      answer.select();
      if (++attempts >= 3) newChallenge();
    }
  });
  refresh?.addEventListener('click', newChallenge);
  speak?.addEventListener('click', announce);

  copyEmail?.addEventListener('click', async () => {
    // Assemble only when requested. The actual address is not printed in HTML.
    const address = ['jordan', 'hardee'].join('') + '@' + 'mailbox.org';
    try {
      await navigator.clipboard.writeText(address);
      copyEmail.textContent = 'Copied to clipboard';
    } catch {
      copyEmail.textContent = address;
    }
  });

  document.addEventListener('xp:open-window', event => {
    if (event.detail?.window === 'contact') {
      copyEmail.textContent = 'copy my email address';
      reset();
    }
  });
  reset();
})();
