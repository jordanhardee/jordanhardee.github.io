// Loads on demand. Opening the XP app releases the cats; closing it recalls them.
const panel = document.querySelector('[data-window="release-cats"]');
const swarm = document.getElementById('xp-cat-swarm');
const runway = document.getElementById('xp-cat-runway');
const status = document.getElementById('cats-status');
const releaseButton = document.getElementById('cats-release');
const recallButton = document.getElementById('cats-recall');

const jump = 'https://media.tenor.com/Nx5Dg2lKTtQAAAAC/cat-jump-happy-happy-happy.gif';
const cats = [
  'https://media1.tenor.com/m/z-mjeYYQpVIAAAAd/cat-funny-cathands.gif',
  'https://media1.tenor.com/m/gITmXE5hNvoAAAAC/cat-feeding.gif',
  'https://memesbams.com/wp-content/uploads/2017/11/Hilarious-Cat-Gifs.gif',
  'https://media.giphy.com/media/v6aOjy0Qo1fIA/giphy.gif',
];

const spots = [
  [7,15,0,180,-9],[35,18,1,155,9],[72,14,2,175,-7],[91,30,3,195,8],
  [20,49,3,190,8],[54,43,0,160,-8],[79,57,1,175,6],[8,78,2,190,-5],
  [37,82,1,175,10],[63,77,3,175,-8],[95,85,0,165,7],[48,10,2,145,-5],
  [15,31,1,150,5],[84,12,3,155,-10],[49,62,2,160,8],[71,94,0,145,-6],
];

if (panel && swarm && runway && releaseButton && recallButton) {
  let released = false;
  let count = 0;

  function addCat(index) {
    const [x,y,which,size,tilt] = spots[index % spots.length];
    const wrapper = document.createElement('span');
    wrapper.className = 'xp-cat-floater';
    wrapper.style.setProperty('--cat-x',`${x}%`);
    wrapper.style.setProperty('--cat-y',`${y}%`);
    wrapper.style.setProperty('--cat-width',`${size}px`);
    wrapper.style.setProperty('--cat-tilt',`${tilt}deg`);
    wrapper.style.setProperty('--cat-tilt-reverse',`${-tilt}deg`);
    wrapper.style.setProperty('--cat-delay',`${-(index%7)*.63}s`);
    const image = document.createElement('img');
    image.alt = '';
    image.decoding = 'async';
    image.src = cats[which];
    image.onerror = () => { image.onerror=null; image.src=cats[2]; };
    wrapper.appendChild(image);
    swarm.appendChild(wrapper);
    count++;
  }

  function addJumpers() {
    for (let i=0;i<3;i++) {
      const wrapper=document.createElement('span');
      wrapper.className='xp-cat-runner';
      wrapper.style.setProperty('--cat-delay',`${-i*4.8}s`);
      const image=document.createElement('img');
      image.src=jump;
      image.alt='';
      image.decoding='async';
      wrapper.appendChild(image);
      runway.appendChild(wrapper);
    }
  }

  function release() {
    if (!released) {
      released=true;
      swarm.hidden=false;
      runway.hidden=false;
      const mobile=window.innerWidth<650;
      const number=mobile?7:12;
      for(let i=0;i<number;i++)addCat(i);
      addJumpers();
    } else {
      const extra=Math.min(4,24-count);
      for(let i=0;i<extra;i++)addCat(count);
    }
    if(status)status.textContent=`${count} cats loose. Close this window to call them back.`;
  }

  function recall() {
    released=false;
    count=0;
    swarm.hidden=true;
    runway.hidden=true;
    swarm.replaceChildren();
    runway.replaceChildren();
    if(status)status.textContent='The cats are back inside.';
  }

  releaseButton.addEventListener('click',release);
  recallButton.addEventListener('click',recall);
  document.addEventListener('xp:window-opened',event=>{
    if(event.detail?.window==='release-cats' && !released) release();
  });
  document.addEventListener('xp:closed',event=>{
    if(event.detail?.window==='release-cats') recall();
  });
  // xp:window-opened fires before the dynamic import resolves on first launch.
  if(!panel.classList.contains('module-closed')) release();
}
