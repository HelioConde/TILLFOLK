"use strict";
/* Terreno selvagem do TILLFOLK — procedural, reproduzível e 100% estático.
   Usa exclusivamente os atlas Sprout Lands já incluídos no repositório.
   O mapa não contém fazenda pré-construída: a colônia abre uma clareira. */
(() => {
  const Biomes=window.TillfolkBiomes;
  if(!Biomes)throw new Error("Carregue src/biomes.js antes do terreno selvagem.");
  const solidKinds=new Set(["tree","boulder","log","thicket","stump"]);
  const gatherKinds=new Set(["tree","boulder","log","thicket","stump","mushroom","flowers","herbs","grass","twig","pebble"]);
  const key=(x,y)=>x+","+y;
  const randSeed=seed=>{let a=(seed>>>0)||139931;return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;}};
  const noise=(seed,x,y)=>{let v=Math.imul(x+721,374761393)^Math.imul(y+1013,668265263)^(seed|0);v=Math.imul(v^(v>>>13),1274126177);return ((v^(v>>>16))>>>0)/4294967296;};
  const nearStart=(x,y,w,h)=>Math.hypot((x-(w>=60?w/2:13.6))/1.15,
    (y-(h>=40?h/2:9.5))/1.05)<4.8;
  const inMap=(x,y,w,h)=>x>=1&&y>=1&&x<w-1&&y<h-1;
  function create(seed,w,h,exclude=[]){
    const random=randSeed(seed), reserved=new Set(exclude.map(p=>key(p.x,p.y)));
    const world={version:2,seed,width:w,height:h,objects:[],water:[],lastRegrownDay:1};
    world.biomeMap=Biomes.generate(seed,w,h);
    const used=new Set(reserved),waters=new Set();
    // Lagoa natural pequena, em um canto variável, sem cortar a clareira.
    const right=random()>.4;
    const px=w>=60?Math.round(w/2)+(right?7:-7):right?w-5:5;
    const py=h>=40?Math.round(h/2)+(random()>.5?5:-5):random()>.5?4:h-5;
    for(let y=py-2;y<=py+2;y++)for(let x=px-2;x<=px+2;x++){
      const d=((x-px)/2.2)**2+((y-py)/1.7)**2;
      if(d < .85+noise(seed,x,y)*.24&&inMap(x,y,w,h)&&!nearStart(x,y,w,h)&&!reserved.has(key(x,y))){
        world.water.push({x,y});waters.add(key(x,y));used.add(key(x,y));
      }
    }
    const clusters=Array.from({length:6},()=>({x:2+random()*(w-4),y:2+random()*(h-4),r:2+random()*2.3}));
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
      if(used.has(key(x,y))||nearStart(x,y,w,h))continue;
      const biome=Biomes.kind(world,x,y);
      const modifier=biome==="f"?.12:biome==="s"?-.07:biome==="i"?-.14:
        biome==="w"?.045:biome==="p"?-.11:0;
      // O ruído e os bosques criam manchas de vegetação, evitando linhas regulares.
      const woody=clusters.reduce((value,c)=>Math.max(value,Math.exp(-(((x-c.x)**2+(y-c.y)**2)/(2*c.r*c.r)))),0);
      const moisture=world.water.reduce((d,p)=>Math.min(d,Math.abs(x-p.x)+Math.abs(y-p.y)),99);
      const roll=random();
      let kind=null;
      if(roll < Math.max(.006,.055+woody*.16+modifier))kind="tree";
      else if(roll < .085+woody*.19)kind="thicket";
      else if(roll < .135+woody*.13)kind="boulder";
      else if(roll < .155+woody*.06)kind="log";
      else if(roll < .23+woody*.17)kind=moisture<5?"mushroom":random()>.38?"mushroom":"herbs";
      else if(roll < .38+woody*.10)kind="flowers";
      else if(roll < .48+woody*.13)kind="grass";
      else if(roll < .53)kind="herbs";
      else if(roll < .56)kind="twig";
      if(moisture<=1&&solidKinds.has(kind))kind=random()<.45?"mushroom":"grass";
      // Cada ecossistema só recebe os objetos cuja silhueta combina com a
      // paisagem. Evita árvores frutíferas e ervas verde-vivas sobre a neve.
      if(biome==="i"&&kind!=="boulder"){
        kind=random()<.24?"boulder":null;
      }else if(biome==="s"&&kind!=="boulder"&&kind!=="twig"){
        kind=random()<.30?"boulder":random()<.42?"twig":null;
      }else if(biome==="p"&&["tree","thicket","flowers","grass","herbs"].includes(kind)){
        kind=random()<.56?"mushroom":null;
      }

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
        if(nearStart(x,y,w,h)||used.has(key(x,y)))continue;
        world.objects.push({x,y,kind,variant:Math.floor(random()*7),age:0});
        used.add(key(x,y));needed--;
      }
    }
    // Recursos da primeira oficina. Colocados em terreno livre perto da
    // clareira, sem animais, sem objetos novos e sem imagens externas.
    // Cada partida nova deve ter caminho até gravetos, pedrinhas e grama.
    if(w>=60&&h>=40){
      const cx=Math.floor(w/2),cy=Math.floor(h/2);
      const resourceSites=[];
      for(let y=cy-9;y<=cy+9;y++)for(let x=cx-9;x<=cx+9;x++){
        if(!inMap(x,y,w,h)||used.has(key(x,y))||waters.has(key(x,y))||
           !Biomes.at(world,x,y).farmable)continue;
        const distance=Math.abs(x-cx)+Math.abs(y-cy);
        if(distance<3||distance>13)continue;
        resourceSites.push({x,y,distance,random:noise(seed,x,y)});
      }
      resourceSites.sort((a,b)=>a.distance-b.distance||a.random-b.random);
      const starters=[...Array(12).fill("twig"),...Array(9).fill("pebble"),...Array(12).fill("grass")];
      // Misturar os tipos para os primeiros recursos aparecerem juntos.
      for(let i=0;i<Math.min(starters.length,resourceSites.length);i++){
        const p=resourceSites[i],kind=starters[(i*13)%starters.length];
        world.objects.push({x:p.x,y:p.y,kind,variant:i%4,age:0,starterResource:true});
        used.add(key(p.x,p.y));
      }
    }
    return world;
  }
  const indices=new WeakMap();
  function index(world){
    if(!world)return null;
    let current=indices.get(world);
    if(!current||current.length!==world.objects.length||current.waterLength!==world.water.length){
      current={objects:new Map(world.objects.map(o=>[key(o.x,o.y),o])),
        waters:new Set(world.water.map(o=>key(o.x,o.y))),
        length:world.objects.length,waterLength:world.water.length};
      indices.set(world,current);
    }
    return current;
  }
  function at(world,x,y){return index(world)?.objects.get(key(x,y))||null;}
  function waterAt(world,x,y){return Boolean(index(world)?.waters.has(key(x,y)));}
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
    else if(obj.kind==="pebble")resource="1 pedra solta";
    else if(obj.kind==="twig")resource="1 graveto";
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
      if(occupied.has(id)||waters.has(id)||cultivated.has(id)||nearStart(x,y,w,h))continue;
      const biome=Biomes.kind(world,x,y);
      // Neve e areia não geram grama tropical espontaneamente.
      if(biome==="i"||biome==="s")continue;
      const kind=biome==="p"?"mushroom":
        biome==="w"?(rng()<.55?"mushroom":"herbs"):
        day%5===0&&rng()<.12?"tree":
        rng()<.30?"mushroom":rng()<.61?"flowers":"grass";
      world.objects.push({x,y,kind,variant:Math.floor(rng()*7),age:0});
      occupied.add(id);newCount++;
    }
    world.lastRegrownDay=day;
    return newCount;
  }
  // Auditoria visual Sprout Lands (atlas de árvores 192×112, coleta 192×80).
  // NÃO assumir que cada árvore começa em múltiplos de 32:
  // a primeira ocupa 16px; as seguintes começam em 16, 48, 80, 112 e 144.
  // Os arbustos estão em y=48, não no topo entre árvores.
  const atlasFrames=Object.freeze({
    tree:Object.freeze([[0,0,16,32],[16,0,32,32],[48,0,32,32],
      [80,0,32,32],[112,0,32,32],[144,0,32,32],[144,48,48,48]]),
    thicket:Object.freeze([[0,48,16,16],[16,48,16,16],[32,48,16,16],
      [48,48,16,16],[64,48,16,16]]),
    boulder:Object.freeze([[0,16,16,16],[16,16,16,16],[32,16,16,16],
      [48,16,16,16],[64,16,16,16],[80,16,16,16],
      [96,16,32,32],[128,16,32,32],[160,16,32,32]]),
    mushroom:Object.freeze([[0,0,16,16],[16,0,16,16],[32,0,16,16],
      [48,0,16,16],[64,0,16,16],[80,0,16,16],[96,0,16,16]]),
    flowers:Object.freeze([[0,48,16,16],[16,48,16,16],[32,48,16,16],
      [64,48,16,16],[80,48,16,16],[0,64,16,16],
      [16,64,16,16],[32,64,16,16],[48,64,16,16],[80,64,16,16]]),
    grass:Object.freeze([[0,32,16,16],[16,32,16,16],[32,32,16,16],[48,32,16,16]]),
    herbs:Object.freeze([[16,32,16,16],[32,32,16,16],[48,32,16,16]]),
    log:Object.freeze([[0,80,32,16],[32,80,32,16]]),
    stump:Object.freeze([[0,96,16,16],[16,96,16,16],[32,96,32,16],
      [64,96,32,16],[96,96,16,16],[112,96,32,16],[144,96,32,16]])
  });
  function spriteFrame(kind,variant=0){
    const options=atlasFrames[kind];
    if(!options)return null;
    const index=((Math.trunc(variant)||0)%options.length+options.length)%options.length;
    return options[index];
  }
  function drawGround(ctx,sprites,world,w,h,size,part,bounds){
    Biomes.draw(ctx,sprites,world,w,h,size,part,bounds);
    const waters=new Set((world?.water||[]).map(t=>key(t.x,t.y)));
    for(const tile of world?.water||[]){
      if(bounds&&(tile.x<bounds.x0||tile.x>bounds.x1||tile.y<bounds.y0||tile.y>bounds.y1))continue;
      const x=tile.x*size,y=tile.y*size,v=noise(world.seed,tile.x,tile.y);
      ctx.fillStyle="#588b8b";ctx.fillRect(x,y,size,size);
      // Não usar o tile como um bloco retangular de cor chapada: margens naturais.
      ctx.fillStyle="#6fa8a0";
      if(!waters.has(key(tile.x,tile.y-1)))ctx.fillRect(x,y,size,5);
      if(!waters.has(key(tile.x,tile.y+1)))ctx.fillRect(x,y+size-5,size,5);
      if(!waters.has(key(tile.x-1,tile.y)))ctx.fillRect(x,y,5,size);
      if(!waters.has(key(tile.x+1,tile.y)))ctx.fillRect(x+size-5,y,5,size);
      ctx.fillStyle="#98cfc4";
      if(v>.34)ctx.fillRect(x+8,y+9,9,2);
      if(v>.66)ctx.fillRect(x+19,y+21,7,2);
      if(v>.72){
        // Vitória-régia e junco em tons do próprio cenário.
        ctx.fillStyle="#527d48";ctx.fillRect(x+6,y+17,13,5);
        ctx.fillStyle="#84b963";ctx.fillRect(x+8,y+16,10,3);
      }
    }
  }
  function drawObject(ctx,obj,sprites,size,part){
    const x=obj.x*size,y=obj.y*size,v=obj.variant||0,kind=obj.kind;
    const frame=spriteFrame(kind,v);
    if(kind==="tree"&&frame){
      const [sx,sy,sw,sh]=frame;
      const large=sw===48,slim=sw===16;
      const naturalW=large?82:slim?35:53,naturalH=large?82:slim?67:66;
      // Manter a base da árvore no solo, sem cortar a copa junto à borda superior.
      const height=Math.min(naturalH,y+size-2);
      const width=Math.round(naturalW*height/naturalH);
      const left=Math.round(x+size/2-width/2),top=Math.round(y+size-height);
      part(sprites.trees,sx,sy,sw,sh,left,top,width,height);
      return;
    }
    if(kind==="thicket"&&frame){
      const [sx,sy,sw,sh]=frame;
      part(sprites.trees,sx,sy,sw,sh,x,y+size-29,size,29);
      return;
    }
    if(kind==="boulder"&&frame){
      const [sx,sy,sw,sh]=frame,large=sw===32;
      const width=large?46:27,height=large?43:27;
      part(sprites.rocks,sx,sy,sw,sh,x+Math.round((size-width)/2),
        y+size-height,width,height);
      return;
    }
    if((kind==="log"||kind==="stump")&&frame){
      const [sx,sy,sw,sh]=frame,wide=sw===32;
      const width=kind==="log"?47:wide?37:25,height=kind==="log"?24:wide?23:22;
      part(sprites.trees,sx,sy,sw,sh,x+Math.round((size-width)/2),
        y+size-height,width,height);
      return;
    }
    if(frame){
      const [sx,sy,sw,sh]=frame;
      const width=kind==="mushroom"?24:kind==="flowers"?24:25;
      const height=kind==="grass"?22:24;
      part(sprites.rocks,sx,sy,sw,sh,x+Math.round((size-width)/2),
        y+size-height,width,height);
      return;
    }
    if(kind==="pebble"){
      // Pedrinha pequena recolhida com as mãos; usa o atlas de rochas existente.
      part(sprites.rocks,0,16,16,16,x+9,y+19,14,13);
      return;
    }
    if(kind==="twig"){
      // Um galho simples não depende de regiões vazias do atlas.
      ctx.fillStyle="#745234";ctx.fillRect(x+7,y+23,17,3);
      ctx.fillStyle="#a27b51";ctx.fillRect(x+16,y+19,3,7);
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
    // Pequenos sapos nas bordas da lagoa; efeito visual, não obstáculo.
    const border=world.water.filter(p=>!waterAt(world,p.x-1,p.y)||!waterAt(world,p.x+1,p.y));
    for(let i=0;i<Math.min(2,border.length);i++){
      const tile=border[Math.floor(i*(border.length/2))];
      const x=tile.x*size+7,y=tile.y*size+18;
      ctx.fillStyle="#416d48";ctx.fillRect(x,y,8,7);
      ctx.fillStyle="#97c67d";ctx.fillRect(x+1,y,6,5);
      ctx.fillStyle="#244934";ctx.fillRect(x+2,y+1,1,1);ctx.fillRect(x+5,y+1,1,1);
    }
  }
  function expand(legacy,width,height,oldWidth=28,oldHeight=18){
    if(legacy?.version>=2&&legacy.width===width&&legacy.height===height&&legacy.biomeMap?.length===width*height)
      return legacy;
    const seed=Number.isInteger(legacy?.seed)?legacy.seed:139931;
    const enlarged=create(seed,width,height);
    const withinOld=(p)=>p.x<oldWidth&&p.y<oldHeight;
    // A colônia antiga permanece nas mesmas coordenadas: nenhuma árvore ou lago
    // preexistente desaparece. Apenas a região além das bordas é gerada novamente.
    enlarged.objects=enlarged.objects.filter(o=>!withinOld(o))
      .concat((legacy?.objects||[]).filter(o=>o&&Number.isFinite(o.x)&&Number.isFinite(o.y)));
    enlarged.water=enlarged.water.filter(o=>!withinOld(o))
      .concat((legacy?.water||[]).filter(o=>o&&Number.isFinite(o.x)&&Number.isFinite(o.y)));
    const cells=enlarged.biomeMap.split("");
    for(let y=0;y<oldHeight;y++)for(let x=0;x<oldWidth;x++)
      cells[y*width+x]="g";
    enlarged.biomeMap=cells.join("");
    enlarged.lastRegrownDay=legacy?.lastRegrownDay||1;
    return enlarged;
  }
  window.TillfolkWild=Object.freeze({create,expand,at,waterAt,blocked,clear,regrow,
    drawGround,drawObject,drawAmbient,spriteFrame,atlasFrames,
    terrainAt:Biomes.at,biomeAt:Biomes.kind});
})();
