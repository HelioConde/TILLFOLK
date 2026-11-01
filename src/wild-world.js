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
  // Atlas original: variações 2,3,4,5 exibem frutos na copa.
  // Nesta fase só usar árvores verdes para madeira (0,1 e 6).
  const nonFruitTreeVariants=Object.freeze([0,1,6]);
  const safeVariant=(kind,variant)=>kind==="tree"?
    nonFruitTreeVariants.includes(variant)?variant:
      nonFruitTreeVariants[Math.abs(Math.trunc(variant)||0)%nonFruitTreeVariants.length]:
    variant;
  const pickVariant=(kind,random)=>kind==="tree"?
    nonFruitTreeVariants[Math.floor(random()*nonFruitTreeVariants.length)]:
    Math.floor(random()*7);
  function stripFruitTrees(world){
    if(!world?.objects)return 0;
    let changed=0;
    for(const object of world.objects)if(object.kind==="tree"){
      const next=safeVariant(object.kind,object.variant);
      if(next!==object.variant){object.variant=next;changed++;}
    }
    return changed;
  }
  const randSeed=seed=>{let a=(seed>>>0)||139931;return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;}};
  const noise=(seed,x,y)=>{let v=Math.imul(x+721,374761393)^Math.imul(y+1013,668265263)^(seed|0);v=Math.imul(v^(v>>>13),1274126177);return ((v^(v>>>16))>>>0)/4294967296;};
  const nearStart=(x,y,w,h)=>Math.hypot((x-(w>=60?w/2:13.6))/1.15,
    (y-(h>=40?h/2:9.5))/1.05)<(w>=60&&h>=40?5.2:4.8);
  const inMap=(x,y,w,h)=>x>=1&&y>=1&&x<w-1&&y<h-1;
  // Limites preservados apenas para migrar saves do vale antigo.
  function valleyBounds(w,h){
    const cx=Math.floor(w/2),cy=Math.floor(h/2);
    return {left:cx-13,right:cx+13,top:cy-12,bottom:cy+12,
      gate:{x:cx+13,y:cy},open:false};
  }
  function ringTile(r,x,y){
    return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom&&
      (x===r.left||x===r.right||y===r.top||y===r.bottom);
  }
  function removeValleyEnclosure(world){
    if(!world||!Array.isArray(world.objects))return false;
    const region=world.boundary;
    if(region&&Number.isInteger(world.width)&&Number.isInteger(world.height)&&
      typeof world.biomeMap==="string"&&world.biomeMap.length===world.width*world.height){
      const natural=Biomes.generate(world.seed,world.width,world.height);
      const cells=world.biomeMap.split("");
      for(let y=region.top+1;y<region.bottom;y++)for(let x=region.left+1;x<region.right;x++)
        cells[y*world.width+x]=natural[y*world.width+x];
      world.biomeMap=cells.join("");
    }
    const previousLength=world.objects.length;
    world.objects=world.objects.filter(object=>object.kind!=="ridge"&&object.kind!=="gateLog");
    delete world.boundary;
    return previousLength!==world.objects.length||Boolean(region);
  }
  function connectWater(world,protectedTiles=[]){
    if(!world||!Array.isArray(world.water)||world.water.length<2)return 0;
    if(!Array.isArray(world.objects)||!Number.isInteger(world.width)||!Number.isInteger(world.height))
      throw new TypeError("O mundo precisa ter objetos e dimensões válidas para conectar a água.");
    const water=new Set(world.water.map(tile=>key(tile.x,tile.y)));
    const occupied=new Set(world.objects.map(object=>key(object.x,object.y)));
    const protectedSet=new Set(protectedTiles.filter(tile=>
      Number.isFinite(tile?.x)&&Number.isFinite(tile?.y))
      .map(tile=>key(Math.floor(tile.x),Math.floor(tile.y))));
    const narrowGaps=[];
    for(let y=1;y<world.height-1;y++)for(let x=1;x<world.width-1;x++){
      const id=key(x,y);
      if(water.has(id)||occupied.has(id)||protectedSet.has(id))continue;
      const horizontal=water.has(key(x-1,y))&&water.has(key(x+1,y));
      const vertical=water.has(key(x,y-1))&&water.has(key(x,y+1));
      if(horizontal||vertical)narrowGaps.push({x,y,id});
    }
    for(const tile of narrowGaps){
      world.water.push({x:tile.x,y:tile.y});
      water.add(tile.id);
    }
    let added=narrowGaps.length;
    const remaining=new Set(water),components=[];
    const directions=[[1,0],[-1,0],[0,1],[0,-1]];
    while(remaining.size){
      const first=remaining.values().next().value,component=[first];
      remaining.delete(first);
      for(let i=0;i<component.length;i++){
        const [x,y]=component[i].split(",").map(Number);
        for(const [dx,dy] of directions){
          const next=key(x+dx,y+dy);
          if(remaining.delete(next))component.push(next);
        }
      }
      components.push(component);
    }
    if(components.length<2)return added;
    components.sort((a,b)=>b.length-a.length);
    const connected=new Set(components[0]);
    for(const component of components.slice(1)){
      const queue=component.slice(),visited=new Set(component),previous=new Map();
      let head=0,joinFrom=null;
      while(head<queue.length&&!joinFrom){
        const current=queue[head++],[x,y]=current.split(",").map(Number);
        for(const [dx,dy] of directions){
          const nx=x+dx,ny=y+dy,next=key(nx,ny);
          if(!inMap(nx,ny,world.width,world.height))continue;
          if(connected.has(next)){previous.set(next,current);joinFrom=current;break;}
          if(visited.has(next)||occupied.has(next))continue;
          visited.add(next);previous.set(next,current);queue.push(next);
        }
      }
      for(let current=joinFrom;current&&!connected.has(current);current=previous.get(current)){
        const [x,y]=current.split(",").map(Number);
        if(!water.has(current)){
          world.water.push({x,y});water.add(current);added++;
        }
        connected.add(current);
      }
      for(const tile of component)connected.add(tile);
    }
    return added;
  }

  // Os seis biomas mantêm o autotile original. Água ocupa os dois lados das
  // transições, criando rios de pelo menos duas células entre ecossistemas.
  function separateBiomes(world,used,reserved){
    const {width:w,height:h,biomeMap:map}=world;
    const add=(x,y)=>{
      const id=key(x,y);
      if(!inMap(x,y,w,h)||reserved.has(id)||nearStart(x,y,w,h)||used.has(id))return;
      world.water.push({x,y});used.add(id);
    };
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
      const current=map[y*w+x];
      for(const [dx,dy] of [[1,0],[0,1]]){
        const nx=x+dx,ny=y+dy;
        if(nx>=w-1||ny>=h-1)continue;
        if(map[ny*w+nx]!==current){
          add(x,y);add(nx,ny);
        }
      }
    }
  }
  // Pontes são travessias transitáveis SOBRE a água, não buracos nos rios.
  // Rotas 4-conectadas partem da clareira rumo ao núcleo de cada bioma.
  function createCrossings(world,used){
    const {width:w,height:h}=world,water=new Set(world.water.map(p=>key(p.x,p.y)));
    const crossings=new Map(),cx=Math.floor(w/2),cy=Math.floor(h/2);
    const destinations=[[.18,.79],[.81,.18],[.79,.77],[.22,.17],[.54,.17]];
    for(const [tx,ty] of destinations){
      let x=cx,y=cy;
      const endX=Math.max(2,Math.min(w-3,Math.floor(tx*w)));
      const endY=Math.max(2,Math.min(h-3,Math.floor(ty*h)));
      // O corredor de navegação permanece livre de árvores que prendam o colono.
      used.add(key(x,y));
      while(x!==endX||y!==endY){
        const dx=endX-x,dy=endY-y;
        const horizontal=dx!==0&&(dy===0||Math.abs(dx/w)>=Math.abs(dy/h));
        if(horizontal)x+=Math.sign(dx);
        else y+=Math.sign(dy);
        const id=key(x,y);
        used.add(id);
        if(water.has(id))crossings.set(id,{x,y,axis:horizontal?"horizontal":"vertical"});
      }
    }
    world.crossings=Array.from(crossings.values());
  }
  function create(seed,w,h,exclude=[]){
    const random=randSeed(seed), reserved=new Set(exclude.map(p=>key(p.x,p.y)));
    const world={version:3,seed,width:w,height:h,objects:[],water:[],crossings:[],lastRegrownDay:1};
    world.biomeMap=Biomes.generate(seed,w,h);
    const used=new Set(reserved);
    // Lagoa natural orgânica com margens naturais, em um canto variável, sem cortar a clareira.
    const right=random()>.4;
    const px=w>=60?Math.round(w/2)+(right?10:-10):right?w-5:5;
    const py=h>=40?Math.round(h/2)+(random()>.5?7:-7):random()>.5?4:h-5;

    // Create organic pond with irregular shape using noise
    const pondRadius = 3 + random()*2; // 3-5 tiles radius
    for(let y=py-Math.ceil(pondRadius);y<=py+Math.ceil(pondRadius);y++){
      for(let x=px-Math.ceil(pondRadius);x<=px+Math.ceil(pondRadius);x++){
        if(!inMap(x,y,w,h)||nearStart(x,y,w,h)||reserved.has(key(x,y))) continue;

        const dx = x - px;
        const dy = y - py;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const angle = Math.atan2(dy, dx);

        // Create organic shape using multiple noise octaves
        const baseRadius = pondRadius;
        const noise1 = noise(seed*3, x*0.5, y*0.5) * 0.8;
        const noise2 = noise(seed*7, x*1.2, y*1.2) * 0.4;
        const noise3 = noise(seed*11, x*2.0, y*2.0) * 0.2;
        const organicRadius = baseRadius * (1 + noise1 + noise2 + noise3);

        if(dist < organicRadius && inMap(x,y,w,h) && !nearStart(x,y,w,h) && !reserved.has(key(x,y))){
          world.water.push({x,y});used.add(key(x,y));
        }
      }
    }

    // Keep every stream tile 4-connected to the pond and outside the start clearing.
    if(w>=60&&h>=40){
      const centerX=w/2,centerY=h/2;
      let x=px,y=py;
      const maxSteps=Math.abs(x-centerX)+Math.abs(y-centerY);
      for(let step=0;step<maxSteps;step++){
        const dx=centerX-x,dy=centerY-y;
        if(!dx&&!dy)break;
        const horizontal=dx&&(!dy||Math.abs(dx/1.15)>Math.abs(dy/1.05)||
          (Math.abs(dx/1.15)===Math.abs(dy/1.05)&&random()<.5));
        const moves=(horizontal?[[Math.sign(dx),0],[0,Math.sign(dy)]]:
          [[0,Math.sign(dy)],[Math.sign(dx),0]]).filter(([mx,my])=>mx||my);
        const next=moves.map(([mx,my])=>({x:x+mx,y:y+my})).find(tile=>
          inMap(tile.x,tile.y,w,h)&&!nearStart(tile.x,tile.y,w,h)&&
          !reserved.has(key(tile.x,tile.y)));
        if(!next)break;
        x=next.x;y=next.y;
        for(const [wx,wy] of [[x,y],[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){
          const id=key(wx,wy);
          if(!inMap(wx,wy,w,h)||nearStart(wx,wy,w,h)||reserved.has(id)||used.has(id))continue;
          world.water.push({x:wx,y:wy});used.add(id);
        }
      }
    }
    separateBiomes(world,used,reserved);
    connectWater(world);
    world.water.forEach(tile=>used.add(key(tile.x,tile.y)));
    createCrossings(world,used);
    // Distância à água calculada UMA vez (evita O(terreno × rios)).
    const wetDistance=new Uint8Array(w*h).fill(5);
    for(const tile of world.water){
      for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){
        const nx=tile.x+dx,ny=tile.y+dy,d=Math.abs(dx)+Math.abs(dy);
        if(nx<0||ny<0||nx>=w||ny>=h||d>4)continue;
        const index=ny*w+nx;
        if(d<wetDistance[index])wetDistance[index]=d;
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
      const moisture=wetDistance[y*w+x];
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
        world.objects.push({x,y,kind,variant:pickVariant(kind,random),age:0});
        used.add(key(x,y));
      }
    }
    // Bosque e depósito de pedras mantêm recursos suficientes, sem virar uma parede.
    const counts=world.objects.reduce((r,o)=>(r[o.kind]=(r[o.kind]||0)+1,r),{});
    for(const [kind,min] of [["tree",16],["boulder",11],["mushroom",12],["flowers",24],["grass",30],["twig",75]]){
      let needed=Math.max(0,min-(counts[kind]||0)),attempts=0;
      while(needed>0&&attempts++<600){
        const x=1+Math.floor(random()*(w-2)),y=1+Math.floor(random()*(h-2));
        if(nearStart(x,y,w,h)||used.has(key(x,y)))continue;
        world.objects.push({x,y,kind,variant:pickVariant(kind,random),age:0});
        used.add(key(x,y));needed--;
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
        bridges:new Set((world.crossings||[]).map(o=>key(o.x,o.y))),
        length:world.objects.length,waterLength:world.water.length};
      indices.set(world,current);
    }
    return current;
  }
  function at(world,x,y){return index(world)?.objects.get(key(x,y))||null;}
  function waterAt(world,x,y){return Boolean(index(world)?.waters.has(key(x,y)));}
  function bridgeAt(world,x,y){return Boolean(index(world)?.bridges.has(key(x,y)));}
  function blocked(world,x,y,w,h){
    return !inMap(x,y,w,h)||(waterAt(world,x,y)&&!bridgeAt(world,x,y))||solidKinds.has(at(world,x,y)?.kind);
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
    if(obj.kind==="pebble")resource="1 pedra";
    else if(obj.kind==="twig")resource="1 graveto";
    else if(obj.kind==="stump")resource="2 madeiras";
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
      if(occupied.has(id)||waters.has(id)||cultivated.has(id)||nearStart(x,y,w,h))continue;
      const biome=Biomes.kind(world,x,y);
      // Neve e areia não geram grama tropical espontaneamente.
      if(biome==="i"||biome==="s")continue;
      const kind=biome==="p"?"mushroom":
        biome==="w"?(rng()<.55?"mushroom":"herbs"):
        day%5===0&&rng()<.12?"tree":
        rng()<.30?"mushroom":rng()<.61?"flowers":"grass";
      world.objects.push({x,y,kind,variant:pickVariant(kind,rng),age:0});
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
    pebble:Object.freeze([[0,16,16,16],[16,16,16,16],[32,16,16,16],[48,16,16,16]]),
    herbs:Object.freeze([[16,32,16,16],[32,32,16,16],[48,32,16,16]]),
    log:Object.freeze([[0,80,32,16],[32,80,32,16]]),
    stump:Object.freeze([[0,96,16,16],[16,96,16,16],[32,96,32,16],
      [64,96,32,16],[96,96,16,16],[112,96,32,16],[144,96,32,16]])
  });
  function spriteFrame(kind,variant=0){
    variant=safeVariant(kind,variant);
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
    // Pontes Sprout Lands preservam o canal de água e fornecem acesso a biomas.
    const bridge=sprites.bridge;
    for(const crossing of world?.crossings||[]){
      if(bounds&&(crossing.x<bounds.x0||crossing.x>bounds.x1||
         crossing.y<bounds.y0||crossing.y>bounds.y1))continue;
      const x=crossing.x*size,y=crossing.y*size;
      if(bridge?.complete&&bridge.naturalWidth>=16&&bridge.naturalHeight>=16)
        part(bridge,0,0,16,16,x,y,size,size);
      else{
        ctx.fillStyle="#795738";ctx.fillRect(x+2,y+2,size-4,size-4);
        ctx.fillStyle="#c7a879";
        for(let n=5;n<size-3;n+=8)
          if(crossing.axis==="vertical")ctx.fillRect(x+3,y+n,size-6,3);
          else ctx.fillRect(x+n,y+3,3,size-6);
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
    if(legacy?.version>=2&&legacy.width===width&&legacy.height===height&&legacy.biomeMap?.length===width*height){
      removeValleyEnclosure(legacy);
      return legacy;
    }
    const seed=Number.isInteger(legacy?.seed)?legacy.seed:139931;
    // Migração não insere muralhas sobre construções de saves antigos.
    const enlarged=create(seed,width,height);
    const withinOld=(p)=>p.x<oldWidth&&p.y<oldHeight;
    // A colônia antiga permanece nas mesmas coordenadas: nenhuma árvore ou lago
    // preexistente desaparece. Apenas a região além das bordas é gerada novamente.
    enlarged.objects=enlarged.objects.filter(o=>!withinOld(o))
      .concat((legacy?.objects||[]).filter(o=>o&&Number.isFinite(o.x)&&Number.isFinite(o.y)));
    enlarged.water=enlarged.water.filter(o=>!withinOld(o))
      .concat((legacy?.water||[]).filter(o=>o&&Number.isFinite(o.x)&&Number.isFinite(o.y)));
    enlarged.crossings=enlarged.crossings.filter(o=>!withinOld(o))
      .concat((legacy?.crossings||[]).filter(o=>o&&Number.isFinite(o.x)&&Number.isFinite(o.y)));
    const cells=enlarged.biomeMap.split("");
    const previousMap=typeof legacy?.biomeMap==="string"&&
      legacy.biomeMap.length===oldWidth*oldHeight?legacy.biomeMap:null;
    for(let y=0;y<Math.min(oldHeight,height);y++)for(let x=0;x<Math.min(oldWidth,width);x++)
      cells[y*width+x]=previousMap?.[y*oldWidth+x]||"g";
    enlarged.biomeMap=cells.join("");
    enlarged.lastRegrownDay=legacy?.lastRegrownDay||1;
    stripFruitTrees(enlarged);
    removeValleyEnclosure(enlarged);
    return enlarged;
  }
  window.TillfolkWild=Object.freeze({create,expand,valleyBounds,ringTile,removeValleyEnclosure,connectWater,at,waterAt,bridgeAt,blocked,clear,regrow,
    drawGround,drawObject,drawAmbient,spriteFrame,atlasFrames,
    stripFruitTrees,nonFruitTreeVariants,
    terrainAt:Biomes.at,biomeAt:Biomes.kind});
})();
