"use strict";
/* Terreno selvagem do TILLFOLK — procedural, reproduzível e 100% estático.
   Usa exclusivamente os atlas Sprout Lands já incluídos no repositório.
   O mapa não contém fazenda pré-construída: a colônia abre uma clareira. */
(() => {
  const solidKinds=new Set(["tree","boulder","log","thicket","stump"]);
  const gatherKinds=new Set(["tree","boulder","log","thicket","stump","mushroom","flowers","herbs","grass","twig"]);
  const key=(x,y)=>x+","+y;
  const randSeed=seed=>{let a=(seed>>>0)||139931;return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;}};
  const noise=(seed,x,y)=>{let v=Math.imul(x+721,374761393)^Math.imul(y+1013,668265263)^(seed|0);v=Math.imul(v^(v>>>13),1274126177);return ((v^(v>>>16))>>>0)/4294967296;};
  const nearStart=(x,y)=>Math.hypot((x-13.6)/1.15,(y-9.5)/1.05)<3.75;
  const inMap=(x,y,w,h)=>x>=1&&y>=1&&x<w-1&&y<h-1;
  function create(seed,w,h,exclude=[]){
    const random=randSeed(seed), reserved=new Set(exclude.map(p=>key(p.x,p.y)));
    const world={version:1,seed,objects:[],water:[],lastRegrownDay:1};
    const used=new Set(reserved),waters=new Set();
    // Lagoa natural pequena, em um canto variável, sem cortar a clareira.
    const right= random()>.4, px=right?w-5:5, py=random()>.5?4:h-5;
    for(let y=py-2;y<=py+2;y++)for(let x=px-2;x<=px+2;x++){
      const d=((x-px)/2.2)**2+((y-py)/1.7)**2;
      if(d < .85+noise(seed,x,y)*.24&&inMap(x,y,w,h)&&!nearStart(x,y)&&!reserved.has(key(x,y))){
        world.water.push({x,y});waters.add(key(x,y));used.add(key(x,y));
      }
    }
    const clusters=Array.from({length:6},()=>({x:2+random()*(w-4),y:2+random()*(h-4),r:2+random()*2.3}));
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
      if(used.has(key(x,y))||nearStart(x,y))continue;
      // O ruído e os bosques criam manchas de vegetação, evitando linhas regulares.
      const woody=clusters.reduce((value,c)=>Math.max(value,Math.exp(-(((x-c.x)**2+(y-c.y)**2)/(2*c.r*c.r)))),0);
      const moisture=world.water.reduce((d,p)=>Math.min(d,Math.abs(x-p.x)+Math.abs(y-p.y)),99);
      const roll=random();
      let kind=null;
      if(roll < .055+woody*.16)kind="tree";
      else if(roll < .085+woody*.19)kind="thicket";
      else if(roll < .135+woody*.13)kind="boulder";
      else if(roll < .155+woody*.06)kind="log";
      else if(roll < .23+woody*.17)kind=moisture<4?"mushroom":"mushroom";
      else if(roll < .38+woody*.10)kind="flowers";
      else if(roll < .48+woody*.13)kind="grass";
      else if(roll < .53)kind="herbs";
      else if(roll < .56)kind="twig";
      if(kind){
        world.objects.push({x,y,kind,variant:Math.floor(random()*7),age:0});
        used.add(key(x,y));
      }
    }
    // Bosque e depósito de pedras mantêm recursos suficientes, sem virar uma parede.
    const counts=world.objects.reduce((r,o)=>(r[o.kind]=(r[o.kind]||0)+1,r),{});
    for(const [kind,min] of [["tree",16],["boulder",11],["mushroom",12],["flowers",24],["grass",24]]){
      let needed=Math.max(0,min-(counts[kind]||0)),attempts=0;
      while(needed>0&&attempts++<600){
        const x=1+Math.floor(random()*(w-2)),y=1+Math.floor(random()*(h-2));
        if(nearStart(x,y)||used.has(key(x,y)))continue;
        world.objects.push({x,y,kind,variant:Math.floor(random()*7),age:0});
        used.add(key(x,y));needed--;
      }
    }
    return world;
  }
  function at(world,x,y){return world?.objects?.find(o=>o.x===x&&o.y===y)||null;}
  function waterAt(world,x,y){return Boolean(world?.water?.some(p=>p.x===x&&p.y===y));}
  function blocked(world,x,y,w,h){
    return !inMap(x,y,w,h)||waterAt(world,x,y)||solidKinds.has(at(world,x,y)?.kind);
  }
  function clear(world,x,y){
    const obj=at(world,x,y);
    if(!obj)return {resource:null,remaining:false};
    if(!gatherKinds.has(obj.kind))return {resource:null,remaining:false};
    let resource="fibras";
    if(obj.kind==="tree"){
      obj.kind="stump";obj.variant=0;resource="3 madeiras";
      return {resource,remaining:true};
    }
    if(obj.kind==="stump")resource="2 madeiras";
    else if(obj.kind==="boulder")resource="3 pedras";
    else if(obj.kind==="log")resource="2 madeiras";
    else if(obj.kind==="mushroom")resource="cogumelos";
    else if(obj.kind==="flowers")resource="flores";
    else if(obj.kind==="herbs")resource="ervas";
    world.objects.splice(world.objects.indexOf(obj),1);
    return {resource,remaining:false};
  }
  function regrow(world,day,w,h,plots=[]){
    if(!world||world.lastRegrownDay>=day)return 0;
    const rng=randSeed((world.seed^Math.imul(day,811))>>>0);
    const occupied=new Set(world.objects.map(o=>key(o.x,o.y)));
    const waters=new Set(world.water.map(p=>key(p.x,p.y)));
    const cultivated=new Set(plots.filter(p=>p.selected||p.tilled||p.seeded).map(p=>key(p.x,p.y)));
    let newCount=0;
    for(let i=0;i<Math.min(7,day-world.lastRegrownDay)*2;i++){
      const x=1+Math.floor(rng()*(w-2)),y=1+Math.floor(rng()*(h-2));
      const id=key(x,y);
      if(occupied.has(id)||waters.has(id)||cultivated.has(id)||nearStart(x,y))continue;
      const kind=day%5===0&&rng()<.12?"tree":rng()<.30?"mushroom":rng()<.61?"flowers":"grass";
      world.objects.push({x,y,kind,variant:Math.floor(rng()*7),age:0});
      occupied.add(id);newCount++;
    }
    world.lastRegrownDay=day;
    return newCount;
  }
  const grassSlots=[[0,32],[16,32],[32,32],[48,32],[64,32],[80,32]];
  const flowerSlots=[[0,48],[16,48],[32,48],[64,48],[80,48],[0,64],[16,64],[32,64],[48,64],[80,64]];
  const mushroomSlots=[[0,0],[16,0],[32,0],[48,0],[64,0],[80,0]];
  function drawGround(ctx,sprites,world,w,h,size,part){
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const tileX=x*size,tileY=y*size;
      const variation=Math.floor(noise(world?.seed||1,x,y)*6);
      ctx.fillStyle=["#a4d477","#a9d681","#a4d17d","#acd787","#a7d37b","#b0d98b"][variation];
      ctx.fillRect(tileX,tileY,size,size);
      part(sprites.grass,variation*16,80,16,16,tileX,tileY,size,size);
      if(noise(world?.seed||1,x+82,y+13)>.93){
        ctx.fillStyle="#d3e89a";ctx.fillRect(tileX+7,tileY+9,2,2);
      }
    }
    for(const tile of world?.water||[]){
      const x=tile.x*size,y=tile.y*size;
      ctx.fillStyle="#517f87";ctx.fillRect(x,y,size,size);
      part(sprites.water,0,0,16,16,x,y,size,size);
      ctx.fillStyle="#81c5c3";
      if(noise(world.seed,tile.x,tile.y)>.5)ctx.fillRect(x+12,y+8,9,2);
    }
  }
  function drawObject(ctx,obj,sprites,size,part){
    const x=obj.x*size,y=obj.y*size,v=obj.variant||0;
    switch(obj.kind){
      case "tree":{
        const source=v%4===0?[144,48,48,48]:v%3===0?[80,0,32,32]:[144,0,32,32];
        const big=source[2]===48;
        part(sprites.trees,...source,x-(big?24:8),y-(big?53:42),big?83:52,big?84:69);break;
      }
      case "boulder":{
        const big=v%4===0;
        const sx=big?128:(v%3)*16,sy=16;
        part(sprites.rocks,sx,sy,big?32:16,16,x-(big?9:0),y-(big?10:0),big?48:32,big?40:32);break;
      }
      case "mushroom":{
        const [sx,sy]=mushroomSlots[v%mushroomSlots.length];
        part(sprites.rocks,sx,sy,16,16,x+5,y+6,23,23);break;
      }
      case "flowers":{
        const [sx,sy]=flowerSlots[v%flowerSlots.length];
        part(sprites.rocks,sx,sy,16,16,x+4,y+6,24,24);break;
      }
      case "grass":{
        const [sx,sy]=grassSlots[v%grassSlots.length];
        part(sprites.rocks,sx,sy,16,16,x+4,y+9,24,22);break;
      }
      case "herbs":{
        part(sprites.rocks,64,32,16,16,x+6,y+5,22,24);break;
      }
      case "thicket":{
        part(sprites.trees,(v%3)*16,0,16,32,x-7,y-24,45,57);break;
      }
      case "log":{
        ctx.fillStyle="#694b31";ctx.fillRect(x+1,y+17,30,11);
        ctx.fillStyle="#ad8654";ctx.fillRect(x+2,y+14,27,8);
        ctx.fillStyle="#e7b977";ctx.fillRect(x+1,y+15,6,11);break;
      }
      case "stump":{
        ctx.fillStyle="#64472e";ctx.fillRect(x+6,y+13,22,15);
        ctx.fillStyle="#b08b59";ctx.fillRect(x+5,y+11,24,9);
        ctx.fillStyle="#d6b278";ctx.fillRect(x+11,y+13,12,4);break;
      }
      case "twig":{
        ctx.fillStyle="#6d5c36";ctx.fillRect(x+8,y+20,16,3);
        ctx.fillRect(x+17,y+16,3,8);break;
      }
    }
  }
  function drawAmbient(ctx,world,t,size){
    if(!world?.objects)return;
    const frame=t/900;
    const flowers=world.objects.filter(o=>o.kind==="flowers").slice(0,18);
    for(let i=0;i<flowers.length;i+=3){
      const o=flowers[i],x=Math.round(o.x*size+17+Math.sin(frame+i)*7),
        y=Math.round(o.y*size+5+Math.cos(frame*.8+i)*5);
      ctx.fillStyle=i%2?"#f3e39d":"#e5a7da";
      ctx.fillRect(x,y,3,3);ctx.fillRect(x+5,y,3,3);
      ctx.fillStyle="#463b4b";ctx.fillRect(x+4,y+1,1,4);
    }
  }
  window.TillfolkWild=Object.freeze({create,at,waterAt,blocked,clear,regrow,drawGround,drawObject,drawAmbient});
})();
