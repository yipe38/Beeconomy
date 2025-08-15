export const S = {
  honey: 0,
  capacity: 50,
  nectarQueue: 0,
  processingRate: 0.25,

  bees: [],
  beeSpeed: 70,

  flowers: [],
  flowerQuota: 5,
  flowerLeft: 5,
  lastQuotaReset: 0,

  nectarPerFlower: 1,
  collectTime: 5_000,
  flowerRegrowMs: 15_000,

  hive: { x: 480, y: 270, r: 28 },
  autoCenterHive: true,

  costs: { speed: 25, capacity: 30, quota: 40, bee: 60, process: 50 },
  costScale: { speed: 1.35, capacity: 1.4, quota: 1.45, bee: 1.6, process: 1.5 }
};

export function fmt(n){ return Math.floor(n).toLocaleString('de-DE'); }

export function log(msg){
  const el = document.getElementById('log');
  if(!el) return;
  const p = document.createElement('div');
  const t = new Date().toLocaleTimeString('de-DE', { hour12:false });
  p.textContent = `[${t}] ${msg}`;
  el.prepend(p);
}

export class Flower{
  constructor(x,y){ this.x=x; this.y=y; this.r=10; this.hasNectar=true; this.regrowAt=0; }
}
export class Bee{
  constructor(id){
    this.id=id;
    this.x=S.hive.x + (Math.random()*8-4);
    this.y=S.hive.y + (Math.random()*8-4);
    this.state='idle'; this.target=null; this.collectUntil=0;
  }
}
