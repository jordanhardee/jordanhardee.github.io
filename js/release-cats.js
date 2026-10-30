// Loads no media until RELEASE THE CATS opens. Keep this small script eager so
// happy.exe's sound starts in the original click gesture on iPhone Safari.
(function () {
  const panel = document.querySelector('[data-window="release-cats"]');
  const happyPanel = document.querySelector('[data-window="happy-exe"]');
  const video = document.getElementById('happy-video');
  const hint = document.getElementById('happy-playback-hint');
  const swarm = document.getElementById('xp-cat-swarm');
  const runway = document.getElementById('xp-cat-runway');
  const status = document.getElementById('cats-status');
  const releaseButton = document.getElementById('cats-release');
  const recallButton = document.getElementById('cats-recall');

  const jump = 'assets/cats/jump-transparent.webp';
  const cats = [
    'assets/cats/hands-transparent.webp',
    'assets/cats/feeding-transparent.webp',
    'assets/cats/hilarious-transparent.webp',
    'assets/cats/giphy-transparent.webp',
    'assets/cats/huh-cutout.webp',
  ];
  const spots = [
    [17, 23, 195, -7], [81, 22, 175, 8],
    [22, 78, 185, 6], [79, 75, 180, -8],
    [49, 47, 195, 3],
  ];

  if (!panel || !happyPanel || !video || !swarm || !runway || !releaseButton || !recallButton) return;
  let released = false;
  let playToken = 0;
  let huhAudio = null;

  function emit(name, app) {
    document.dispatchEvent(new CustomEvent(name, { detail: { window: app } }));
  }

  function addCat(index) {
    const [x, y, size, tilt] = spots[index];
    const wrapper = document.createElement('span');
    wrapper.className = 'xp-cat-floater';
    wrapper.style.setProperty('--cat-x', x + '%');
    wrapper.style.setProperty('--cat-y', y + '%');
    wrapper.style.setProperty('--cat-width', size + 'px');
    wrapper.style.setProperty('--cat-tilt', tilt + 'deg');
    wrapper.style.setProperty('--cat-tilt-reverse', -tilt + 'deg');
    wrapper.style.setProperty('--cat-delay', -index * 0.63 + 's');
    const image = document.createElement('img');
    image.alt = '';
    image.decoding = 'async';
    image.src = cats[index];
    wrapper.appendChild(image);
    swarm.appendChild(wrapper);
  }

  function addJumpers() {
    const total = window.innerWidth < 650 ? 4 : 6;
    for (let i = 0; i < total; i++) {
      const wrapper = document.createElement('span');
      wrapper.className = 'xp-cat-runner';
      wrapper.style.setProperty('--cat-delay', -i * (14.4 / total) + 's');
      const image = document.createElement('img');
      image.src = jump;
      image.alt = '';
      image.decoding = 'async';
      wrapper.appendChild(image);
      runway.appendChild(wrapper);
    }
  }

  function playHuh() {
    if (!huhAudio) {
      huhAudio = new Audio();
      huhAudio.preload = 'none';
      huhAudio.src = 'assets/cats/huh.mp3';
      huhAudio.volume = 0.85;
      huhAudio.addEventListener('ended', () => emit('xp:huh-playback-stop', 'release-cats'));
      huhAudio.addEventListener('error', () => emit('xp:huh-playback-stop', 'release-cats'));
    }
    huhAudio.currentTime = 0;
    emit('xp:huh-playback-start', 'release-cats');
    const attempt = huhAudio.play();
    if (attempt && typeof attempt.catch === 'function') {
      attempt.catch(() => emit('xp:huh-playback-stop', 'release-cats'));
    }
  }

  function stopHuh() {
    if (!huhAudio) return;
    huhAudio.pause();
    huhAudio.currentTime = 0;
    emit('xp:huh-playback-stop', 'release-cats');
  }

  function stopHappy() {
    ++playToken;
    video.pause();
    if (video.getAttribute('src')) {
      video.removeAttribute('src');
      video.load(); // Cancel the stream after KITTY JAIL or closing the window.
    }
    if (hint) hint.hidden = true;
    emit('xp:happy-playback-stop', 'happy-exe');
  }

  function openHappy() {
    if (!released) return;
    if (happyPanel.classList.contains('module-closed') || happyPanel.classList.contains('module-minimized')) {
      emit('xp:open-window', 'happy-exe');
    }
    if (hint) hint.hidden = true;
    if (!video.getAttribute('src')) video.src = 'assets/cats/happy.mp4';
    const token = ++playToken;
    emit('xp:happy-playback-start', 'happy-exe');
    const attempt = video.play();
    if (attempt && typeof attempt.catch === 'function') {
      attempt.catch(error => {
        if (token !== playToken) return;
        emit('xp:happy-playback-stop', 'happy-exe');
        if (hint) {
          hint.textContent = error.name === 'NotAllowedError'
            ? 'Tap play to start happy.exe with sound.'
            : 'happy.exe could not play. Try the video controls.';
          hint.hidden = false;
        }
      });
    }
  }

  function release() {
    const firstRelease = !released;
    if (!released) {
      released = true;
      swarm.hidden = false;
      runway.hidden = false;
      cats.forEach((_, index) => addCat(index));
      addJumpers();
    }
    openHappy();
    if (firstRelease) playHuh();
    if (status) status.textContent = '5 cats loose! KITTY JAIL puts them back.';
  }

  function recall() {
    released = false;
    swarm.hidden = true;
    runway.hidden = true;
    swarm.replaceChildren();
    runway.replaceChildren();
    stopHuh();
    stopHappy();
    if (!happyPanel.classList.contains('module-closed')) emit('xp:close-window', 'happy-exe');
    if (status) status.textContent = 'All cats are safely in KITTY JAIL.';
  }

  video.addEventListener('playing', () => {
    if (hint) hint.hidden = true;
    emit('xp:happy-playback-start', 'happy-exe');
  });
  video.addEventListener('loadedmetadata', () => {
    if (!video.videoWidth || !video.videoHeight) return;
    happyPanel.style.setProperty('--happy-video-ratio', `${video.videoWidth} / ${video.videoHeight}`);
    emit('xp:happy-video-metadata', 'happy-exe');
  });
  video.addEventListener('pause', () => emit('xp:happy-playback-stop', 'happy-exe'));
  video.addEventListener('error', () => emit('xp:happy-playback-stop', 'happy-exe'));

  releaseButton.addEventListener('click', release);
  recallButton.addEventListener('click', recall);
  document.addEventListener('xp:window-opened', event => {
    if (event.detail?.window === 'release-cats' && !released) release();
  });
  document.addEventListener('xp:closed', event => {
    if (event.detail?.window === 'release-cats') recall();
    if (event.detail?.window === 'happy-exe') stopHappy();
  });
  if (!panel.classList.contains('module-closed')) release();
})();
