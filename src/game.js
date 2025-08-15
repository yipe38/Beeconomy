import { S, fmt, log, Flower, Bee } from './state.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// HUD refs
const elHoney = document.getElementById('honey');
const elCap = document.getElementById('capacity');
const elBeeCount = document.getElementById('beeCount');
const elFlowerQuota = document.getElementById('flowerQuota');
const elFlowerLeft = document.getElementById('flowerLeft');
const elNectar = document.getElementById('nectarQueue');
const elProcRate = document.getElementById('procRate');

// Shop buttons
const btns = {
  speed: document.getElementById('upgSpeed'),
  capacity: document.getElementById('upgCapacity'),
  quota: document.getElementById('upgQuota'),
  bee: document.getElementById('upgBee'),
  process: document.getElementById('upgProcess'),
};

function updateShop(){
  for(const key of Object.keys(btns)){
    const cost = Math.floor(S.costs[key]);
    btns[key].querySelector('span[data-cost]').textContent = fmt(cost);
    btns[key].disabled = S.honey < cost;
  }
}
for(const key of Object.keys(btns)){
  btns[key].addEventListener('click', ()=> buy(key));
}

function buy(key){
  const cost = Math.floor(S.costs[key]);
  if(S.honey < cost) return;
  S.honey -= cost;
  S.costs[key] *= S.costScale[key];

  switch(key){
    case 'speed':    S.beeSpeed *= 1.10; log('Upgrade: Fluggeschwindigkeit +10%'); break;
    case 'capacity': S.capacity += 25;    log('Upgrade: Lagerkapazität +25'); break;
    case 'quota':    S.flowerQuota += 2; S.flowerLeft += 2; log('Upgrade: Blumen-Quota +2 pro 10s'); break;
    case 'bee':      S.bees.push(new Bee(S.bees.length+1)); log('Neue Biene im Stock!'); break;
    case 'process':  S.processingRate = +(S.processingRate + 0.20).toFixed(2); log('Upgrade: Verarbeitung +0.20/s'); break;
  }
  refreshHUD();
  updateShop();
}

function refreshHUD(){
  elHoney.textContent = fmt(S.honey);
  elCap.textContent = fmt(S.capacity);
  elBeeCount.textContent = fmt(S.bees.length);
  elFlowerQuota.textContent = fmt(S.flowerQuota);
  elFlowerLeft.textContent = fmt(S.flowerLeft);
  elNectar.textContent = fmt(S.nectarQueue);
  elProcRate.textContent = S.processingRate.toFixed(2);
}

// Init
S.bees.push(new Bee(1));
S.lastQuotaReset = performance.now();

canvas.addEventListener('click', (e)=>{
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;

  if(S.flowerLeft <= 0){ popText('Limit erreicht!', x, y, '#ef4444'); return; }

  // Nicht zu nah an den Stock
  const dx=x-S.hive.x, dy=y-S.hive.y;
  if(Math.hypot(dx,dy) < S.hive.r + 24){
    popText('Zu nah am Stock', x, y, '#ef4444');
    return;
  }

  S.flowerLeft--;
  S.flowers.push( new Flower(x,y) );
  popText('+Blume', x, y, '#ffd166');
});

let particles = [];
function popText(text, x, y, color='#fff'){
  particles.push({text,x,y,vy:-24,life:1,color});
}

function nearestFlower(b){
  let best=null, bestD=1e9;
  for(const f of S.flowers){
    if(!f.hasNectar) continue;
    const d = Math.hypot(f.x-b.x, f.y-b.y);
    if(d<bestD){ best=f; bestD=d; }
  }
  return best;
}

function moveTowards(obj, tx, ty, speed, dt){
  const dx=tx-obj.x, dy=ty-obj.y;
  const d=Math.hypot(dx,dy);
  if(d<0.001) return;
  const v = speed * dt;
  const nx=dx/d, ny=dy/d;
  obj.x += nx*Math.min(v,d);
  obj.y += ny*Math.min(v,d);
}

function wanderAroundHive(b, dt){
  const a = (performance.now()/1000 + b.id) % (Math.PI*2);
  const r = S.hive.r + 16 + (b.id%3)*6;
  const cx = S.hive.x + Math.cos(a)*r;
  const cy = S.hive.y + Math.sin(a)*r;
  moveTowards(b, cx, cy, S.beeSpeed*0.5, dt);
}

function updateBee(b, dt){
  if(b.state==='idle'){
    const tgt = nearestFlower(b);
    if(tgt){ b.state='toFlower'; b.target=tgt; }
    else { wanderAroundHive(b, dt); }
  }
  if(b.state==='toFlower' && b.target){
    moveTowards(b, b.target.x, b.target.y, S.beeSpeed, dt);
    if(Math.hypot(b.target.x-b.x, b.target.y-b.y) < 8){
      b.state='collect';
      b.collectUntil = performance.now() + S.collectTime;
    }
  }
  if(b.state==='collect'){
    if(performance.now() >= b.collectUntil){
      if(b.target){
        b.target.hasNectar = false;
        b.target.regrowAt = performance.now() + S.flowerRegrowMs;
      }
      b.state='toHive'; b.target=null;
    }
  }
  if(b.state==='toHive'){
    moveTowards(b, S.hive.x, S.hive.y, S.beeSpeed, dt);
    if(Math.hypot(S.hive.x-b.x, S.hive.y-b.y) < S.hive.r-2){
      S.nectarQueue += S.nectarPerFlower;
      popText('+Nektar', S.hive.x, S.hive.y-40, '#60a5fa');
      refreshHUD(); updateShop();
      b.state='idle';
    }
  }
}

/* ---- Loop & Canvas ---- */
let last = performance.now();
function loop(now){
  const dt = (now-last)/1000; last=now;
  tickQuota(now);
  tickRegrow(now);
  tickProcessing(dt);
  update(dt);
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// 10s-Quota für Blumen
function tickQuota(now){
  if(now - S.lastQuotaReset >= 10_000){
    S.flowerLeft = S.flowerQuota;
    S.lastQuotaReset = now;
    refreshHUD();
    popText(`Quota erneuert: ${S.flowerLeft}`, S.hive.x, S.hive.y-60, '#60a5fa');
  }
}

// Respawn von Blumen
function tickRegrow(now){
  for(const f of S.flowers){
    if(!f.hasNectar && now >= f.regrowAt){
      f.hasNectar = true;
      popText('🌼 Blume ist nachgewachsen', f.x, f.y-14, '#a7f3d0');
    }
  }
}

// Verarbeitung: Nektar -> Honig
function tickProcessing(dt){
  if(S.nectarQueue <= 0 || S.honey >= S.capacity) return;
  const canMake = S.processingRate * dt;
  const free = S.capacity - S.honey;
  const made = Math.min(canMake, S.nectarQueue, free);
  S.nectarQueue -= made;
  S.honey += made;
  refreshHUD();
  updateShop();
}

function update(dt){
  for(const b of S.bees) updateBee(b, dt);
  particles.forEach(p=>{ p.y += p.vy*dt; p.life -= dt; });
  particles = particles.filter(p=>p.life>0);
}

function draw(){
  const resized = resizeCanvasIfNeeded();
  if(resized && S.autoCenterHive){
    // Stock in die Mitte des (neuen) Spielfelds setzen
    S.hive.x = canvas.width / 2;
    S.hive.y = canvas.height / 2;
  }

  const w=canvas.width, h=canvas.height;
  ctx.clearRect(0,0,w,h);

  // dezentes Grid
  ctx.globalAlpha=0.08; ctx.strokeStyle='#e2e8f0'; ctx.lineWidth=1;
  for(let x=0;x<w;x+=40){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
  for(let y=0;y<h;y+=40){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }
  ctx.globalAlpha=1;

  drawHive(S.hive.x,S.hive.y,S.hive.r);

  // Blumen (grau wenn leer)
  for(const f of S.flowers){ drawFlower(f.x,f.y,f.r, f.hasNectar); }

  // Bienen
  for(const b of S.bees){
    drawBee(b.x,b.y);
    if(b.state==='collect'){
      const left = Math.max(0, (b.collectUntil - performance.now()) / S.collectTime);
      drawRing(b.x, b.y, 12, 16, '#ffd166', 1-left);
    }
  }

  // Partikel
  for(const p of particles){
    ctx.globalAlpha = Math.max(0,p.life);
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.fillStyle = p.color;
    ctx.textAlign='center';
    ctx.fillText(p.text, p.x, p.y);
    ctx.globalAlpha = 1;
  }
}

function drawHive(x,y,r){
  ctx.fillStyle='#f59e0b'; ctx.strokeStyle='#111827'; ctx.lineWidth=2;
  ctx.beginPath();
  for(let i=0;i<6;i++){
    const a = Math.PI/3*i + Math.PI/6;
    const px = x + Math.cos(a)*r;
    const py = y + Math.sin(a)*r;
    if(i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#1f2937'; ctx.beginPath(); ctx.arc(x+r*0.4, y+2, r*0.35, 0, Math.PI*2); ctx.fill();
}

function drawFlower(x,y,r,hasNectar=true){
  ctx.strokeStyle='#166534'; ctx.lineWidth=3;
  ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x,y+16); ctx.stroke();

  ctx.fillStyle = hasNectar ? '#fda4af' : '#6b7280';
  for(let i=0;i<6;i++){
    const a = (Math.PI*2/6)*i;
    const px = x + Math.cos(a)*r;
    const py = y + Math.sin(a)*r;
    ctx.beginPath(); ctx.arc(px,py, r*0.7, 0, Math.PI*2); ctx.fill();
  }
  ctx.fillStyle = hasNectar ? '#f59e0b' : '#4b5563';
  ctx.beginPath(); ctx.arc(x,y, r*0.8, 0, Math.PI*2); ctx.fill();
}

function drawBee(x,y){
  ctx.fillStyle='#fbbf24';
  ctx.beginPath(); ctx.ellipse(x,y,8,6,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#111827';
  ctx.fillRect(x-4,y-6,2,12);
  ctx.fillRect(x+2,y-6,2,12);
  ctx.globalAlpha=0.75; ctx.fillStyle='#93c5fd';
  ctx.beginPath(); ctx.ellipse(x-6,y-8,5,3,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x+6,y-8,5,3,0,0,Math.PI*2); ctx.fill();
  ctx.globalAlpha=1;
  ctx.fillStyle='#111827';
  ctx.beginPath(); ctx.arc(x+5,y-1,1.5,0,Math.PI*2); ctx.fill();
}

function drawRing(x,y, r1, r2, color, t){
  ctx.save(); ctx.strokeStyle=color; ctx.lineWidth=r2-r1;
  ctx.beginPath(); ctx.arc(x,y,(r1+r2)/2, -Math.PI/2, -Math.PI/2 + t*Math.PI*2); ctx.stroke(); ctx.restore();
}

/* Canvas dynamisch auf Playarea-Größe + DPR setzen */
function resizeCanvasIfNeeded(){
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const rect = canvas.getBoundingClientRect();
  const w = Math.floor(rect.width * dpr);
  const h = Math.floor(rect.height * dpr);
  if(canvas.width !== w || canvas.height !== h){
    canvas.width = w; canvas.height = h;
    return true;
  }
  return false;
}

window.addEventListener('resize', () => { /* trigger Neu-Layout */ });

refreshHUD();
updateShop();
