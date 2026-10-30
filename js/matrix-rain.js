// Faint Japanese character rain, layered behind the transparent aquarium.
// Pure Canvas 2D: no libraries, assets, network requests, or pointer handlers.
(function () {
  const canvas = document.getElementById('site-matrix-canvas');
  const ctx = canvas?.getContext('2d', { alpha: true });
  if (!ctx) return;

  const characters = Array.from('アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンあいうえお星月水海光魚空');
  const pick = () => characters[Math.floor(Math.random() * characters.length)];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let width = 1;
  let height = 1;
  let fontSize = 20;
  let lineHeight = 27;
  let streams = [];
  let frame = 0;
  let previous = 0;

  function newStream(x, anywhere = false) {
    const length = 7 + Math.floor(Math.random() * 12);
    return {
      x,
      head: anywhere ? Math.random() * (height + length * lineHeight) : -length * lineHeight,
      speed: 24 + Math.random() * 36,
      glyphs: Array.from({ length }, pick),
    };
  }

  function resize() {
    width = Math.max(1, canvas.clientWidth);
    height = Math.max(1, canvas.clientHeight);
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    fontSize = Math.max(16, Math.min(24, Math.round(width / 50)));
    lineHeight = Math.round(fontSize * 1.4);
    const spacing = Math.round(fontSize * 1.75);
    streams = [];
    for (let x = spacing / 2; x < width; x += spacing) {
      // Gaps keep the starfield visible and the background from becoming busy.
      if (Math.random() < .16) continue;
      streams.push(newStream(x + (Math.random() - .5) * 6, true));
    }
    draw();
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.font = `${fontSize}px "Hiragino Kaku Gothic ProN", "Yu Gothic", "Noto Sans JP", Meiryo, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const stream of streams) {
      const length = stream.glyphs.length;
      for (let i = length - 1; i >= 0; i--) {
        const y = stream.head - i * lineHeight;
        if (y < -fontSize || y > height + fontSize) continue;
        const fade = Math.pow(1 - i / length, 1.5);
        if (i === 0) {
          ctx.fillStyle = 'rgba(210, 255, 216, .48)';
        } else {
          ctx.fillStyle = `rgba(85, 239, 131, ${(.06 + .26 * fade).toFixed(3)})`;
        }
        ctx.fillText(stream.glyphs[i], stream.x, y);
      }
    }
  }

  function tick(now) {
    frame = 0;
    if (document.hidden || reducedMotion.matches) return;
    if (now - previous < 40) {
      frame = requestAnimationFrame(tick);
      return;
    }
    const dt = Math.min(.08, Math.max(0, (now - previous) / 1000));
    previous = now;
    for (let i = 0; i < streams.length; i++) {
      const stream = streams[i];
      stream.head += stream.speed * dt;
      if (Math.random() < .025) {
        stream.glyphs[Math.floor(Math.random() * stream.glyphs.length)] = pick();
      }
      if (stream.head - stream.glyphs.length * lineHeight > height) {
        streams[i] = newStream(stream.x);
      }
    }
    draw();
    frame = requestAnimationFrame(tick);
  }

  function start() {
    cancelAnimationFrame(frame);
    if (!document.hidden && !reducedMotion.matches) {
      previous = performance.now();
      frame = requestAnimationFrame(tick);
    } else {
      draw();
    }
  }

  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', start);
  if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', start);
  resize();
  start();
})();
