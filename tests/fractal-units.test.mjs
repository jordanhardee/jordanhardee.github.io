import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { UNIT_GROUPS, categories, registerExtraUnits } from '../js/unit-catalog.mjs';
import { initialView, zoomView, approximate, scaleDescription, iterateFloat, iterateBigInt, colorForIteration } from '../js/fractal-math.mjs';

const require = createRequire(import.meta.url);
const math = require('../js/vendor/math.js');

test('every science unit converts into the first unit of its dimension', () => {
  registerExtraUnits(math);
  const groups = Object.values(UNIT_GROUPS);
  assert.ok(groups.length >= 6);
  assert.ok(Object.keys(categories).length >= 50);
  let count=0;
  for(const group of groups) for(const [name, units] of Object.entries(group)) {
    assert.ok(units.length>=2, `${name} needs multiple choices`);
    for(const [unit,label] of units) {
      const result = math.unit(1,unit).toNumber(units[0][0]);
      assert.ok(Number.isFinite(result),`${name} ${label}`);
      count++;
    }
  }
  assert.ok(count>=280);
  assert.ok(Math.abs(math.unit(1,'astronomicalUnit').toNumber('m') - 149597870700)<.1);
  assert.equal(math.unit(1,'byte').toNumber('bit'),8);
  assert.equal(math.unit(0,'degC').toNumber('degF'),32);
});

test('fractal viewport expands precision through hundreds of zooms', () => {
  let view=initialView();
  assert.ok(Math.abs(approximate(view.span,view.scalePower)-3.2)<1e-12);
  assert.equal(approximate(view.centerX,view.scalePower),-.5);
  for(let i=0;i<330;i++) view=zoomView(view,320,200,640,400);
  assert.ok(view.scalePower>80);
  assert.ok(view.span>0n);
  assert.match(scaleDescription(view), /10\^-/);
  assert.ok(approximate(view.centerX,view.scalePower)<0);
});

test('fractal algorithms include and exclude known points', () => {
  const limit=90, scale=10n**80n;
  for(const mode of ['mandelbrot','julia','burning-ship','tricorn','multibrot3','celtic']) {
    assert.ok(iterateFloat(3,3,mode,limit)<limit,mode);
    assert.ok(iterateBigInt(3n*scale,3n*scale,mode,limit,scale,0n,0n)<limit,mode);
  }
  assert.equal(iterateFloat(0,0,'mandelbrot',limit),limit);
  assert.equal(iterateBigInt(0n,0n,'mandelbrot',limit,scale),limit);
  for(const name of ['nebula','ocean','fire','monochrome']) {
    const color=colorForIteration(27,limit,name);
    assert.equal(color.length,4);
    assert.ok(color.every(v=>Number.isFinite(v)&&v>=0&&v<=255));
  }
});

test('Start menu keeps cybersecurity-only items in Hack the Planet and opens new apps', () => {
  const html=fs.readFileSync(new URL('../index.html', import.meta.url),'utf8');
  const hack=html.match(/<div class="xp-folder-contents" id="xp-folder-hack" hidden>([\s\S]*?)<\/div>/)?.[1]||'';
  const personal=html.match(/<div class="xp-folder-contents" id="xp-folder-personal" hidden>([\s\S]*?)<\/div>/)?.[1]||'';
  const apps=html.match(/<div class="xp-folder-contents" id="xp-folder-apps" hidden>([\s\S]*?)<\/div>/)?.[1]||'';
  assert.match(hack,/CyberChef/);
  assert.match(hack,/Cyber Threat Wire/);
  assert.doesNotMatch(hack,/Hacker News|Unit Converter|Graphing Calculator/);
  assert.match(personal,/Contact/);
  assert.match(personal,/About Me/);
  assert.match(personal,/github.com\/jordanhardee/);
  assert.match(apps,/Fractal Explorer/);
  assert.match(apps,/Unit Converter/);
  assert.match(apps,/data-open-window="stellarium"/);
  assert.match(html,/<iframe id="stellarium-frame"[^>]+data-src="https:\/\/stellarium-web\.org\/"/);
  assert.equal((html.match(/data-window="stellarium"/g)||[]).length,2);
  assert.match(html,/Icon Wall/);
  assert.match(html,/\(coming soon\)/);
  assert.equal((html.match(/data-window="about"/g)||[]).length,2);
  assert.equal((html.match(/data-window="fractal-explorer"/g)||[]).length,2);
});
