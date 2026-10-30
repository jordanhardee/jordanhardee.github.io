import { approximate, iterateFloat, iterateBigInt, colorForIteration } from './fractal-math.mjs?v=20261030-fractal-variety';

let latestJob = 0;
async function render(job) {
  const { id, width, height, algorithm, iterations, palette, juliaReal, juliaImag, view } = job;
  const scale = 10n ** BigInt(view.scalePower);
  const centerX = BigInt(view.centerX), centerY = BigInt(view.centerY), span = BigInt(view.span);
  const deep = span < scale / 1000000000000n;
  const floatX = approximate(centerX,view.scalePower);
  const floatY = approximate(centerY,view.scalePower);
  const floatSpan = approximate(span,view.scalePower);
  const cjr = BigInt(Math.round(juliaReal * 1e8)) * (scale / 100000000n);
  const cji = BigInt(Math.round(juliaImag * 1e8)) * (scale / 100000000n);
  const juliaRealFloat = Number(juliaReal), juliaImagFloat = Number(juliaImag);
  const w = BigInt(width), denominator = 2n*w;
  const xBig = deep ? Array.from({length:width},(_,x) => centerX + span * (2n*BigInt(x)+1n-w) / denominator) : null;
  self.postMessage({type:'started',id,deep});
  for (let row = 0; row < height; row += 8) {
    if (id !== latestJob) return;
    const count = Math.min(8,height-row);
    const pixels = new Uint8ClampedArray(width*count*4);
    for (let yOffset=0;yOffset<count;yOffset++) {
      const y = row+yOffset;
      const yBig = deep ? centerY + span * (2n*BigInt(y)+1n-BigInt(height)) / denominator : null;
      const yFloat = floatY+(y+.5-height/2)*floatSpan/width;
      for (let x=0;x<width;x++) {
        const escaped = deep
          ? iterateBigInt(xBig[x],yBig,algorithm,iterations,scale,cjr,cji)
          : iterateFloat(floatX+(x+.5-width/2)*floatSpan/width,yFloat,algorithm,iterations,juliaRealFloat,juliaImagFloat);
        const rgba = colorForIteration(escaped,iterations,palette);
        const offset=(yOffset*width+x)*4;
        pixels[offset]=rgba[0]; pixels[offset+1]=rgba[1]; pixels[offset+2]=rgba[2]; pixels[offset+3]=255;
      }
    }
    self.postMessage({type:'pixels',id,row,width,height:count,buffer:pixels.buffer},[pixels.buffer]);
    await new Promise(resolve => setTimeout(resolve,0));
  }
  if (id === latestJob) self.postMessage({type:'done',id,deep});
}

self.addEventListener('message',event => {
  if (event.data?.type === 'cancel') { latestJob = event.data.id; return; }
  if (event.data?.type !== 'render') return;
  const job=event.data;
  latestJob = job.id;
  render(job).catch(error => self.postMessage({type:'error',id:job.id,message:error.message}));
});
