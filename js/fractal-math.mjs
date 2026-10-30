// BigInt-backed complex viewport coordinates. Precision expands as the user
// zooms, instead of losing the fractal to 64-bit floating-point rounding.
export function initialView() {
  const scalePower = 80;
  const scale = 10n ** BigInt(scalePower);
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
    else if (algorithm === 'burning-ship') { nr = r2-i2+cx; ni = 2*Math.abs(zr*zi)+cy; }
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
    } else if (algorithm === 'burning-ship') {
      nr = r2-i2+cx;
      ni = 2n*(zr*zi < 0n ? -zr*zi : zr*zi)/scale+cy;
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

export function colorForIteration(count, limit, palette='nebula') {
  if (count >= limit) return [1, 7, 21, 255];
  const n = Math.max(0,count);
  if (palette === 'monochrome') {
    const g = Math.max(0, Math.min(255,Math.round(n*17 % 255)));
    return [g,g,g,255];
  }
  if (palette === 'fire') return [Math.min(255,Math.round(n*8)),Math.min(255,Math.round(Math.max(0,n-8)*5)),Math.min(230,Math.round(Math.max(0,n-22)*3)),255];
  if (palette === 'ocean') return [Math.round(15+25*(1+Math.sin(n*.11))),Math.round(60+80*(1+Math.sin(n*.12+.8))/2),Math.round(125+110*(1+Math.sin(n*.09+1.4))/2),255];
  return [Math.round(110+110*Math.sin(n*.08)),Math.round(105+105*Math.sin(n*.08+2.1)),Math.round(120+115*Math.sin(n*.08+4.2)),255];
}
