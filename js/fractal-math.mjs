// BigInt-backed complex viewport coordinates. Precision expands as the user
// zooms, instead of losing the fractal to 64-bit floating-point rounding.
export const GEOMETRIC_FRACTALS = Object.freeze(['tree','pythagoras-tree','barnsley-fern','sierpinski-triangle','sierpinski-carpet','koch-snowflake','dragon-curve','cantor-set']);
export function isGeometricFractal(name) { return GEOMETRIC_FRACTALS.includes(name); }

export function initialView(algorithm = 'mandelbrot') {
  const scalePower = 80;
  const scale = 10n ** BigInt(scalePower);
  if (isGeometricFractal(algorithm)) return {scalePower,centerX:0n,centerY:0n,span:32n*scale/10n};
  return { scalePower, centerX: -scale / 2n, centerY: 0n, span: 32n * scale / 10n };
}

export function zoomView(view, x, y, width, height, numerator = 1n, denominator = 2n) {
  const w = BigInt(Math.max(1,Math.round(width)));
  const h = BigInt(Math.max(1,Math.round(height)));
  const px = BigInt(Math.max(0,Math.min(Math.round(width),Math.round(x))));
  const py = BigInt(Math.max(0,Math.min(Math.round(height),Math.round(y))));
  let result = {
    scalePower: view.scalePower,
    centerX: view.centerX + view.span * (2n * px - w) / (2n * w),
    centerY: view.centerY + view.span * (2n * py - h) / (2n * w),
    span: view.span * BigInt(numerator) / BigInt(denominator),
  };
  while (result.span < 10n ** 22n && result.span > 0n) {
    const expand = 10n ** 80n;
    result = { scalePower: result.scalePower + 80, centerX: result.centerX * expand, centerY: result.centerY * expand, span: result.span * expand };
  }
  if (result.span <= 0n) throw new RangeError('Zoom exceeded available precision');
  return result;
}

// Convert a fixed-point BigInt to an approximate Number without first casting
// the entire potentially thousand-digit integer to Infinity.
export function approximate(value, scalePower) {
  if (value === 0n) return 0;
  const negative = value < 0n;
  const digits = (negative ? -value : value).toString();
  const head = digits.slice(0, 16);
  const exp = digits.length - head.length - scalePower;
  return (negative ? -1 : 1) * Number(head) * Math.pow(10, exp);
}

export function scaleDescription(view) {
  const digits = view.span.toString();
  const length = Math.min(4,digits.length);
  const mantissa = Number(digits.slice(0,length)) / Math.pow(10,length-1);
  return `${mantissa.toFixed(2)} × 10^${digits.length - 1 - view.scalePower}`;
}

export function iterateFloat(x, y, algorithm, limit, juliaX=-0.7, juliaY=0.27015) {
  if (algorithm === 'mandelbrot') {
    const a = x - .25, q = a*a + y*y;
    if (q * (q + a) <= .25 * y*y || (x+1)*(x+1)+y*y <= .0625) return limit;
  }
  let zr = algorithm === 'julia' ? x : 0;
  let zi = algorithm === 'julia' ? y : 0;
  const cx = algorithm === 'julia' ? juliaX : x;
  const cy = algorithm === 'julia' ? juliaY : y;
  for (let i = 0; i < limit; i++) {
    const r2 = zr*zr, i2 = zi*zi;
    if (r2+i2 > 256) {
      const smooth = i + 1 - Math.log2(Math.max(.000001,Math.log2(Math.sqrt(r2+i2))));
      return Math.max(0,smooth);
    }
    let nr, ni;
    if (algorithm === 'multibrot3') { nr = zr*r2-3*zr*i2+cx; ni = 3*r2*zi-zi*i2+cy; }
    else if (algorithm === 'multibrot4') { const a=r2-i2,b=2*zr*zi;nr=a*a-b*b+cx;ni=2*a*b+cy; }
    else if (algorithm === 'burning-ship') { nr = r2-i2+cx; ni = 2*Math.abs(zr*zi)+cy; }
    else if (algorithm === 'perpendicular-ship') { nr = r2-i2+cx; ni = -2*Math.abs(zr)*zi+cy; }
    else if (algorithm === 'buffalo') { nr = Math.abs(r2-i2)+cx; ni = -2*Math.abs(zr*zi)+cy; }
    else if (algorithm === 'tricorn') { nr = r2-i2+cx; ni = -2*zr*zi+cy; }
    else if (algorithm === 'celtic') { nr = Math.abs(r2-i2)+cx; ni = 2*zr*zi+cy; }
    else { nr = r2-i2+cx; ni = 2*zr*zi+cy; }
    zr = nr; zi = ni;
  }
  return limit;
}

export function iterateBigInt(x, y, algorithm, limit, scale, juliaX=0n, juliaY=0n) {
  if (algorithm === 'mandelbrot') {
    const quarter = scale / 4n;
    const delta = x - quarter;
    const q = (delta * delta + y * y) / scale;
    if (q * (q + delta) <= y*y/4n || ((x + scale)*(x + scale) + y*y) * 16n <= scale*scale) return limit;
  }
  let zr = algorithm === 'julia' ? x : 0n;
  let zi = algorithm === 'julia' ? y : 0n;
  const cx = algorithm === 'julia' ? juliaX : x;
  const cy = algorithm === 'julia' ? juliaY : y;
  for (let i = 0; i < limit; i++) {
    const r2 = zr*zr / scale, i2 = zi*zi / scale;
    if (r2+i2 > 256n*scale) return i;
    let nr, ni;
    if (algorithm === 'multibrot3') {
      nr = zr*(r2-3n*i2)/scale+cx;
      ni = zi*(3n*r2-i2)/scale+cy;
    } else if (algorithm === 'multibrot4') {
      const a=r2-i2, b=2n*zr*zi/scale;
      nr=(a*a-b*b)/scale+cx;
      ni=2n*a*b/scale+cy;
    } else if (algorithm === 'burning-ship') {
      nr = r2-i2+cx;
      ni = 2n*(zr*zi < 0n ? -zr*zi : zr*zi)/scale+cy;
    } else if (algorithm === 'perpendicular-ship') {
      nr = r2-i2+cx;
      ni = -2n*(zr<0n?-zr:zr)*zi/scale+cy;
    } else if (algorithm === 'buffalo') {
      const a=r2-i2,b=zr*zi;
      nr = (a<0n?-a:a)+cx;
      ni = -2n*(b<0n?-b:b)/scale+cy;
    } else if (algorithm === 'tricorn') {
      nr = r2-i2+cx;
      ni = -2n*zr*zi/scale+cy;
    } else if (algorithm === 'celtic') {
      const difference = r2-i2;
      nr = (difference < 0n ? -difference : difference)+cx;
      ni = 2n*zr*zi/scale+cy;
    } else {
      nr = r2-i2+cx;
      ni = 2n*zr*zi/scale+cy;
    }
    zr = nr; zi = ni;
  }
  return limit;
}

// Restrained palettes based on adjacent harmonious hues, no rainbow sine waves.
export const PALETTES = Object.freeze({
  aero: [[18,70,116],[48,154,195],[115,209,210],[204,240,203],[255,246,209]],
  cozy: [[76,66,71],[137,92,86],[193,130,104],[229,182,140],[248,223,191]],
  meadow: [[39,93,84],[89,142,109],[161,193,142],[215,219,167],[249,241,212]],
  lilac: [[62,74,121],[119,118,164],[176,157,187],[220,190,194],[250,222,206]],
  seaglass: [[32,88,110],[55,140,151],[107,190,175],[186,220,196],[241,240,220]],
  monochrome: [[40,50,60],[90,110,120],[151,169,169],[209,220,213],[250,250,245]]
});

export function paletteColor(palette = 'aero', position = 0) {
  const stops = PALETTES[palette] || PALETTES.aero;
  const scaled = Math.max(0,Math.min(0.999999,position))* (stops.length-1);
  const i = Math.floor(scaled), fraction = scaled-i;
  return stops[i].map((value,j) => Math.round(value+(stops[i+1][j]-value)*fraction));
}

export function colorForIteration(count, limit, palette='aero') {
  if (count >= limit) return [18,36,52,255];
  // A long, gentle gradient wraps for large escape counts.
  const progression = ((Math.max(0,count)*0.024) % 1 + 1) % 1;
  return [...paletteColor(palette, progression),255];
}
