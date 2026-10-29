// A tiny, self-contained 3D fish tank. Three.js is vendored under js/vendor
// (MIT license); the site's original sparkle cursor is deliberately untouched.
import * as THREE from './vendor/three.module.js';

const canvas = document.getElementById('aquarium-canvas');
const water = canvas?.closest('.aquarium-water');

if (canvas && water) {
  try {
    startAquarium(canvas, water);
  } catch (error) {
    // The 2D fallback still swims and responds to the pointer when WebGL is off.
    console.info('Using the canvas aquarium fallback:', error.message);
    startCanvasAquarium(canvas, water);
  }
}

function startAquarium(canvas, water) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.55;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1.42, 0.1, 50);
  camera.position.set(0, 0.1, 10.2);
  camera.lookAt(0, -0.1, 0);

  scene.add(new THREE.HemisphereLight(0xb3faff, 0x052b42, 2.4));
  const sun = new THREE.DirectionalLight(0xe6ffff, 3.1);
  sun.position.set(-3, 6, 8);
  scene.add(sun);
  const glimmer = new THREE.PointLight(0x2cf9e2, 18, 12);
  glimmer.position.set(3, 1.7, 1.5);
  scene.add(glimmer);

  const shared = {
    body: new THREE.SphereGeometry(1, 24, 14),
    eye: new THREE.SphereGeometry(1, 12, 9),
    pebble: new THREE.DodecahedronGeometry(1, 0),
  };

  // The floor, sea grass, and rocks have real depth and react to the lighting.
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(11, 6),
    new THREE.MeshStandardMaterial({ color: 0xbca06f, roughness: 1 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -2.28, -0.75);
  scene.add(floor);

  const plants = [];
  for (const [x, z, height, color] of [
    [-4.05, -1.9, 2.85, 0x42e773], [-3.55, -2.1, 2.35, 0x6ef18c],
    [-2.85, -2.3, 1.9, 0x14994e], [-1.7, -2.25, 1.4, 0x60cd59],
    [0.65, -2.4, 2.25, 0x28c776], [1.8, -2.3, 1.75, 0x74eb61],
    [3.0, -2.0, 2.55, 0xe66e77], [3.65, -1.95, 2.95, 0xf57989],
    [4.15, -2.1, 2.1, 0x39bf7b],
  ]) {
    const grass = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 0.8 });
    for (let blade = 0; blade < 3; blade++) {
      const points = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3((blade - 1) * 0.14, height * 0.35, 0),
        new THREE.Vector3((blade - 1) * 0.24 + 0.14, height * 0.75, 0),
        new THREE.Vector3((blade - 1) * 0.35 + 0.26, height, 0),
      ];
      const curve = new THREE.CatmullRomCurve3(points);
      const bladeMesh = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 12, 0.045, 5, false),
        material
      );
      grass.add(bladeMesh);
      for (const point of [0.42, 0.66, 0.83]) {
        const leaf = new THREE.Mesh(shared.body, material);
        leaf.position.copy(curve.getPoint(point));
        leaf.scale.set(0.20, 0.09, 0.035);
        leaf.rotation.z = (blade - 1) * 0.8 + point;
        grass.add(leaf);
      }
    }
    grass.position.set(x, -2.2, z);
    grass.userData.phase = x;
    scene.add(grass);
    plants.push(grass);
  }

  // Original driftwood silhouette: uneven stone core with branching timber.
  const driftwood = new THREE.Group();
  const woodMaterial = new THREE.MeshStandardMaterial({ color: 0x7a4c36, roughness: 0.95 });
  const stoneMaterial = new THREE.MeshStandardMaterial({ color: 0x9f8167, roughness: 1 });
  for (const [x, y, z, sx, sy, sz] of [
    [0, 0, 0, 1.12, 0.69, 0.55], [-0.5, -0.12, 0.3, 0.7, 0.48, 0.55],
    [0.69, -0.23, -0.12, 0.7, 0.4, 0.47],
  ]) {
    const rock = new THREE.Mesh(shared.pebble, stoneMaterial);
    rock.position.set(x, y, z);
    rock.scale.set(sx, sy, sz);
    rock.rotation.z = x * 0.28;
    driftwood.add(rock);
  }
  for (const [x, y, length, rotation] of [
    [-0.5, 0.12, 2.0, -0.75], [0.24, 0.24, 1.65, 0.87], [0.73, 0.11, 1.15, 1.17],
  ]) {
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, length, 7), woodMaterial);
    branch.position.set(x, y, -0.1);
    branch.rotation.z = rotation;
    driftwood.add(branch);
  }
  driftwood.position.set(-0.1, -1.66, -2.2);
  scene.add(driftwood);

  // A seeded generator keeps the scene familiar on every reload.
  let seed = 7843;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  for (let i = 0; i < 37; i++) {
    const stone = new THREE.Mesh(
      shared.pebble,
      new THREE.MeshStandardMaterial({ color: [0xd9b9a2, 0x7da49c, 0xe8ca8e, 0x67898f][i % 4], roughness: 0.95 })
    );
    const scale = 0.07 + random() * 0.17;
    stone.scale.set(scale * 1.6, scale * 0.7, scale);
    stone.position.set(-4.4 + random() * 8.8, -2.19, -1.9 + random() * 3.3);
    stone.rotation.set(random(), random() * 3, random());
    scene.add(stone);
  }

  const fish = [
    makeFish(0xffad37, 0xffe48e, -2.9, 0.75, -0.45, 0.76, 0.64),
    makeFish(0x50d5f5, 0x1c7bc7,  2.4, 1.35, -1.15, 0.68, -0.55),
    makeFish(0xff7289, 0xffc67b,  0.3, -0.15, 0.6, 0.64, 0.48),
    makeFish(0x8ce77e, 0xe6ffad, -1.8, -1.2, -1.1, 0.64, 0.46),
    makeFish(0xd9a6ff, 0x7860d8,  2.3, -0.9, 0.05, 0.60, -0.45),
    makeFish(0xf2d9a2, 0x273b40, -0.55, 1.48, -1.7, 0.65, -0.43, 0x273b40),
    makeFish(0xfccf46, 0x486be6, 1.5, 0.5, -0.6, 0.56, -0.55, 0x486be6),
    makeFish(0xf89e5b, 0xffda68, -3.1, -0.65, 0.2, 0.51, 0.39),
    makeFish(0xb7e9cf, 0x3c8f7e, 3.15, -1.45, -1.2, 0.57, -0.41, 0x3c8f7e),
    makeFish(0x8194f2, 0xf26c92, -2.35, 1.64, -1.9, 0.49, 0.45),
  ];

  function makeFish(color, accent, x, y, z, size, vx, stripeColor) {
    const root = new THREE.Group();
    const model = new THREE.Group();
    root.add(model);
    model.scale.setScalar(size);

    const bodyMaterial = new THREE.MeshPhysicalMaterial({
      color, roughness: 0.38, metalness: 0.04, clearcoat: 0.7, clearcoatRoughness: 0.2,
    });
    const finMaterial = new THREE.MeshStandardMaterial({
      color: accent, roughness: 0.52, side: THREE.DoubleSide,
    });
    const body = new THREE.Mesh(shared.body, bodyMaterial);
    body.scale.set(0.67, 0.36, 0.29);
    model.add(body);

    if (stripeColor) {
      const stripeMaterial = new THREE.MeshStandardMaterial({ color: stripeColor, roughness: 0.55 });
      for (const offset of [-0.24, 0.02, 0.25]) {
        const stripe = new THREE.Mesh(shared.body, stripeMaterial);
        stripe.scale.set(0.065, 0.33 - Math.abs(offset) * 0.2, 0.292);
        stripe.position.x = offset;
        model.add(stripe);
      }
    }

    const belly = new THREE.Mesh(
      shared.body,
      new THREE.MeshStandardMaterial({ color: accent, transparent: true, opacity: 0.58, roughness: 0.6 })
    );
    belly.scale.set(0.46, 0.15, 0.276);
    belly.position.set(0.08, -0.17, 0);
    model.add(belly);

    const tailShape = new THREE.Shape();
    tailShape.moveTo(0.05, 0);
    tailShape.quadraticCurveTo(-0.24, 0.22, -0.55, 0.42);
    tailShape.quadraticCurveTo(-0.36, 0, -0.55, -0.42);
    tailShape.quadraticCurveTo(-0.23, -0.22, 0.05, 0);
    const tailMesh = new THREE.Mesh(
      new THREE.ExtrudeGeometry(tailShape, {
        depth: 0.045, bevelEnabled: true, bevelThickness: 0.02,
        bevelSize: 0.025, bevelSegments: 1,
      }),
      finMaterial
    );
    tailMesh.position.z = -0.025;
    const tail = new THREE.Group();
    tail.position.x = -0.6;
    tail.add(tailMesh);
    model.add(tail);

    const dorsalShape = new THREE.Shape();
    dorsalShape.moveTo(-0.42, 0.21);
    dorsalShape.quadraticCurveTo(-0.31, 0.64, -0.05, 0.71);
    dorsalShape.quadraticCurveTo(0.12, 0.48, 0.34, 0.26);
    const dorsal = new THREE.Mesh(new THREE.ShapeGeometry(dorsalShape, 9), finMaterial);
    dorsal.position.z = -0.005;
    model.add(dorsal);

    for (const side of [-1, 1]) {
      const eyeWhite = new THREE.Mesh(shared.eye, new THREE.MeshStandardMaterial({ color: 0xfffaf0 }));
      eyeWhite.scale.setScalar(0.083);
      eyeWhite.position.set(0.43, 0.1, side * 0.235);
      model.add(eyeWhite);
      const pupil = new THREE.Mesh(shared.eye, new THREE.MeshStandardMaterial({ color: 0x071926, roughness: 0.15 }));
      pupil.scale.setScalar(0.043);
      pupil.position.set(0.45, 0.105, side * 0.308);
      model.add(pupil);
      const fin = new THREE.Mesh(shared.body, finMaterial);
      fin.scale.set(0.22, 0.11, 0.035);
      fin.position.set(-0.1, -0.11, side * 0.28);
      fin.rotation.z = side * 0.42;
      model.add(fin);
    }

    root.position.set(x, y, z);
    root.rotation.y = vx > 0 ? 0 : Math.PI;
    scene.add(root);
    return { root, model, tail, x, y, z, vx, vy: (random() - 0.5) * 0.2,
      size, phase: random() * 10, heading: root.rotation.y };
  }

  const bubbleGeometry = new THREE.SphereGeometry(1, 8, 6);
  const bubbleMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xc1ffff, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.32,
  });
  const bubbles = [];
  for (let i = 0; i < 23; i++) {
    const bubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
    const radius = 0.026 + random() * 0.063;
    bubble.scale.setScalar(radius);
    bubble.position.set(-3.55 + random() * 7, -2.1 + random() * 4.6, -1.8 + random() * 2.6);
    scene.add(bubble);
    bubbles.push({ mesh: bubble, speed: 0.16 + random() * 0.37, offset: random() * 9 });
  }

  // Moving the mouse gently attracts curious fish. Fast gestures make them dart away.
  const pointer = { active: false, x: 0, y: 0, speed: 0, lastAt: 0 };
  water.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch') return;
    const bounds = water.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 8.6;
    const y = (0.5 - (event.clientY - bounds.top) / bounds.height) * 4.8;
    const now = performance.now();
    const elapsed = Math.max(1, now - pointer.lastAt);
    pointer.speed = pointer.lastAt ? Math.hypot(x - pointer.x, y - pointer.y) / elapsed : 0;
    pointer.x = x;
    pointer.y = y;
    pointer.lastAt = now;
    pointer.active = true;
  });
  water.addEventListener('pointerleave', () => { pointer.active = false; });
  water.addEventListener('pointerdown', (event) => {
    const bounds = water.getBoundingClientRect();
    pointer.x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 8.6;
    pointer.y = (0.5 - (event.clientY - bounds.top) / bounds.height) * 4.8;
    pointer.active = true;
    pointer.speed = 0;
    pointer.lastAt = performance.now();
    // A tap brings the fish over to investigate for a moment.
    window.setTimeout(() => { pointer.active = false; }, 1600);
  });

  let lastFrame = performance.now();
  let elapsedTime = 0;
  let visible = true;
  let raf = 0;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resize() {
    const width = water.clientWidth;
    const height = water.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    renderer.render(scene, camera);
  }

  function animate(now) {
    raf = 0;
    const dt = Math.min((now - lastFrame) / 1000, 0.045);
    lastFrame = now;
    elapsedTime += dt;
    const t = elapsedTime;
    if (now - pointer.lastAt > 120) pointer.speed *= 0.87;

    for (const f of fish) {
      // Swim at varying speeds, with individual bobbing and gentle vertical drift.
      const cruise = (f.vx >= 0 ? 1 : -1) * (0.33 + f.size * 0.24);
      f.vx += (cruise - f.vx) * dt * 0.18;
      f.vy += Math.sin(t * 1.2 + f.phase) * dt * 0.05;
      f.vy *= Math.max(0, 1 - dt * 0.35);

      if (pointer.active) {
        const dx = pointer.x - f.x;
        const dy = pointer.y - f.y;
        const distance = Math.max(0.35, Math.hypot(dx, dy));
        if (distance < 3.2) {
          const strength = (3.2 - distance) / 3.2;
          const startled = pointer.speed > 0.018;
          const force = startled ? -5.8 : 0.9;
          f.vx += dx / distance * force * strength * dt;
          f.vy += dy / distance * force * strength * dt;
        }
      }

      const topSpeed = 1.85;
      f.vx = THREE.MathUtils.clamp(f.vx, -topSpeed, topSpeed);
      f.vy = THREE.MathUtils.clamp(f.vy, -0.9, 0.9);
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      if (f.x < -3.9 || f.x > 3.9) {
        f.x = THREE.MathUtils.clamp(f.x, -3.9, 3.9);
        f.vx = -f.vx;
      }
      if (f.y < -1.67 || f.y > 1.75) {
        f.y = THREE.MathUtils.clamp(f.y, -1.67, 1.75);
        f.vy = -f.vy;
      }
      f.root.position.set(f.x, f.y + Math.sin(t * 2 + f.phase) * 0.038, f.z);
      const targetHeading = f.vx >= 0 ? 0 : Math.PI;
      const difference = Math.atan2(Math.sin(targetHeading - f.heading), Math.cos(targetHeading - f.heading));
      f.heading += difference * Math.min(1, dt * 2.7);
      f.root.rotation.y = f.heading;
      f.model.rotation.z = THREE.MathUtils.clamp(f.vy * 0.16, -0.15, 0.15);
      f.tail.rotation.y = Math.sin(t * (8 + f.size * 2) + f.phase) * 0.42;
    }

    for (const [i, plant] of plants.entries()) {
      plant.rotation.z = Math.sin(t * 0.85 + i * 1.7) * 0.055;
    }
    for (const bubble of bubbles) {
      bubble.mesh.position.y += bubble.speed * dt;
      bubble.mesh.position.x += Math.sin(t * 1.2 + bubble.offset) * dt * 0.028;
      if (bubble.mesh.position.y > 2.5) bubble.mesh.position.y = -2.3;
    }

    renderer.render(scene, camera);
    if (!reducedMotion && visible && !document.hidden) raf = requestAnimationFrame(animate);
  }

  function resume() {
    if (raf || !visible || document.hidden) return;
    lastFrame = performance.now();
    raf = requestAnimationFrame(animate);
  }
  function pause() {
    cancelAnimationFrame(raf);
    raf = 0;
  }

  const sizeObserver = new ResizeObserver(resize);
  sizeObserver.observe(water);
  const visibilityObserver = new IntersectionObserver((entries) => {
    visible = entries[0]?.isIntersecting ?? false;
    if (visible) resume(); else pause();
  }, { threshold: 0.01 });
  visibilityObserver.observe(water);
  document.addEventListener('visibilitychange', () => document.hidden ? pause() : resume());
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    pause();
    water.classList.remove('is-running');
  }, false);

  resize();
  water.classList.add('is-running');
  if (reducedMotion) renderer.render(scene, camera);
  else resume();
}

function startCanvasAquarium(canvas, water) {
  const context = canvas.getContext('2d');
  if (!context) return;

  let width = 0;
  let height = 0;
  let frame = 0;
  let visible = true;
  let lastAt = performance.now();
  let time = 0;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pointer = { active: false, x: 0, y: 0, lastAt: 0, fast: false };
  const swimmers = [
    { x: .18, y: .40, speed: .054, color: '#ffd04a', fin: '#ff8644', size: .9, phase: 0 },
    { x: .71, y: .23, speed: -.037, color: '#62d5ff', fin: '#157dbb', size: .7, phase: 3 },
    { x: .59, y: .61, speed: .041, color: '#ff8198', fin: '#ffbd6e', size: .75, phase: 5 },
    { x: .85, y: .48, speed: -.046, color: '#c3f67b', fin: '#3ca376', size: .72, phase: 7 },
    { x: .28, y: .69, speed: .032, color: '#d9afff', fin: '#9473d8', size: .63, phase: 9 },
    { x: .39, y: .19, speed: -.044, color: '#e8e0ad', fin: '#274d55', size: .67, phase: 4, striped: true },
    { x: .79, y: .74, speed: .031, color: '#ffe27a', fin: '#6d8de7', size: .54, phase: 11, striped: true },
    { x: .13, y: .78, speed: .037, color: '#ffc6a3', fin: '#f06f72', size: .57, phase: 8 },
    { x: .58, y: .34, speed: -.028, color: '#95e5b6', fin: '#267a75', size: .61, phase: 13 },
  ];

  function resize() {
    width = water.clientWidth;
    height = water.clientHeight;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    draw();
  }

  function draw() {
    context.clearRect(0, 0, width, height);
    const sand = context.createLinearGradient(0, height * .82, 0, height);
    sand.addColorStop(0, 'rgba(138,190,159,.05)');
    sand.addColorStop(1, '#bca37b');
    context.fillStyle = sand;
    context.beginPath();
    context.moveTo(0, height * .91);
    context.quadraticCurveTo(width * .4, height * .87, width, height * .93);
    context.lineTo(width, height);
    context.lineTo(0, height);
    context.fill();

    // A loose driftwood-and-rock shape, drawn independently of the reference.
    context.fillStyle = '#795b47';
    context.beginPath();
    context.moveTo(width * .30, height * .84);
    context.bezierCurveTo(width * .28, height * .7, width * .42, height * .58, width * .50, height * .61);
    context.bezierCurveTo(width * .59, height * .64, width * .67, height * .76, width * .72, height * .87);
    context.closePath();
    context.fill();
    context.strokeStyle = '#664536';
    context.lineWidth = 10;
    context.beginPath();
    context.moveTo(width * .45, height * .76);
    context.lineTo(width * .29, height * .57);
    context.moveTo(width * .5, height * .76);
    context.lineTo(width * .66, height * .56);
    context.stroke();

    // Layered foliage: narrow water grasses and broader red/green leaves.
    for (const [i, baseX] of [.03, .065, .095, .14, .19, .23, .33, .62, .74, .79, .84, .89, .94, .97].entries()) {
      const baseY = height * .95;
      const sway = Math.sin(time * 1.4 + i) * width * .012;
      const isRed = i > 8 && i < 13;
      context.strokeStyle = isRed ? '#df6176' : i % 2 ? '#76ed8e' : '#1aa574';
      context.lineWidth = 3 + i % 3;
      context.lineCap = 'round';
      const tipY = baseY - 80 - (i % 4) * 18;
      context.beginPath();
      context.moveTo(baseX * width, baseY);
      context.bezierCurveTo(baseX * width - 15, baseY - 30, baseX * width + sway, baseY - 65, baseX * width + sway * 2, tipY);
      context.stroke();
      for (const fraction of [.27, .48, .70]) {
        const leafY = baseY + (tipY - baseY) * fraction;
        const leafX = baseX * width + sway * fraction;
        context.fillStyle = isRed ? '#f47a88' : (i % 2 ? '#47d478' : '#21b684');
        context.beginPath();
        context.ellipse(leafX + (i % 2 ? 5 : -5), leafY, 10, 3.2, (i % 2 ? -.55 : .55), 0, Math.PI * 2);
        context.fill();
      }
    }

    for (let i = 0; i < 52; i++) {
      const x = ((i * 47 + 31) % 101) / 101 * width;
      const y = height * (.96 + (i % 4) * .013);
      context.fillStyle = ['#d5c5a3', '#779b91', '#c5a178'][i % 3];
      context.beginPath();
      context.ellipse(x, y, 2 + i % 4, 1.5 + i % 2, 0, 0, Math.PI * 2);
      context.fill();
    }

    for (let i = 0; i < 18; i++) {
      const bubbleX = (.13 + ((i * 37) % 79) / 100) * width + Math.sin(time + i) * 3;
      const bubbleY = ((i * .139 - time * (.038 + i % 3 * .011)) % 1 + 1) % 1 * height;
      context.strokeStyle = 'rgba(202,255,255,.32)';
      context.lineWidth = 1.1;
      context.beginPath();
      context.arc(bubbleX, bubbleY, 1.5 + i % 3, 0, Math.PI * 2);
      context.stroke();
    }

    for (const fish of swimmers) {
      const size = fish.size * Math.min(1, width / 350);
      const x = fish.x * width;
      const y = fish.y * height + Math.sin(time * 2.5 + fish.phase) * 3;
      context.save();
      context.translate(x, y);
      if (fish.speed < 0) context.scale(-1, 1);
      context.scale(size, size);

      context.fillStyle = fish.fin;
      context.beginPath();
      context.moveTo(-16, 0);
      context.lineTo(-37, -14 + Math.sin(time * 9 + fish.phase) * 4);
      context.lineTo(-31, 0);
      context.lineTo(-37, 14 - Math.sin(time * 9 + fish.phase) * 4);
      context.closePath();
      context.fill();

      context.beginPath();
      context.moveTo(-12, -7);
      context.lineTo(-5, -20);
      context.lineTo(9, -8);
      context.closePath();
      context.fill();

      const sheen = context.createLinearGradient(-18, -13, 13, 14);
      sheen.addColorStop(0, '#f9ffde');
      sheen.addColorStop(.28, fish.color);
      sheen.addColorStop(1, fish.fin);
      context.fillStyle = sheen;
      context.beginPath();
      context.ellipse(0, 0, 22, 13, 0, 0, Math.PI * 2);
      context.fill();
      if (fish.striped) {
        context.strokeStyle = '#293a3f';
        context.lineWidth = 3.2;
        for (const band of [-8, 0, 8]) {
          context.beginPath();
          context.moveTo(band, -10);
          context.lineTo(band - 2, 10);
          context.stroke();
        }
      }
      context.fillStyle = '#fff8ed';
      context.beginPath();
      context.arc(11, -4, 3.6, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#09243b';
      context.beginPath();
      context.arc(12, -4, 2.1, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
  }

  function animate(now) {
    frame = 0;
    const dt = Math.min((now - lastAt) / 1000, 0.05);
    lastAt = now;
    time += dt;
    for (const fish of swimmers) {
      if (pointer.active) {
        const dx = pointer.x - fish.x;
        const dy = pointer.y - fish.y;
        const distance = Math.max(0.05, Math.hypot(dx, dy));
        if (distance < .38) {
          const nudge = (pointer.fast ? -.2 : .042) * dt;
          fish.speed += dx / distance * nudge;
          fish.y += dy / distance * nudge * .4;
        }
      }
      const direction = Math.sign(fish.speed) || 1;
      fish.speed += (direction * .043 - fish.speed) * dt * .4;
      fish.speed = Math.max(-.17, Math.min(.17, fish.speed));
      fish.x += fish.speed * dt;
      if (fish.x < .08 || fish.x > .92) fish.speed *= -1;
      fish.x = Math.min(.92, Math.max(.08, fish.x));
      fish.y = Math.min(.82, Math.max(.16, fish.y));
    }
    draw();
    if (!reducedMotion && visible && !document.hidden) frame = requestAnimationFrame(animate);
  }

  water.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch') return;
    const bounds = water.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    const now = performance.now();
    pointer.fast = pointer.lastAt > 0 && Math.hypot(x - pointer.x, y - pointer.y) / Math.max(1, now - pointer.lastAt) > .0009;
    Object.assign(pointer, { x, y, active: true, lastAt: now });
  });
  water.addEventListener('pointerleave', () => { pointer.active = false; });
  water.addEventListener('pointerdown', (event) => {
    const bounds = water.getBoundingClientRect();
    pointer.x = (event.clientX - bounds.left) / bounds.width;
    pointer.y = (event.clientY - bounds.top) / bounds.height;
    pointer.fast = false;
    pointer.active = true;
    window.setTimeout(() => { pointer.active = false; }, 1300);
  });
  new ResizeObserver(resize).observe(water);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible) cancelAnimationFrame(frame);
    else if (!frame) { lastAt = performance.now(); frame = requestAnimationFrame(animate); }
  }).observe(water);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
    else if (visible && !frame) { lastAt = performance.now(); frame = requestAnimationFrame(animate); }
  });

  resize();
  water.classList.add('is-running');
  if (!reducedMotion) frame = requestAnimationFrame(animate);
}
