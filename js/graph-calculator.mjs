import { loadMath } from './math-loader.mjs';

const expression = document.getElementById('calc-expression');
const result = document.getElementById('calc-result');
const keypad = document.getElementById('calc-keypad');
const plotInput = document.getElementById('calc-graph-expression');
const plotButton = document.getElementById('calc-plot');
const plotCanvas = document.getElementById('calc-graph');
const plotMessage = document.getElementById('calc-graph-message');

if (expression && result && keypad && plotInput && plotButton && plotCanvas && plotMessage) {
  const keys = [
    ['7', '7'], ['8', '8'], ['9', '9'], ['÷', '/'], ['sin', 'sin('], ['(', '('],
    ['4', '4'], ['5', '5'], ['6', '6'], ['×', '*'], ['cos', 'cos('], [')', ')'],
    ['1', '1'], ['2', '2'], ['3', '3'], ['−', '-'], ['tan', 'tan('], ['√', 'sqrt('],
    ['0', '0'], ['.', '.'], ['π', 'pi'], ['+', '+'], ['x²', '^2'], ['^', '^'],
    ['C', 'clear'], ['⌫', 'backspace'], ['ln', 'log('], ['e', 'e'], ['!', '!'], ['=', 'equals'],
  ];
  let math = null;
  const format = value => typeof value === 'number' ? Number(value.toPrecision(12)).toString() : math.format(value, {precision: 12});

  function calculate() {
    if (!math) return;
    const text = expression.value.trim();
    if (!text) { result.textContent = 'Enter an expression'; return; }
    if (text.length > 250) { result.textContent = 'Expression too long'; return; }
    try {
      const value = math.evaluate(text);
      if (typeof value === 'function' || typeof value === 'object' && value && !math.isUnit(value) && !math.isComplex(value) && !math.isBigNumber(value)) {
        throw new Error('Expected a numerical result');
      }
      result.textContent = format(value);
    } catch (error) { result.textContent = `Error: ${error.message}`; }
  }
  function pressKey(key) {
    if (key === 'equals') { calculate(); return; }
    if (key === 'clear') { expression.value = ''; calculate(); expression.focus(); return; }
    if (key === 'backspace') { expression.value = expression.value.slice(0, -1); calculate(); expression.focus(); return; }
    const start = expression.selectionStart ?? expression.value.length;
    const end = expression.selectionEnd ?? start;
    expression.setRangeText(key, start, end, 'end');
    calculate(); expression.focus();
  }
  keypad.replaceChildren(...keys.map(([label, value]) => {
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = label;
    if (value === 'equals') button.classList.add('equals');
    button.addEventListener('click', () => pressKey(value));
    return button;
  }));
  expression.addEventListener('input', calculate);
  expression.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); calculate(); } });

  function plot() {
    if (!math) return;
    const formula = plotInput.value.trim();
    if (formula.length > 250 || !formula) { plotMessage.textContent = 'Enter a function of x, up to 250 characters.'; return; }
    let compiled;
    try { compiled = math.compile(formula); }
    catch (error) { plotMessage.textContent = `Function error: ${error.message}`; return; }
    const samples = [];
    const steps = 500;
    for (let i = 0; i <= steps; i++) {
      const x = -10 + 20 * i / steps;
      let y;
      try { y = Number(compiled.evaluate({ x })); }
      catch { y = NaN; }
      samples.push([x, Number.isFinite(y) && Math.abs(y) < 100000 ? y : NaN]);
    }
    const finite = samples.map(point => point[1]).filter(Number.isFinite);
    if (!finite.length) { plotMessage.textContent = 'No finite values for x between -10 and 10.'; return; }
    const panelWidth = plotCanvas.getBoundingClientRect().width || 600;
    const width = Math.max(240, Math.round(panelWidth));
    const height = Math.round(Math.min(420, width * .52));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    plotCanvas.width = Math.round(width * dpr);
    plotCanvas.height = Math.round(height * dpr);
    const ctx = plotCanvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#f9fbff'; ctx.fillRect(0, 0, width, height);
    const sorted = [...finite].sort((a,b) => a-b);
    let bound = Math.max(2, Math.abs(sorted[Math.floor(sorted.length * .05)]), Math.abs(sorted[Math.floor(sorted.length * .95)]));
    bound = Math.min(10000, Math.ceil(bound * 1.15));
    const xPixel = x => (x + 10) / 20 * width;
    const yPixel = y => (bound - y) / (2 * bound) * height;
    ctx.strokeStyle = '#d7e1f4'; ctx.lineWidth = 1;
    for (let x = -10; x <= 10; x += 2) { const px = xPixel(x); ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, height); ctx.stroke(); }
    for (let i = -4; i <= 4; i++) { const py = yPixel(i * bound / 5); ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(width, py); ctx.stroke(); }
    ctx.strokeStyle = '#6c7f9d'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(xPixel(0), 0); ctx.lineTo(xPixel(0), height); ctx.moveTo(0, yPixel(0)); ctx.lineTo(width, yPixel(0)); ctx.stroke();
    ctx.strokeStyle = '#0a65b8'; ctx.lineWidth = 2; ctx.beginPath();
    let connected = false;
    for (const [x,y] of samples) {
      if (!Number.isFinite(y) || Math.abs(y) > bound) { connected = false; continue; }
      const px = xPixel(x), py = yPixel(y);
      if (!connected) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      connected = true;
    }
    ctx.stroke();
    plotMessage.textContent = `Showing y = ${formula}, x: −10 to 10, y: ±${bound}.`;
  }
  plotButton.addEventListener('click', plot);
  plotInput.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); plot(); } });
  loadMath().then(value => {
    math = value;
    calculate();
    plot();
    if ('ResizeObserver' in window) {
      let previousWidth = 0;
      new ResizeObserver(entries => {
        const width = entries[0]?.contentRect?.width || 0;
        if (width > 0 && Math.abs(width - previousWidth) > 4) { previousWidth = width; plot(); }
      }).observe(plotCanvas.parentElement);
    }
  }).catch(error => { result.textContent = error.message; plotMessage.textContent = error.message; });
}
