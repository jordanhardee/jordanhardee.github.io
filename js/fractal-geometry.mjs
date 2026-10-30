import { approximate, paletteColor } from './fractal-math.mjs?v=20261030-fractal-variety';

// Recursive and iterated-function fractals. Unlike escape-time sets, these
// are drawn as vector primitives, so their edges stay crisp on every redraw.
export function drawGeometricFractal(ctx, algorithm, palette, view, width, height) {
  const cx = approximate(view.centerX, view.scalePower);
  const cy = approximate(view.centerY, view.scalePower);
  const span = approximate(view.span, view.scalePower);
  const ratio = width / span;
  const px = x => width / 2 + (x - cx) * ratio;
  const py = y => height / 2 + (y - cy) * ratio;
  const rgb = (n, alpha=1) => `rgba(${paletteColor(palette,n).join(',')},${alpha})`;
  const bg = ctx.createLinearGradient(0,0,0,height);
  bg.addColorStop(0, palette === 'cozy' ? '#f7e3d0' : palette === 'lilac' ? '#e7e5f5' : '#d6f0f4');
  bg.addColorStop(1, palette === 'cozy' ? '#fff4df' : '#f7fbef');
  ctx.fillStyle = bg;
  ctx.fillRect(0,0,width,height);

  function line(ax,ay,bx,by,thickness,color) {
    ctx.beginPath(); ctx.moveTo(px(ax),py(ay)); ctx.lineTo(px(bx),py(by));
    ctx.lineWidth = Math.max(.6,thickness*ratio); ctx.strokeStyle=color; ctx.lineCap='round'; ctx.stroke();
  }
  function polygon(points,color) {
    ctx.beginPath();ctx.moveTo(px(points[0][0]),py(points[0][1]));
    for(let i=1;i<points.length;i++)ctx.lineTo(px(points[i][0]),py(points[i][1]));
    ctx.closePath();ctx.fillStyle=color;ctx.fill();
  }
  function branch(x,y,length,angle,depth,initial,squares=false) {
    const nx=x+Math.sin(angle)*length,ny=y-Math.cos(angle)*length;
    if (squares) {
      const side=Math.max(length*.32,.002);
      const vx=Math.cos(angle)*side/2,vy=Math.sin(angle)*side/2;
      polygon([[x-vx,y-vy],[x+vx,y+vy],[nx+vx,ny+vy],[nx-vx,ny-vy]],rgb(.05+.87*(initial-depth)/initial));
    } else line(x,y,nx,ny,length*.15,rgb(.08+.85*(initial-depth)/initial));
    if(depth===0) {
      ctx.beginPath();ctx.arc(px(nx),py(ny),Math.max(1,length*.28*ratio),0,2*Math.PI);
      ctx.fillStyle=rgb(.88,.85);ctx.fill();return;
    }
    branch(nx,ny,length*.73,angle-.44,depth-1,initial,squares);
    branch(nx,ny,length*.73,angle+.44,depth-1,initial,squares);
  }

  if (algorithm==='tree' || algorithm==='pythagoras-tree') {
    const depth = Math.min(14, 11 + Math.max(0,Math.floor(Math.log2(3.2/Math.max(span,.0000001)))));
    branch(0,.82,.46,0,depth,depth,algorithm==='pythagoras-tree');
  } else if (algorithm==='barnsley-fern') {
    let x=0,y=0,seed=79321;
    const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<75000;i++) {
      const r=rand();let nx,ny;
      if(r<.01){nx=0;ny=.16*y;}
      else if(r<.86){nx=.85*x+.04*y;ny=-.04*x+.85*y+1.6;}
      else if(r<.93){nx=.2*x-.26*y;ny=.23*x+.22*y+1.6;}
      else{nx=-.15*x+.28*y;ny=.26*x+.24*y+.44;}
      x=nx;y=ny;
      if(i<20)continue;
      if(i%128===0)ctx.fillStyle=rgb(.15+.7*Math.min(1,y/11),.66);
      ctx.fillRect(px(x*.25),py(.82-y*.155),Math.max(.65,ratio*.004),Math.max(.65,ratio*.004));
    }
  } else if (algorithm==='sierpinski-triangle') {
    const midpoint=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
    function triangle(a,b,c,d){
      if(d===0){polygon([a,b,c],rgb((a[0]+b[0]+c[0]+3)/6));return;}
      const ab=midpoint(a,b),bc=midpoint(b,c),ca=midpoint(c,a);
      triangle(a,ab,ca,d-1);triangle(ab,b,bc,d-1);triangle(ca,bc,c,d-1);
    }
    triangle([-1,.78],[1,.78],[0,-.85],Math.min(8,6+Math.max(0,Math.floor(Math.log2(3.2/span)))));
  } else if (algorithm==='sierpinski-carpet') {
    function carpet(x,y,size,depth){
      if(depth===0){ctx.fillStyle=rgb(.2+(x+1)/3);ctx.fillRect(px(x),py(y),size*ratio+.5,size*ratio+.5);return;}
      const sub=size/3;
      for(let row=0;row<3;row++)for(let col=0;col<3;col++)if(row!==1||col!==1)carpet(x+col*sub,y+row*sub,sub,depth-1);
    }
    carpet(-.85,-.85,1.7,Math.min(5,4+Math.max(0,Math.floor(Math.log2(3.2/span)))));
  } else if (algorithm==='koch-snowflake') {
    let drawn=0;
    function koch(ax,ay,bx,by,d){
      if(d===0){line(ax,ay,bx,by,.006,rgb((drawn++%900)/1000));return;}
      const dx=(bx-ax)/3,dy=(by-ay)/3;
      const mx=ax+dx,my=ay+dy;
      const nx=ax+2*dx,ny=ay+2*dy;
      const vx=mx+dx*.5-dy*Math.sqrt(3)/2,vy=my+dy*.5+dx*Math.sqrt(3)/2;
      koch(ax,ay,mx,my,d-1);koch(mx,my,vx,vy,d-1);koch(vx,vy,nx,ny,d-1);koch(nx,ny,bx,by,d-1);
    }
    const a=[0,-.78],b=[.85,.70],c=[-.85,.70],level=5;
    koch(...a,...b,level);koch(...b,...c,level);koch(...c,...a,level);
  } else if (algorithm==='dragon-curve') {
    let turns=[1];
    for(let n=0;n<11;n++)turns=turns.concat([1],turns.slice().reverse().map(t=>-t));
    let x=0,y=0,heading=0;const points=[[0,0]];
    for(const turn of turns){x+=[1,0,-1,0][heading];y+=[0,1,0,-1][heading];points.push([x,y]);heading=(heading+turn+4)%4;}
    x+=[1,0,-1,0][heading];y+=[0,1,0,-1][heading];points.push([x,y]);
    const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
    const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    const denom=Math.max(maxX-minX,maxY-minY)||1;
    for(let i=1;i<points.length;i++) {
      const a=points[i-1],b=points[i];
      line((a[0]-(minX+maxX)/2)/denom*1.8,(a[1]-(minY+maxY)/2)/denom*1.8,
        (b[0]-(minX+maxX)/2)/denom*1.8,(b[1]-(minY+maxY)/2)/denom*1.8,.008,rgb(i/points.length));
    }
  } else if (algorithm==='cantor-set') {
    function cantor(x,y,length,d){
      ctx.fillStyle=rgb(1-d/9);ctx.fillRect(px(x),py(y),length*ratio,Math.max(2,.037*ratio));
      if(d===0)return;
      cantor(x,y+.22,length/3,d-1);
      cantor(x+length*2/3,y+.22,length/3,d-1);
    }
    cantor(-.9,-.82,1.8,7);
  }
}
