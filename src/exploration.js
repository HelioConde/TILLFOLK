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
  // Somente animações verificáveis pelas nomenclaturas dos arquivos do projeto:
  // os animais deixam de usar o pacote de ícones estáticos 32x32.
  const SPECIES=Object.freeze({
    g:Object.freeze(["rabbit","chicken","cow","pig"]),
    f:Object.freeze(["fox","rabbit","bird"]),
    s:Object.freeze(["fox","bird"]),
    i:Object.freeze(["rabbit","bird"]),
    w:Object.freeze(["frog","bird"]),
    p:Object.freeze(["bat"])
  });
  const ROOT="./public/assets/";
  const preview=ROOT+"assets_premium_preview/animals/";
  const animated=(kind,folder,prefix,w,h,dirs=["down","left","right","up"])=>{
    const clips={};
    for(const direction of dirs){
      clips["idle_"+direction]={path:folder+"/idle/"+prefix+"_idle_"+direction+"_"+w+"x"+h+".png",frames:1,w,h};
      clips["move_"+direction]={path:folder+"/move/"+prefix+"_move_"+direction+"_"+w+"x"+h+"_4frames.png",frames:4,w,h};
    }
    return {kind,mode:"directional",clips,drawW:w===32?44:36,drawH:h===32?43:42};
  };
  const ANIMATIONS=Object.freeze({
    rabbit:animated("rabbit",preview+"bunnies/bunny_01","PREMIUM_bunny_01",16,20),
    fox:animated("fox",preview+"foxes/fox_01","PREMIUM_fox_01",16,20),
    cow:animated("cow",preview+"cows/cow_01/brown","PREMIUM_cow_01_brown",32,32),
    pig:animated("pig",preview+"pigs/pig_01/pink","PREMIUM_pig_01_pink",32,32),
    bird:(()=>{
      const folder=preview+"birds/bird_01/",prefix="PREMIUM_bird_01";
      const clips={};
      for(const dir of ["down","left","right","up"])
        clips["move_"+dir]={path:folder+"fly/"+prefix+"_fly_"+dir+"_16x20_4frames.png",frames:4,w:16,h:20};
      for(const dir of ["left","right"])
        clips["idle_"+dir]={path:folder+"idle/"+prefix+"_idle_"+dir+"_16x20.png",frames:1,w:16,h:20};
      return {mode:"directional",clips,drawW:35,drawH:39};
    })(),
    // Animação idle horizontal do pack Little Dreamyland: número de quadros
    // é deduzido da imagem carregada, sem esticar a spritesheet completa.
    chicken:{mode:"strip",clips:{idle:{
      path:ROOT+"Little Dreamyland - Free Pack/Sprites/Animals/CHICKEN/Chicken_Idle.png",
      frames:"auto-square",w:32,h:32}},drawW:39,drawH:39},
    frog:{mode:"strip",clips:{idle:{
      path:ROOT+"Sprout Sorry pack/Early Access/Plant update 2/frog/frog_spritesheet.png",
      frames:"auto-16",w:16,h:16}},drawW:34,drawH:34},
    bat:{mode:"six-directional",clips:Object.fromEntries(
      [["down","Bat_down_idle-and-run-Sheet6.png"],
       ["up","Bat_up_idle-and-run-Sheet6.png"],
       ["left","Bat_side-left_idle-and-run-Sheet6.png"],
       ["right","Bat_side_idle-and-run-Sheet6.png"]].map(([dir,file])=>
        ["move_"+dir,{path:ROOT+"Character/Bat/"+file,frames:6,w:"auto-six",h:"auto-height"}])
    ),drawW:43,drawH:40}
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
    return {key:spriteKey(kind,clip),frame,drawW:profile.drawW,drawH:profile.drawH,
      index:active?Math.floor(Math.max(0,clockMs)/155+
        (Math.abs(Number(animal?.homeX)||0)*13)%7)%(frame.frames==="auto-square"||
        frame.frames==="auto-16"?99:frame.frames):0,
      flip:false};
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
