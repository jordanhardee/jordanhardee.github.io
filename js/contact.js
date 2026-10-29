// Draw a visual-only contact clue when Contact.exe is launched.
// This is obfuscation, not a guarantee against image recognition or scraping.
(function () {
  const canvas = document.getElementById('contact-captcha');
  const redraw = document.getElementById('contact-captcha-new');
  const copy = document.getElementById('contact-key-copy');
  const status = document.getElementById('contact-copy-feedback');
  if (!canvas || !redraw || !copy || !status) return;

  const width = 640;
  const height = 250;
  const keyPath = 'assets/jordanhardee-public.asc';
  let generation = 0;
  let publicKey = null;

  copy.disabled = true;
  fetch(keyPath).then(async response => {
    if (!response.ok) throw new Error('Key unavailable');
    const armored = await response.text();
    if (!armored.includes('-----BEGIN PGP PUBLIC KEY BLOCK-----')) throw new Error('Invalid key');
    publicKey = armored;
    copy.disabled = false;
  }).catch(() => {
    status.textContent = 'The key could not be loaded for copying. Use the download link.';
  });

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

  redraw.addEventListener('click', () => {
    status.textContent = '';
    paint();
  });

  copy.addEventListener('click', async () => {
    if (!publicKey) return;
    try {
      await navigator.clipboard.writeText(publicKey);
      status.textContent = 'Public PGP key copied.';
    } catch {
      const helper = document.createElement('textarea');
      helper.value = publicKey;
      helper.setAttribute('readonly', '');
      helper.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(helper);
      helper.select();
      const copied = document.execCommand('copy');
      helper.remove();
      status.textContent = copied ? 'Public PGP key copied.' : 'Could not copy; please use the .asc download link.';
    }
  });

  document.addEventListener('xp:open-window', event => {
    if (event.detail?.window === 'contact') {
      status.textContent = '';
      paint();
    }
  });

  paint();
})();
