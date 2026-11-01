// A local human-check gate in front of the GitHub Discussions embed.
// This is only a UI speed bump. It cannot prevent comments made on GitHub itself.
const panel = document.querySelector('[data-window="guestbook"]');

if (panel) {
  const gate = document.getElementById('guestbook-captcha-gate');
  const canvas = document.getElementById('guestbook-captcha-image');
  const mathQuestion = document.getElementById('guestbook-captcha-math');
  const answerInput = document.getElementById('guestbook-captcha-answer');
  const feedback = document.getElementById('guestbook-captcha-feedback');
  const submit = document.getElementById('guestbook-captcha-submit');
  const refresh = document.getElementById('guestbook-captcha-refresh');
  const alternate = document.getElementById('guestbook-captcha-alternate');
  const unlockedSection = document.getElementById('guestbook-unlocked');
  const status = document.getElementById('guestbook-status');
  const container = document.getElementById('guestbook-discussions');
  const fallback = document.getElementById('guestbook-fallback');
  const repository = 'jordanhardee/jordanhardee.github.io';
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let expected = '';
  let mathMode = false;
  let isUnlocked = false;
  let widgetReady = false;
  let loaderScript = null;
  let requestSerial = 0;

  function random(max) {
    const value = new Uint32Array(1);
    crypto.getRandomValues(value);
    return value[0] % max;
  }

  function newChallenge() {
    feedback.textContent = '';
    answerInput.value = '';
    answerInput.maxLength = mathMode ? 3 : 5;
    canvas.hidden = mathMode;
    mathQuestion.hidden = !mathMode;
    alternate.textContent = mathMode ? 'Use the picture instead.' : "Can't read it? Use a math question.";

    if (mathMode) {
      const first = 2 + random(9);
      const second = 2 + random(9);
      expected = String(first + second);
      mathQuestion.textContent = `${first} + ${second} = ?`;
      return;
    }

    expected = Array.from({ length: 5 }, () => alphabet[random(alphabet.length)]).join('');
    const context = canvas.getContext('2d');
    if (!context) return;
    const { width, height } = canvas;
    const background = context.createLinearGradient(0, 0, width, height);
    background.addColorStop(0, '#dbedf6');
    background.addColorStop(.5, '#f8f7e6');
    background.addColorStop(1, '#b9d4ed');
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);

    for (let line = 0; line < 65; line += 1) {
      context.strokeStyle = line % 2 ? '#4f80a62b' : '#86558231';
      context.lineWidth = 1 + random(2);
      context.beginPath();
      const x = random(width);
      const y = random(height);
      context.moveTo(x, y);
      context.lineTo(x + random(90) - 45, y + random(38) - 19);
      context.stroke();
    }

    for (let character = 0; character < expected.length; character += 1) {
      context.save();
      context.translate(32 + character * 61 + random(10) - 5, 75 + random(16) - 8);
      context.rotate((random(29) - 14) * Math.PI / 180);
      context.font = `bold ${46 + random(9)}px Georgia,serif`;
      context.fillStyle = ['#244477', '#594376', '#265a67'][random(3)];
      context.fillText(expected[character], 0, 0);
      context.restore();
    }

    for (let line = 0; line < 3; line += 1) {
      context.strokeStyle = '#53799963';
      context.lineWidth = 1.4;
      context.beginPath();
      const y = random(height);
      context.moveTo(0, y);
      context.bezierCurveTo(80, random(height), 240, random(height), width, random(height));
      context.stroke();
    }
  }

  function showFallback(message) {
    status.hidden = false;
    status.textContent = message;
    fallback.hidden = false;
  }

  async function connectDiscussions() {
    const attempt = ++requestSerial;
    status.hidden = false;
    status.textContent = 'Connecting to GitHub Discussions…';
    fallback.hidden = true;

    try {
      // The public giscus endpoint exposes the real category IDs. This lets
      // the guestbook work as soon as giscus is installed on the repository.
      const endpoint = `https://giscus.app/api/discussions/categories?repo=${encodeURIComponent(repository)}`;
      const response = await fetch(endpoint, { credentials: 'omit' });
      if (!response.ok) throw new Error(`giscus configuration returned ${response.status}`);
      const config = await response.json();
      const categories = Array.isArray(config.categories) ? config.categories : [];
      const category = categories.find(item => item.name?.toLowerCase() === 'general') ||
        categories.find(item => item.name?.toLowerCase() === 'announcements') || categories[0];
      if (!config.repositoryId || !category?.id) throw new Error('No discussion category available');
      if (attempt !== requestSerial || !isUnlocked) return;

      const script = document.createElement('script');
      script.src = 'https://giscus.app/client.js';
      script.async = true;
      script.crossOrigin = 'anonymous';
      Object.assign(script.dataset, {
        repo: repository,
        repoId: config.repositoryId,
        category: category.name,
        categoryId: category.id,
        mapping: 'specific',
        term: 'JordanHardee.com Guestbook',
        strict: '1',
        reactionsEnabled: '1',
        emitMetadata: '0',
        inputPosition: 'top',
        theme: 'light',
        lang: 'en',
      });
      script.addEventListener('error', () => {
        if (attempt !== requestSerial) return;
        widgetReady = false;
        showFallback('The comment widget could not load.');
      });
      script.addEventListener('load', () => {
        if (attempt !== requestSerial) return;
        const iframe = container.querySelector('iframe.giscus-frame');
        if (!iframe) return showFallback('The comment widget did not start.');
        iframe.addEventListener('load', () => {
          if (attempt === requestSerial) status.hidden = true;
        }, { once: true });
        widgetReady = true;
      });
      loaderScript = script;
      // Place the loader outside .giscus: giscus replaces that element's
      // children when it creates its iframe.
      panel.appendChild(script);
    } catch (error) {
      if (attempt !== requestSerial || !isUnlocked) return;
      console.warn('Guestbook embed unavailable:', error);
      showFallback('The guestbook embed is waiting for the giscus app to be enabled for this repository.');
    }
  }

  function verify() {
    if (isUnlocked) return;
    if (answerInput.value.trim().toUpperCase() !== expected) {
      newChallenge();
      feedback.textContent = 'Incorrect answer. A new challenge is ready.';
      return;
    }
    isUnlocked = true;
    gate.hidden = true;
    unlockedSection.hidden = false;
    if (!widgetReady) connectDiscussions();
  }

  function reset() {
    requestSerial += 1;
    isUnlocked = false;
    if (!widgetReady) {
      loaderScript?.remove();
      loaderScript = null;
      container.replaceChildren();
    }
    else status.hidden = true;
    gate.hidden = false;
    unlockedSection.hidden = true;
    newChallenge();
  }

  submit.addEventListener('click', verify);
  refresh.addEventListener('click', newChallenge);
  alternate.addEventListener('click', () => {
    mathMode = !mathMode;
    newChallenge();
  });
  answerInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      verify();
    }
  });
  document.addEventListener('xp:closed', event => {
    if (event.detail?.window === 'guestbook') reset();
  });
  newChallenge();
}
