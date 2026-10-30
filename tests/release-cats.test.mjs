import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const script = readFileSync(new URL('../js/release-cats.mjs',import.meta.url),'utf8');
const html = readFileSync(new URL('../index.html',import.meta.url),'utf8');

function makePage(width=1200) {
  const events = new Map();
  const element = () => ({
    hidden:true, children:[], style:{setProperty(){}},
    listeners:{}, addEventListener(type,handler){this.listeners[type]=handler;},
    appendChild(child){this.children.push(child);},
    replaceChildren(){this.children=[];},
  });
  const swarm=element(),runway=element(),status={textContent:''};
  const release=element(),recall=element();
  const panel={classList:{contains:name=>name==='module-closed'}};
  const document={
    querySelector:()=>panel,
    getElementById:id=>({
      'xp-cat-swarm':swarm,'xp-cat-runway':runway,'cats-status':status,
      'cats-release':release,'cats-recall':recall,
    })[id]||null,
    createElement:element,
    addEventListener:(name,listener)=>events.set(name,listener),
  };
  vm.runInNewContext(script,{document,window:{innerWidth:width}});
  const dispatch=(name,app='release-cats')=>events.get(name)?.({detail:{window:app}});
  return {swarm,runway,status,release,recall,dispatch};
}

test('Release the Cats stays lazy until opened and recalls cats on close',()=>{
  assert.match(html,/data-open-window="release-cats"/);
  assert.match(html,/data-window="release-cats"/);
  assert.match(html,/id="xp-cat-swarm"/);
  assert.match(html,/id="xp-cat-runway"/);
  assert.match(html,/data-window="release-cats" aria-label="Restore Release the Cats"/);
  assert.doesNotMatch(html,/<script[^>]+src="js\/release-cats\.mjs/);
  const page=makePage();
  assert.equal(page.swarm.children.length,0);
  page.dispatch('xp:window-opened');
  assert.equal(page.swarm.children.length,12);
  assert.equal(page.runway.children.length,3);
  assert.equal(page.swarm.hidden,false);
  page.release.listeners.click();
  assert.equal(page.swarm.children.length,16);
  page.dispatch('xp:closed');
  assert.equal(page.swarm.children.length,0);
  assert.equal(page.runway.children.length,0);
  assert.equal(page.swarm.hidden,true);
  page.dispatch('xp:window-opened');
  assert.equal(page.swarm.children.length,12);
});

test('mobile releases fewer animations to conserve memory',()=>{
  const page=makePage(390);
  page.dispatch('xp:window-opened');
  assert.equal(page.swarm.children.length,7);
  assert.equal(page.runway.children.length,3);
  page.recall.listeners.click();
  assert.equal(page.swarm.hidden,true);
});
