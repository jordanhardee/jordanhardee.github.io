import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const script = readFileSync(new URL('../js/floppa-friday.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/style.css', import.meta.url), 'utf8');

function harness() {
  const events = [];
  const rafs = new Map();
  const sources = [];
  let nextFrame = 1;
  function element() {
    return {
      hidden:false, dataset:{}, children:[], handlers:{}, style:{}, offsetWidth:110,
      addEventListener(name, fn) { this.handlers[name] = fn; },
      appendChild(child) { this.children.push(child); },
      setAttribute() {}, focus() { this.focused = true; },
    };
  }
  const trigger = element();
  const show = element();
  const close = element();
  const smiley = element();
  smiley.src = '';
  smiley.dataset.src = 'assets/floppa-friday/holy-moly.gif';
  const canvas = element();
  const noop = () => {};
  canvas.getContext = () => ({
    setTransform:noop, clearRect:noop, save:noop, restore:noop, translate:noop,
    rotate:noop, beginPath:noop, moveTo:noop, lineTo:noop, stroke:noop,
    arc:noop, rect:noop, clip:noop, drawImage:noop,
  });
  const lines = [element(), element()];
  lines[0].dataset.rainbowText = 'HOLY MOLY,';
  lines[1].dataset.rainbowText = "IT'S FLOPPA FRIDAY!";
  show.querySelectorAll = () => lines;
  const video = { paused:false, pause() { this.paused = true; }, play() { this.paused = false; return Promise.resolve(); } };
  const nodes = {
    'floppa-friday-trigger':trigger, 'floppa-friday-show':show,
    'floppa-friday-close':close, 'floppa-friday-particles':canvas,
    'floppa-friday-holy-moly':smiley, 'happy-video':video,
  };
  const bodyClasses = new Set();
  const document = {
    getElementById:id => nodes[id],
    createElement:element,
    body:{ classList:{ add:v=>bodyClasses.add(v),remove:v=>bodyClasses.delete(v) } },
    listeners:{}, addEventListener(name,fn){this.listeners[name]=fn;},
    dispatchEvent(event){events.push(event.type);},
  };
  const window = {
    innerWidth:1200, innerHeight:820, devicePixelRatio:1,
    matchMedia:() => ({matches:false}), addEventListener:noop,
    AudioContext:class {
      constructor() { this.currentTime = 0; this.destination = {}; }
      resume() { return Promise.resolve(); }
      decodeAudioData() { return Promise.resolve({duration:.92}); }
      createGain() { return { gain:{value:0},connect:noop }; }
      createBufferSource() {
        const source = { started:false, stopped:false,connect:noop,disconnect:noop,
          start(){this.started=true;},stop(){this.stopped=true;} };
        sources.push(source);
        return source;
      }
    },
  };
  class Image {
    constructor(){this.src='';}
    addEventListener(){}
  }
  const CustomEvent = class {constructor(type,opts){this.type=type;this.detail=opts.detail;}};
  const requestAnimationFrame = fn => {const id=nextFrame++;rafs.set(id,fn);return id;};
  const cancelAnimationFrame = id => rafs.delete(id);
  const fetch = async () => ({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)});
  vm.runInNewContext(script,{document,window,Image,CustomEvent,requestAnimationFrame,cancelAnimationFrame,fetch});
  return {trigger,show,close,smiley,video,lines,events,rafs,sources,bodyClasses};
}

test('uses both supplied Floppa images and an authentic animated holy-moly GIF', () => {
  assert.match(html, /id="floppa-friday-trigger"/);
  assert.match(html, /id="floppa-friday-show"[^>]*role="dialog"/);
  assert.match(html, /data-rainbow-text="HOLY MOLY,"/);
  assert.match(html, /data-rainbow-text="IT'S FLOPPA FRIDAY!"/);
  assert.match(css, /\.floppa-friday-title\s*\{[^}]*'Mario'/);
  for (const path of ['beanie-floppa.webp','fractal-floppas.webp']) {
    const bytes = readFileSync(new URL(`../assets/floppa-friday/${path}`,import.meta.url));
    assert.equal(bytes.toString('ascii',0,4),'RIFF');
  }
  const gif = readFileSync(new URL('../assets/floppa-friday/holy-moly.gif',import.meta.url));
  assert.match(gif.toString('ascii',0,6),/^GIF8[79]a$/);
  assert.ok(gif.length > 10_000);
  assert.ok(readFileSync(new URL('../assets/floppa-friday/holy-moly.mp3',import.meta.url)).length > 3_000);
});

test('shaking square moves, click opens fractal show with sound, close restores desktop', async () => {
  const page = harness();
  assert.match(page.trigger.style.transform,/translate3d/);
  assert.match(css, /floppa-frantic-shake \.085s/);
  const first = page.trigger.style.transform;
  const step = [...page.rafs.values()][0];
  step(100);
  const next = [...page.rafs.values()].at(-1);
  next(150);
  assert.notEqual(page.trigger.style.transform,first,'the small square travels across the desktop');
  page.trigger.handlers.click();
  assert.equal(page.trigger.hidden,true);
  assert.equal(page.show.hidden,false);
  assert.equal(page.video.paused,true);
  assert.equal(page.smiley.src,'assets/floppa-friday/holy-moly.gif');
  assert.equal(page.show.dataset.state,'exploding');
  assert.ok(page.events.includes('xp:floppa-playback-start'));
  assert.ok(page.bodyClasses.has('floppa-friday-active'));
  assert.equal(page.lines[0].children.length,10);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(page.sources.length,1);
  assert.equal(page.sources[0].started,true);
  assert.equal(page.show.dataset.audio,'playing');
  page.close.handlers.click();
  assert.equal(page.show.hidden,true);
  assert.equal(page.trigger.hidden,false);
  assert.equal(page.sources[0].stopped,true);
  assert.equal(page.show.dataset.audio,'stopped');
  assert.ok(page.events.includes('xp:floppa-playback-stop'));
  assert.equal(page.video.paused,false);
  assert.ok(!page.bodyClasses.has('floppa-friday-active'));
});
