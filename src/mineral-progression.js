"use strict";
/* TILLFOLK — geologia de seis regiões e ferramentas de mineração.
 * Bronze = sucata metálica antiga; alumínio = liga fabricada a partir de bauxita.
 * Os depósitos são colocados sem substituir árvores, terrenos ou fazendas.
 */
((root,factory)=>{
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.TillfolkMinerals=api;
})(typeof window!=="undefined"?window:null,()=>{
  const ZONES=Object.freeze({
    g:Object.freeze({index:1,name:"Ilha central",resource:"gravel",icon:"🪨",label:"Pedrinhas e cascalho",tier:0}),
    f:Object.freeze({index:2,name:"Bosque",resource:"bronze",icon:"🥉",label:"Sucata de bronze",tier:1}),
    s:Object.freeze({index:3,name:"Deserto",resource:"iron",icon:"⚙️",label:"Minério de ferro",tier:2}),
    i:Object.freeze({index:4,name:"Gelo",resource:"gold",icon:"🟨",label:"Veio de ouro",tier:3}),
    w:Object.freeze({index:5,name:"Pântano",resource:"diamond",icon:"💎",label:"Cristais de diamante",tier:3}),
    p:Object.freeze({index:6,name:"Cogumelos tóxicos",resource:"bauxite",icon:"🔶",label:"Bauxita para liga de alumínio",tier:4})
  });
  const RESOURCES=Object.freeze({
    gravel:Object.freeze({name:"Cascalho",icon:"🪨",color:"#b0b0a1"}),
    bronze:Object.freeze({name:"Bronze recuperado",icon:"🥉",color:"#bc8052"}),
    iron:Object.freeze({name:"Minério de ferro",icon:"⚙️",color:"#9da9b0"}),
    gold:Object.freeze({name:"Ouro",icon:"🟨",color:"#f4c764"}),
    diamond:Object.freeze({name:"Diamante",icon:"💎",color:"#92eff0"}),
    bauxite:Object.freeze({name:"Bauxita",icon:"🔶",color:"#d77355"}),
    aluminumAlloy:Object.freeze({name:"Liga de alumínio",icon:"🚀",color:"#c9e3ea"}),
    goldCircuit:Object.freeze({name:"Circuito condutor",icon:"🔌",color:"#ebd394"})
  });
  const PICKAXES=Object.freeze({
    pickaxe:Object.freeze({tier:1,name:"Picareta de pedra"}),
    bronzePickaxe:Object.freeze({tier:2,name:"Picareta de bronze"}),
    ironPickaxe:Object.freeze({tier:3,name:"Picareta de ferro"}),
    diamondPickaxe:Object.freeze({tier:4,name:"Picareta de diamante"})
  });
  const DEPOSITS=Object.freeze([
    {biome:"f",kind:"bronze",min:24,rate:.035,amount:4},
    {biome:"s",kind:"iron",min:30,rate:.037,amount:4},
    {biome:"i",kind:"gold",min:22,rate:.034,amount:3},
    {biome:"w",kind:"diamond",min:18,rate:.030,amount:3},
    {biome:"p",kind:"bauxite",min:40,rate:.050,amount:5}
  ]);
  function hash(seed,x,y){
    let h=Math.imul(x+251,374761393)^Math.imul(y+831,668265263)^seed;
    h=Math.imul(h^(h>>>13),1274126177);
    return ((h^(h>>>16))>>>0)/4294967296;
  }
  const key=(x,y)=>x+","+y;
  function biome(world,x,y){return world?.biomeMap?.[y*world.width+x]||"g";}
  function depositResource(obj){
    if(obj?.kind==="pebble")return "gravel";
    if(obj?.kind==="boulder"&&RESOURCES[obj.mineral])return obj.mineral;
    if(obj?.kind==="boulder")return "stone";
    return null;
  }
  function oreTier(obj){
    return obj?.kind==="boulder"?ZONES[Object.keys(ZONES).find(z=>ZONES[z].resource===obj.mineral)]?.tier||1:0;
  }
  function pickaxeTier(worker){
    return Math.max(0,...Object.entries(PICKAXES).filter(([id])=>
      worker?.inventory?.tools?.[id]===true).map(([,info])=>info.tier));
  }
  function maxTier(state,worker=null){
    if(worker)return pickaxeTier(worker);
    return Math.max(0,...(state?.workers||[]).map(pickaxeTier),
      ...Object.entries(PICKAXES).filter(([key])=>state?.crafting?.equipment?.[key]===true)
        .map(([,info])=>info.tier));
  }
  function missingTool(state,obj,worker=null){
    const required=oreTier(obj);
    if(!required||maxTier(state,worker)>=required)return null;
    const pick=Object.entries(PICKAXES).find(([,info])=>info.tier===required);
    return "Precisa de "+(pick?.[1].name||"picareta reforçada").toLowerCase()+
      " ou superior no inventário do colono";
  }
  function normalize(state){
    if(!state)return null;
    if(!state.minerals||typeof state.minerals!=="object")state.minerals={};
    state.minerals.discovered=state.minerals.discovered&&typeof state.minerals.discovered==="object"?
      state.minerals.discovered:{};
    state.minerals.version=1;
    return state.minerals;
  }
  function discover(state,resource){
    if(!RESOURCES[resource]||resource==="gravel")return false;
    const s=normalize(state);
    if(s.discovered[resource])return false;
    s.discovered[resource]={day:Math.max(1,state.day||1)};
    return true;
  }
  function populate(world,reservedTiles=[]){
    if(!world||world.mineralVersion>=1)return {added:0,counts:{}};
    const w=world.width,h=world.height,occupied=new Set([
      ...(world.objects||[]),...(world.water||[]),...(world.crossings||[]),...reservedTiles
    ].filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)).map(p=>key(p.x,p.y)));
    const counts={};let added=0;
    function place(x,y,resource,amount){
      const id=key(x,y);
      if(x<2||y<2||x>=w-2||y>=h-2||occupied.has(id))return false;
      if(resource==="gravel"){
        if(biome(world,x,y)!=="g")return false;
        world.objects.push({x,y,kind:"pebble",variant:0,age:0});
      }else{
        if(biome(world,x,y)!==DEPOSITS.find(d=>d.kind===resource)?.biome)return false;
        world.objects.push({x,y,kind:"boulder",mineral:resource,amount,variant:0,age:0});
      }
      occupied.add(id);counts[resource]=(counts[resource]||0)+1;added++;
      return true;
    }
    // Garantir material para as primeiras ferramentas mesmo com saves anteriores.
    const midX=Math.floor(w/2),midY=Math.floor(h/2);
    for(let dy=-9;dy<=9;dy++)for(let dx=-9;dx<=9;dx++){
      const x=midX+dx,y=midY+dy,dist=dx*dx+dy*dy;
      if(dist<9||dist>81)continue;
      if(hash(world.seed+409,x,y)<.105)place(x,y,"gravel",1);
    }
    // Todas as clareiras de grama contêm pequenas pedras; a ilha inicial é
    // garantida com um mínimo, independente do ruído da paisagem.
    let attempts=0;
    for(let radius=3;(counts.gravel||0)<18&&radius<=18;radius++){
      for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
        if(Math.abs(dx)!==radius&&Math.abs(dy)!==radius)continue;
        if((counts.gravel||0)>=18)break;
        if(hash(world.seed+17,midX+dx,midY+dy)>.65)place(midX+dx,midY+dy,"gravel",1);
      }
    }
    for(const d of DEPOSITS){
      const cells=[];
      for(let y=2;y<h-2;y++)for(let x=2;x<w-2;x++){
        if(biome(world,x,y)!==d.biome||occupied.has(key(x,y)))continue;
        const value=hash(world.seed+d.min*113,x,y);
        if(value<d.rate)place(x,y,d.kind,d.amount);
        else cells.push({x,y,value});
      }
      if((counts[d.kind]||0)<d.min){
        cells.sort((a,b)=>a.value-b.value);
        for(const tile of cells){
          if((counts[d.kind]||0)>=d.min)break;
          place(tile.x,tile.y,d.kind,d.amount);
        }
      }
    }
    world.mineralVersion=1;
    return {added,counts};
  }
  function draw(ctx,obj,size){
    if(obj?.kind!=="boulder"||!RESOURCES[obj.mineral])return;
    const x=obj.x*size,y=obj.y*size;
    const colors={bronze:["#9b5d3d","#db9868","#f1c08b"],
      iron:["#5f6c78","#aeb9c5","#e2e6e8"],
      gold:["#ab762e","#efc14f","#fff0ac"],
      diamond:["#429ba7","#84dce9","#e6ffff"],
      bauxite:["#a24e42","#d56f56","#efae84"]}[obj.mineral];
    if(!colors)return;
    ctx.save();ctx.imageSmoothingEnabled=false;
    ctx.fillStyle=colors[0];ctx.fillRect(x+7,y+16,19,13);ctx.fillRect(x+11,y+11,12,6);
    ctx.fillStyle=colors[1];ctx.fillRect(x+10,y+14,12,9);ctx.fillRect(x+8,y+23,16,4);
    ctx.fillStyle=colors[2];ctx.fillRect(x+12,y+14,4,4);ctx.fillRect(x+17,y+18,5,3);
    if(obj.mineral==="diamond"){
      ctx.fillStyle=colors[2];ctx.fillRect(x+15,y+9,3,6);ctx.fillRect(x+22,y+13,2,4);
    }
    ctx.restore();
  }
  const progress=state=>Object.values(ZONES).map(zone=>({
    ...zone,found:zone.resource==="gravel"?true:Boolean(state?.minerals?.discovered?.[zone.resource]),
    oreAvailable:zone.resource==="gravel"?0:(state?.world?.objects||[])
      .filter(o=>o.kind==="boulder"&&o.mineral===zone.resource).length
  }));
  return Object.freeze({ZONES,RESOURCES,PICKAXES,DEPOSITS,normalize,discover,populate,
    depositResource,oreTier,pickaxeTier,maxTier,missingTool,progress,draw});
});
