"use strict";
/* Exploração de continentes TILLFOLK — sem servidor, persistente pelo save.
 * Equipamentos individuais são ferramentas normais da Work Station.
 * Fauna selvagem não equivale a rebanho: não produz esterco nem cria filhotes.
 */
((root,factory)=>{
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.TillfolkExploration=api;
})(typeof window!=="undefined"?window:null,()=>{
  const PROTECTION=Object.freeze({
    g:Object.freeze({name:"Ilha central",gear:null,icon:"🌿",hazard:"Seguro"}),
    f:Object.freeze({name:"Bosque selvagem",gear:"forestGloves",icon:"🧤",hazard:"Espinhos e vegetação agressiva"}),
    s:Object.freeze({name:"Deserto",gear:"desertCloak",icon:"☀️",hazard:"Calor e areia"}),
    i:Object.freeze({name:"Continente gelado",gear:"winterCoat",icon:"🧥",hazard:"Frio extremo"}),
    w:Object.freeze({name:"Pântano",gear:"swampBoots",icon:"🥾",hazard:"Lama e água contaminada"}),
    p:Object.freeze({name:"Bosque de cogumelos tóxicos",gear:"filterMask",icon:"😷",hazard:"Esporos venenosos"})
  });
  const GEAR=Object.freeze({
    forestGloves:Object.freeze({name:"Luvas resistentes",icon:"🧤",help:"Permite explorar o bosque sem se ferir nos espinhos.",cost:{twigs:8,grass:4}}),
    desertCloak:Object.freeze({name:"Manto do deserto",icon:"🧣",help:"Protege contra o sol e a areia do deserto.",cost:{grass:9,twigs:4}}),
    winterCoat:Object.freeze({name:"Roupa de frio",icon:"🧥",help:"Isolamento térmico para o continente gelado.",cost:{grass:12,wood:4}}),
    swampBoots:Object.freeze({name:"Botas impermeáveis",icon:"🥾",help:"Travessia segura das terras pantanosas.",cost:{wood:7,grass:6}}),
    filterMask:Object.freeze({name:"Máscara filtrante",icon:"😷",help:"Filtra os esporos do continente dos cogumelos.",cost:{grass:8,twigs:8,stone:3}})
  });
  // Preferir os PNGs transparentes licenciados já disponíveis no projeto.
  // Os arquivos 'assets_premium_preview' continham caixas cinzas/desfocadas.
  const SPECIES=Object.freeze({
    g:Object.freeze(["rabbit","chicken","cow","pig"]),
    f:Object.freeze(["fox","rabbit","bird"]),
    s:Object.freeze(["fox","bird"]),
    i:Object.freeze(["rabbit","bird"]),
    w:Object.freeze(["frog","bird"]),
    p:Object.freeze(["bat"])
  });
  const ROOT="./public/assets/";
  const tiny=ROOT+"FREE 64 Tiny Animals – 32x32 Pixel Art Pack/";
  const sprout=ROOT+"Sprout Lands - Sprites - premium pack/Sprout Lands - Sprites - premium pack/Animals/";
  // Não inventar quadros: espécies com sprite único ganham micro-salto.
  const single=(folder,filename,motion=2)=>({
    mode:"single",mirror:true,drawW:32,drawH:32,motion,
    clips:{idle:{path:tiny+folder+"/"+filename+".png",frames:1,w:32,h:32}}
  });
  const ANIMATIONS=Object.freeze({
    rabbit:single("Pets","rabbit",4),
    fox:single("Forest Animals","fox",2),
    cow:{mode:"strip",mirror:true,drawW:42,drawH:42,motion:1,clips:{
      idle:{path:sprout+"Cow/Light cow animations.png",frames:3,w:32,h:32}
    }},
    pig:single("Farm Animals","pig",1),
    bird:single("Birds","sparrow",3),
    // Animados: mesmos atlas Sprout Lands já utilizados no menu principal.
    chicken:{mode:"strip",mirror:true,drawW:30,drawH:30,motion:1,clips:{
      idle:{path:sprout+"Chicken/chicken default.png",frames:4,w:16,h:16}
    }},
    frog:{mode:"strip",mirror:true,drawW:30,drawH:30,motion:2,clips:{
      idle:{path:ROOT+"Sprout Sorry pack/Early Access/Plant update 2/frog/frog_spritesheet.png",
        frames:"auto-16",w:16,h:16}
    }},
    bat:{mode:"strip",mirror:true,drawW:32,drawH:32,motion:2,clips:{
      idle:{path:ROOT+"Little Dreamyland - Free Pack/Sprites/Enemies/BAT/Bat idle.png",
        frames:"auto-square",w:32,h:32}
    }}
  });
  const spriteKey=(kind,clip)=>"wild_"+kind+"_"+clip;
  const spriteSources=()=>Object.entries(ANIMATIONS).flatMap(([kind,profile])=>
    Object.entries(profile.clips).map(([clip,frame])=>({key:spriteKey(kind,clip),url:
      "./"+frame.path.replace(/^\.\//,"").split("/").map((segment,i)=>
        i<2?segment:encodeURIComponent(segment)).join("/")})));
  const speciesUrl=kind=>{
    const profile=ANIMATIONS[kind];
    if(!profile)return null;
    const frame=profile.clips.move_down||profile.clips.idle_down||profile.clips.idle||Object.values(profile.clips)[0];
    return frame?.path||null;
  };
  // Mantém a API FILES para saves/testes antigos que consultam o catálogo.
  const FILES=Object.freeze(Object.fromEntries(Object.keys(ANIMATIONS).map(kind=>[kind,speciesUrl(kind)])));
  function normalizedKind(animal){
    const biome=animal?.biome;
    const species=SPECIES[biome]||SPECIES.g;
    if(species.includes(animal?.kind)&&ANIMATIONS[animal.kind])return animal.kind;
    const x=Math.floor(Number(animal?.homeX??animal?.x)||0),
      y=Math.floor(Number(animal?.homeY??animal?.y)||0);
    return species[Math.floor(hash(719,x,y)*species.length)];
  }
  function spriteFrame(animal,clockMs=0,active=true){
    const kind=normalizedKind(animal),profile=ANIMATIONS[kind];
    const moving=Boolean(animal?.moving)&&active;
    const facing=["up","down","left","right"].includes(animal?.facing)?animal.facing:"down";
    let clip=moving?"move_"+facing:"idle_"+facing;
    if(!profile.clips[clip]){
      if(profile.mode==="six-directional")clip="move_"+facing;
      else if(profile.mode==="directional")clip=profile.clips["idle_"+facing]?"idle_"+facing:
        (facing==="left"?"idle_left":"idle_right");
      else clip="idle";
    }
    const frame=profile.clips[clip]||Object.values(profile.clips)[0];
    const phase=(Math.abs(Math.floor(Number(animal?.homeX)||0))*13)%7;
    const frames=Number.isInteger(frame.frames)?frame.frames:99;
    const time=Math.max(0,Number(clockMs)||0);
    return {key:spriteKey(kind,clip),frame,drawW:profile.drawW,drawH:profile.drawH,
      index:active?Math.floor(time/230+phase)%frames:0,
      flip:Boolean(profile.mirror&&facing==="left"),
      lift:active&&moving?Math.round(Math.max(0,Math.sin(time/150+phase))*(profile.motion||0)):0};
  }
  function frameRect(sprite,image){
    if(!image?.naturalWidth||!image.naturalHeight)return null;
    const {frame,index}=sprite;
    const fw=frame.w==="auto-six"?Math.floor(image.naturalWidth/6):
      frame.frames==="auto-square"?Math.min(image.naturalHeight,image.naturalWidth):
      Number(frame.w);
    const fh=frame.h==="auto-height"?image.naturalHeight:
      frame.frames==="auto-square"?image.naturalHeight:Number(frame.h);
    if(!(fw>0&&fh>0)||fw>image.naturalWidth||fh>image.naturalHeight)return null;
    const length=Number.isInteger(frame.frames)?frame.frames:
      Math.max(1,Math.floor(image.naturalWidth/fw));
    const count=Math.max(1,Math.min(length,Math.floor(image.naturalWidth/fw)));
    return {sx:(index%count)*fw,sy:0,sw:fw,sh:fh};
  }
  const requirement=(world,x,y)=>{
    if(!world||!Number.isFinite(x)||!Number.isFinite(y))return PROTECTION.g;
    const idx=Math.floor(y)*world.width+Math.floor(x);
    const id=world.biomeMap?.[idx]||"g";
    return PROTECTION[id]||PROTECTION.g;
  };
  const blocker=(worker,world,x,y)=>{
    const area=requirement(world,x,y);
    return area.gear&&!worker?.inventory?.tools?.[area.gear]?
      "Precisa de "+GEAR[area.gear].name+" para entrar em "+area.name:null;
  };
  const hash=(seed,x,y)=>{
    let a=Math.imul(x+1187,374761393)^Math.imul(y+3191,668265263)^(seed|0);
    a=Math.imul(a^(a>>>13),1274126177);
    return ((a^(a>>>16))>>>0)/4294967296;
  };
  const tileKey=(x,y)=>x+","+y;
  function spawn(world,objects=[],protectedOrigins=[]){
    if(!world?.biomeMap||!Number.isInteger(world.width))return [];
    const {width:w,height:h}=world;
    const occupied=new Set((objects||[]).map(o=>tileKey(Math.floor(o.x),Math.floor(o.y))));
    const water=new Set((world.water||[]).map(o=>tileKey(o.x,o.y)));
    const results=[];
    // População proporcional ao tamanho do continente, sem criar enxames.
    for(const [biome,species] of Object.entries(SPECIES)){
      const candidates=[];
      for(let y=2;y<h-2;y++)for(let x=2;x<w-2;x++){
        if(world.biomeMap[y*w+x]!==biome)continue;
        if(insideSanctuary(world,x,y)||
          protectedOrigins.some(origin=>Number.isFinite(origin?.x)&&Number.isFinite(origin?.y)&&
            Math.hypot((x-origin.x)/1.25,(y-origin.y)/1.1)<22))continue;
        const id=tileKey(x,y);
        if(occupied.has(id)||water.has(id))continue;
        // Ordenação pseudoaleatória determinística; fauna não cobre os recursos.
        const n=hash(world.seed,x,y);
        if(n>.13)candidates.push({x,y,weight:n});
      }
      candidates.sort((a,b)=>b.weight-a.weight);
      const amount=Math.min(candidates.length,Math.max(3,Math.min(12,Math.round(candidates.length/160))));
      const separation=4,selected=[];
      for(const candidate of candidates){
        if(selected.length>=amount)break;
        if(selected.some(p=>Math.abs(p.x-candidate.x)+Math.abs(p.y-candidate.y)<separation))continue;
        const kind=species[selected.length%species.length],x=candidate.x,y=candidate.y;
        selected.push({id:"wild-"+biome+"-"+selected.length,x:x+.5,y:y+.5,
          homeX:x,homeY:y,kind,biome,wild:true,manure:0,timer:0,age:1});
      }
      results.push(...selected);
    }
    return results;
  }
  function insideSanctuary(world,x,y){
    const w=world?.width||128,h=world?.height||80;
    // Nova ilha de início ~ 60x52 células, inteiramente livre de animais.
    const radius=w>=160&&h>=100?28:14;
    return Math.hypot((x-w/2)/1.25,(y-h/2)/1.1)<radius+2;
  }
  const waterCache=new WeakMap();
  function waterTiles(world){
    const cached=waterCache.get(world);
    if(cached&&cached.count===world.water?.length)return cached.tiles;
    const tiles=new Set((world.water||[]).map(o=>tileKey(o.x,o.y)));
    waterCache.set(world,{count:world.water?.length,tiles});
    return tiles;
  }
  // Caminhada interpolada: uma decisão periódica, vários quadros de animação.
  function step(animals,world,elapsed,blocked){
    if(!world||!Array.isArray(animals)||!(elapsed>0))return;
    const water=waterTiles(world),dt=Math.min(1,Math.max(0,elapsed));
    for(const animal of animals){
      if(!animal.wild)continue;
      animal.kind=normalizedKind(animal); // migra espécies antigas do save sem novos spawns
      if(Number.isFinite(animal.toX)&&Number.isFinite(animal.toY)){
        animal.moveTime=(Number(animal.moveTime)||0)+dt;
        const t=Math.min(1,animal.moveTime/1.25);
        animal.x=animal.fromX+(animal.toX-animal.fromX)*t;
        animal.y=animal.fromY+(animal.toY-animal.fromY)*t;
        animal.moving=t<1;
        if(t>=1){
          animal.x=animal.toX;animal.y=animal.toY;
          delete animal.fromX;delete animal.fromY;
          delete animal.toX;delete animal.toY;
          animal.moveTime=0;
        }
        continue;
      }
      animal.moving=false;
      animal.timer=(Number(animal.timer)||0)+dt;
      if(animal.timer<3+((Number(animal.homeX)||0)%3)*.7)continue;
      animal.timer=0;
      const x=Math.floor(animal.x),y=Math.floor(animal.y);
      animal.roamSteps=(Math.max(0,Number(animal.roamSteps)||0)+1)%100000;
      const n=hash(world.seed+animal.roamSteps*97,x,y+Math.floor(animal.homeX));
      const options=[[1,0],[-1,0],[0,1],[0,-1],[0,0]];
      const [dx,dy]=options[Math.floor(n*options.length)];
      const nx=x+dx,ny=y+dy,id=tileKey(nx,ny);
      if(dx===0&&dy===0)continue;
      if(nx<1||ny<1||nx>=world.width-1||ny>=world.height-1||
          world.biomeMap[ny*world.width+nx]!==animal.biome||
          insideSanctuary(world,nx,ny)||water.has(id)||
          Math.abs(nx-animal.homeX)>4||Math.abs(ny-animal.homeY)>4||
          blocked?.(nx,ny))continue;
      animal.facing=dx>0?"right":dx<0?"left":dy>0?"down":"up";
      animal.fromX=animal.x;animal.fromY=animal.y;
      animal.toX=nx+.5;animal.toY=ny+.5;
      animal.moveTime=0;animal.moving=true;
    }
  }
  return Object.freeze({PROTECTION,GEAR,SPECIES,FILES,ROOT,ANIMATIONS,spriteSources,spriteFrame,frameRect,
    speciesUrl,normalizedKind,requirement,blocker,insideSanctuary,spawn,step});
});
