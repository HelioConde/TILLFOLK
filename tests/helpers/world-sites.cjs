"use strict";
/* Seleção dinâmica de terreno livre no mundo atual. Evita fixtures da
   antiga fazenda 28×18 e não altera o save nem concede recursos. */
async function findFreeSite(page,{width=1,height=1,kind="field",count=1}={}){
  return page.evaluate(({width,height,kind,count})=>{
    const s=JSON.parse(localStorage.getItem("tillfolk-v01"));
    if(!s?.world||!Array.isArray(s.plots))throw new Error("Save do jogo indisponível");
    const world=s.world,plot=new Map(s.plots.map(p=>[p.x+","+p.y,p]));
    const water=new Set((world.water||[]).map(p=>p.x+","+p.y));
    const objects=new Set((world.objects||[]).map(p=>p.x+","+p.y));
    const reserved=new Set((s.orders||[]).map(o=>o.x+","+o.y));
    const occupied=new Set([...(s.homes||[]),...(s.workstations||[]),...(s.chests||[]),
      ...(s.wells||[]),...(s.animals||[]).map(a=>({x:Math.floor(a.x),y:Math.floor(a.y)}))]
      .map(p=>p.x+","+p.y));
    const target=s.spawn||{x:world.width/2,y:world.height/2};
    const candidates=[];
    const requiredWidth=Math.max(width,count);
    for(let y=3;y<world.height-height-2;y++)
      for(let x=3;x<world.width-requiredWidth-2;x++){
        let valid=true;
        for(let dy=0;dy<height&&valid;dy++)
          for(let dx=0;dx<requiredWidth;dx++){
            const xx=x+dx,yy=y+dy,k=xx+","+yy,p=plot.get(k);
            const terrain=window.TillfolkWild.terrainAt(world,xx,yy);
            if(!p||water.has(k)||objects.has(k)||reserved.has(k)||occupied.has(k)||
              (kind==="field"&&!terrain.farmable)||(kind==="home"&&!terrain.buildable)||
              p.selected||p.tilled||p.seeded||p.produce||p.dirty||
              (s.workers||[]).some(w=>Math.abs(Math.floor(w.x)-xx)<=1&&Math.abs(Math.floor(w.y)-yy)<=1)){
              valid=false;break;
            }
          }
        if(valid)candidates.push({x,y,dist:Math.abs(x-target.x)+Math.abs(y-target.y)});
      }
    candidates.sort((a,b)=>a.dist-b.dist||a.y-b.y||a.x-b.x);
    const found=candidates[0];
    if(!found)throw new Error("Nenhum local livre "+kind+" "+requiredWidth+"×"+height+" no mundo atual");
    return {x:found.x,y:found.y};
  },{width,height,kind,count});
}
async function freeRow(page,count=3){
  const site=await findFreeSite(page,{kind:"field",width:count});
  return Array.from({length:count},(_,i)=>({x:site.x+i,y:site.y}));
}
module.exports={findFreeSite,freeRow};
