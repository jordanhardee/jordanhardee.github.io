// Draw visual contact clues, and make a human solve a local challenge before
// loading the public key. Client-side CAPTCHAs only deter casual scrapers.
(function () {
  const canvas = document.getElementById('contact-captcha');
  const redraw = document.getElementById('contact-captcha-new');
  const challengeCanvas = document.getElementById('contact-key-challenge');
  const answerInput = document.getElementById('contact-key-answer');
  const checkButton = document.getElementById('contact-key-check');
  const refreshButton = document.getElementById('contact-key-refresh');
  const message = document.getElementById('contact-key-feedback');
  const revealed = document.getElementById('contact-key-revealed');
  const keyText = document.getElementById('contact-key-text');
  const copyButton = document.getElementById('contact-key-copy');
  if (!canvas || !redraw) return;

  const width = 640;
  const height = 250;
  let generation = 0;

  function random(max) {
    const bytes = new Uint32Array(1);
    crypto.getRandomValues(bytes);
    return bytes[0] % max;
  }

  function paint() {
    generation += 1;
    const display = canvas.getContext('2d');
    if (!display) return;
    const source = document.createElement('canvas');
    source.width = width;
    source.height = height;
    const ctx = source.getContext('2d');

    const background = ctx.createLinearGradient(0, 0, width, height);
    background.addColorStop(0, '#d6ecf4');
    background.addColorStop(0.47, '#f1f0df');
    background.addColorStop(1, '#bed5e9');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);

    // Confusing shapes beneath the lettering are much harder to OCR than a
    // plain block of text, while leaving a careful human a readable clue.
    for (let i = 0; i < 90; i += 1) {
      const x = random(width), y = random(height);
      ctx.strokeStyle = i % 3 ? 'rgba(23,82,127,.19)' : 'rgba(125,48,100,.14)';
      ctx.lineWidth = 0.5 + random(3) / 4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + random(95) - 47, y - 20,
        x + random(120) - 60, y + 25,
        x + random(135) - 67, y + random(33) - 16);
      ctx.stroke();
    }

    const lines = [
      'my email is:',
      'the domain name minus the .com',
      '@mailbox.org'
    ];
    lines.forEach((line, row) => {
      let x = 33 + (row === 1 ? 8 : 0);
      const baseline = [64, 127, 189][row];
      for (const letter of line) {
        const size = (row === 1 ? 27 : 31) + random(5) - 2;
        ctx.font = 'bold italic ' + size + 'px Georgia, serif';
        const advance = ctx.measureText(letter).width;
        ctx.save();
        ctx.translate(x, baseline + random(9) - 4);
        ctx.rotate((random(15) - 7) * Math.PI / 180);
        ctx.fillStyle = random(4) === 0 ? '#5b3f77' : '#1e476e';
        ctx.shadowColor = 'rgba(26,51,86,.21)';
        ctx.shadowBlur = 2;
        ctx.fillText(letter, 0, 0);
        ctx.restore();
        x += advance + (letter === ' ' ? 4 : random(3) - 1);
      }
    });

    // Displace thin horizontal image strips to give the clue a gentle wave.
    canvas.width = width * 2;
    canvas.height = height * 2;
    display.setTransform(2, 0, 0, 2, 0, 0);
    display.fillStyle = '#d7e9f1';
    display.fillRect(0, 0, width, height);
    const phase = generation * 0.49 + random(30);
    for (let y = 0; y < height; y += 2) {
      const shift = Math.round(5 * Math.sin(y / 12 + phase) +
        3 * Math.sin(y / 5.1 - phase));
      display.drawImage(source, 0, y, width, 2, shift, y, width, 2);
    }

    for (let i = 0; i < 28; i += 1) {
      display.strokeStyle = i % 2 ? 'rgba(48,87,128,.23)' : 'rgba(133,53,108,.17)';
      display.lineWidth = 0.6 + random(3) / 3;
      display.beginPath();
      const y = 27 + random(181);
      display.moveTo(5 + random(60), y);
      display.quadraticCurveTo(width / 2, y + random(30) - 15,
        width - 10 - random(45), y + random(42) - 21);
      display.stroke();
    }
    for (let i = 0; i < 230; i += 1) {
      display.fillStyle = i % 2 ? 'rgba(40,72,111,.13)' : 'rgba(132,51,106,.12)';
      display.fillRect(random(width), random(height), 1 + random(2), 1 + random(2));
    }
  }

  redraw.addEventListener('click', paint);

  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let challengeAnswer = '';

  function newChallenge() {
    if (!challengeCanvas) return;
    const ctx = challengeCanvas.getContext('2d');
    if (!ctx) return;
    const width = challengeCanvas.width;
    const height = challengeCanvas.height;
    challengeAnswer = Array.from({ length: 5 }, () => alphabet[random(alphabet.length)]).join('');
    if (answerInput) answerInput.value = '';
    if (message) message.textContent = '';
    if (revealed) revealed.hidden = true;
    if (keyText) keyText.value = '';
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#e6eef6';
    ctx.fillRect(0, 0, width, height);
    for (let i = 0; i < 70; i += 1) {
      ctx.strokeStyle = i % 2 ? '#93b5cb66' : '#7f87b344';
      ctx.lineWidth = 1 + random(2);
      ctx.beginPath();
      const x = random(width), y = random(height);
      ctx.moveTo(x, y);
      ctx.lineTo(x + random(65) - 32, y + random(65) - 32);
      ctx.stroke();
    }
    for (let i = 0; i < challengeAnswer.length; i += 1) {
      ctx.save();
      ctx.translate(36 + i * 60 + random(11) - 5, 70 + random(17) - 8);
      ctx.rotate((random(29) - 14) * Math.PI / 180);
      ctx.font = `bold ${45 + random(10)}px Georgia,serif`;
      ctx.fillStyle = ['#234477','#5b417d','#275b64'][random(3)];
      ctx.fillText(challengeAnswer[i], 0, 0);
      ctx.restore();
    }
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.strokeStyle = '#58729265';
      ctx.lineWidth = 1.5;
      ctx.moveTo(0, random(height));
      ctx.bezierCurveTo(80, random(height), 240, random(height), width, random(height));
      ctx.stroke();
    }
  }

  async function unlockKey() {
    if (!answerInput || !message || !checkButton || !revealed || !keyText) return;
    if (answerInput.value.trim().toUpperCase() !== challengeAnswer) {
      message.textContent = 'That does not match. Try again or redraw.';
      newChallenge();
      message.textContent = 'Incorrect answer; a new image is ready.';
      return;
    }
    checkButton.disabled = true;
    message.textContent = 'Unlocking public key…';
    try {
      // Deliberately load the armored key only after a successful answer.
      const { copyablePublicKey } = await import('./pgp-payload.mjs?v=20261029-1');
      const armored = copyablePublicKey();
      if (!armored.startsWith('-----BEGIN PGP PUBLIC KEY BLOCK-----') ||
          !armored.includes('-----END PGP PUBLIC KEY BLOCK-----')) throw new Error('Invalid public key data');
      keyText.value = armored;
      revealed.hidden = false;
      message.textContent = 'Unlocked. You can copy the entire public key below.';
      revealed.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } catch (error) {
      message.textContent = 'The public key could not be loaded. Please try again.';
      console.error('PGP public key unavailable:', error);
    } finally {
      checkButton.disabled = false;
    }
  }

  async function copyKey() {
    if (!keyText?.value || !message) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(keyText.value);
      message.textContent = 'PGP public key copied to clipboard.';
    } catch {
      keyText.focus();
      keyText.select();
      message.textContent = document.execCommand('copy')
        ? 'PGP public key copied to clipboard.'
        : 'Select the key text and copy it manually.';
    }
  }

  refreshButton?.addEventListener('click', newChallenge);
  checkButton?.addEventListener('click', unlockKey);
  copyButton?.addEventListener('click', copyKey);
  answerInput?.addEventListener('keydown', event => { if (event.key === 'Enter') unlockKey(); });

  document.addEventListener('xp:closed', event => {
    if (event.detail?.window === 'contact') newChallenge();
  });

  document.addEventListener('xp:open-window', event => {
    if (event.detail?.window === 'contact') {
      paint();
      newChallenge();
    }
  });

  paint();
  newChallenge();
})();
