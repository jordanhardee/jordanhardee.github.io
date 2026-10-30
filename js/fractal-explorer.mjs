import { initialView, zoomView, scaleDescription } from './fractal-math.mjs';

const panel = document.querySelector('[data-window="fractal-explorer"]');
const canvas = document.getElementById('fractal-canvas');
const canvasWrap = document.getElementById('fractal-viewport');
const selection = document.getElementById('fractal-selection');
const algorithm = document.getElementById('fractal-algorithm');
const palette = document.getElementById('fractal-palette');
const iterations = document.getElementById('fractal-iterations');
const iterationValue = document.getElementById('fractal-iteration-value');
const status = document.getElementById('fractal-status');
const spanText = document.getElementById('fractal-scale');
const zoomIn = document.getElementById('fractal-zoom-in');
const zoomOut = document.getElementById('fractal-zoom-out');
const reset = document.getElementById('fractal-reset');
const previous = document.getElementById('fractal-previous');
const save = document.getElementById('fractal-save');
const juliaOptions = document.getElementById('fractal-julia-options');
const juliaReal = document.getElementById('fractal-julia-real');
const juliaImag = document.getElementById('fractal-julia-imag');

if (panel && canvas && canvasWrap && selection && algorithm && palette && iterations && iterationValue && status && spanText && zoomIn && zoomOut && reset && previous && save && juliaOptions && juliaReal && juliaImag) {
  let view = initialView();
  let history = [];
  let jobId = 0;
  let renderTimeout = null;
  let dragging = null;
  let worker;
  const context = canvas.getContext('2d', {alpha:false});
  const originalLabel = 'Click or tap to zoom ×2; drag a rectangle to zoom into an area. Scroll over the image to zoom.';

  try { worker = new Worker(new URL('./fractal-worker.mjs',import.meta.url),{type:'module'}); }
  catch (error) { status.textContent = `Fractal renderer unavailable: ${error.message}`; }

  function refreshScale() {
    spanText.textContent = `Horizontal span: ${scaleDescription(view)} · ${view.scalePower} decimal digits available`;
    previous.disabled = history.length===0;
    iterationValue.textContent = iterations.value;
    juliaOptions.hidden = algorithm.value !== 'julia';
  }
  function render() {
    refreshScale();
    if (!worker || !context) return;
    if (renderTimeout) window.clearTimeout(renderTimeout);
    const size = canvasWrap.getBoundingClientRect();
    const deep = view.span < 10n**BigInt(view.scalePower) / 1000000000000n;
    const width = Math.max(200, Math.min(deep ? 270 : 720,Math.round(size.width||570)));
    const height = Math.max(140,Math.round(width*0.625));
    canvas.width = width;
    canvas.height = height;
    context.fillStyle='#030c1e'; context.fillRect(0,0,width,height);
    const chosenIterations = Math.min(Number(iterations.value),deep ? 360 : 1100);
    status.textContent = deep ? 'Rendering with expanded BigInt precision… (deep zoom is slower)' : 'Rendering…';
    jobId++;
    worker.postMessage({type:'render',id:jobId,width,height,algorithm:algorithm.value,palette:palette.value,
      iterations:chosenIterations,juliaReal:Number(juliaReal.value),juliaImag:Number(juliaImag.value),
      view:{centerX:view.centerX.toString(),centerY:view.centerY.toString(),span:view.span.toString(),scalePower:view.scalePower}});
  }
  function scheduleRender() {
    if (renderTimeout) clearTimeout(renderTimeout);
    renderTimeout=window.setTimeout(() => { renderTimeout=null; render(); },120);
  }
  if (worker) {
    worker.onmessage = event => {
      const message=event.data;
      if (message.id !== jobId) return;
      if (message.type === 'pixels') {
        const pixels = new ImageData(new Uint8ClampedArray(message.buffer),message.width,message.height);
        context.putImageData(pixels,0,message.row);
        status.textContent = `Rendering… ${Math.round((message.row+message.height)/canvas.height*100)}%${view.scalePower>80 ? ' · deep precision' : ''}`;
      } else if (message.type === 'done') status.textContent = message.deep ? `${originalLabel} Deep precision mode.` : originalLabel;
      else if (message.type === 'error') status.textContent = `Rendering error: ${message.message}`;
    };
    worker.onerror = event => { status.textContent = `Renderer error: ${event.message || 'Worker stopped'}`; };
  }
  function saveView() { history.push({...view}); if(history.length>100)history.shift(); }
  function zoomAt(x,y,number=1n,denominator=2n) {
    saveView();
    view = zoomView(view,x,y,canvasWrap.clientWidth,canvasWrap.clientHeight,number,denominator);
    render();
  }
  function rectPoint(event) {
    const rect=canvasWrap.getBoundingClientRect();
    return {x:Math.max(0,Math.min(rect.width,event.clientX-rect.left)),y:Math.max(0,Math.min(rect.height,event.clientY-rect.top))};
  }
  canvasWrap.addEventListener('pointerdown',event => {
    if (event.button!==0 || dragging) return;
    const point=rectPoint(event);
    dragging={id:event.pointerId,start:point,current:point};
    canvasWrap.setPointerCapture(event.pointerId);
  });
  canvasWrap.addEventListener('pointermove',event => {
    if (!dragging || dragging.id!==event.pointerId) return;
    dragging.current=rectPoint(event);
    const minX=Math.min(dragging.start.x,dragging.current.x), minY=Math.min(dragging.start.y,dragging.current.y);
    const width=Math.abs(dragging.start.x-dragging.current.x), height=Math.abs(dragging.start.y-dragging.current.y);
    if (Math.max(width,height)<8) return;
    selection.hidden=false;
    Object.assign(selection.style,{left:`${minX}px`,top:`${minY}px`,width:`${width}px`,height:`${height}px`});
  });
  function finishDrag(event) {
    if (!dragging || dragging.id!==event.pointerId) return;
    const point=rectPoint(event);
    const start=dragging.start;
    dragging=null;
    selection.hidden=true;
    const dx=Math.abs(point.x-start.x),dy=Math.abs(point.y-start.y);
    if (Math.max(dx,dy)<8) { zoomAt(point.x,point.y); return; }
    // Preserve image aspect ratio and the larger requested axis of selection.
    const fraction=Math.max(dx/canvasWrap.clientWidth,dy/canvasWrap.clientHeight,.005);
    const resolution=1000000n;
    zoomAt((start.x+point.x)/2,(start.y+point.y)/2,BigInt(Math.max(1,Math.round(fraction*1e6))),resolution);
  }
  canvasWrap.addEventListener('pointerup',finishDrag);
  canvasWrap.addEventListener('pointercancel',() => {dragging=null;selection.hidden=true;});
  canvasWrap.addEventListener('wheel',event => {
    event.preventDefault();
    const point=rectPoint(event);
    zoomAt(point.x,point.y,event.deltaY>0 ? 2n : 1n,event.deltaY>0 ? 1n : 2n);
  },{passive:false});
  canvasWrap.addEventListener('keydown',event => {
    if(event.key==='+' || event.key==='='){event.preventDefault();zoomAt(canvasWrap.clientWidth/2,canvasWrap.clientHeight/2);}
    else if(event.key==='-'){event.preventDefault();zoomAt(canvasWrap.clientWidth/2,canvasWrap.clientHeight/2,2n,1n);}
  });
  zoomIn.addEventListener('click',() => zoomAt(canvasWrap.clientWidth/2,canvasWrap.clientHeight/2));
  zoomOut.addEventListener('click',() => zoomAt(canvasWrap.clientWidth/2,canvasWrap.clientHeight/2,2n,1n));
  reset.addEventListener('click',() => {saveView(); view=initialView();render();});
  previous.addEventListener('click',() => {if(!history.length)return;view=history.pop();render();});
  algorithm.addEventListener('change',() => {saveView();view=initialView();render();});
  palette.addEventListener('change',render);
  iterations.addEventListener('input',() => {iterationValue.textContent=iterations.value;scheduleRender();});
  for (const input of [juliaReal,juliaImag]) input.addEventListener('change',render);
  save.addEventListener('click',() => { const link=document.createElement('a');link.href=canvas.toDataURL('image/png');link.download=`fractal-${algorithm.value}.png`;link.click(); });
  if ('ResizeObserver' in window) {
    let lastWidth=0;
    new ResizeObserver(entries => {const width=entries[0]?.contentRect?.width||0;if(width>0&&Math.abs(width-lastWidth)>20){lastWidth=width;scheduleRender();}}).observe(canvasWrap);
  }
  document.addEventListener('xp:closed',event => {
    if(event.detail?.window !== 'fractal-explorer') return;
    jobId++;
    worker?.postMessage({type:'cancel',id:jobId});
  });
  document.addEventListener('xp:open-window',event => {
    if(event.detail?.window === 'fractal-explorer' && jobId>0) scheduleRender();
  });
  refreshScale();
  render();
}
