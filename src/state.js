export const S = {
  honey: 0,
  capacity: 50,
  bees: [],
  beeSpeed: 70, // px/s
  flowers: [],
  flowerQuota: 5,
  flowerLeft: 5,
  lastQuotaReset: 0,
  nectarPerFlower: 5,
  collectTime: 5_000, // 5s auf der Blume
  hive: { x: 480, y: 270, r: 28 },
  costs: { speed: 25, capacity: 30, quota: 40, bee: 60 },
  costScale: { speed: 1.35, capacity: 1.4, quota: 1.45, bee: 1.6 }
};

export function fmt(n){ return Math.floor(n).toLocaleString('de-DE'); }

export function log(msg){
  const el = document.getElementById('log');
  const p = document.createElement('div');
  const t = new Date().toLocaleTimeString('de-DE', { hour12:false });
  p.textContent = `[${t}] ${msg}`;
  el.prepend(p);
}

export class Flower{
  constructor(x,y){ this.x=x; this.y=y; this.r=10; this.harvested=false; }
}
export class Bee{
  constructor(id){
    this.id=id;
    this.x=S.hive.x + (Math.random()*8-4);
    this.y=S.hive.y + (Math.random()*8-4);
    this.state='idle'; // idle|toFlower|collect|toHive
    this.target=null;
    this.collectUntil=0;
  }
}
