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
  const SPECIES=Object.freeze({
    g:Object.freeze(["rabbit","chicken"]),
    f:Object.freeze(["fox","deer","squirrel"]),
    s:Object.freeze(["goat","zebra"]),
    i:Object.freeze(["penguin","seal"]),
    w:Object.freeze(["frog","toad"]),
    p:Object.freeze(["bat","spider"])
  });
  const ROOT="./public/assets/FREE 64 Tiny Animals – 32x32 Pixel Art Pack/";
  const FILES=Object.freeze({
    rabbit:"Pets/rabbit.png",chicken:"Farm Animals/chicken.png",
    fox:"Forest Animals/fox.png",deer:"Forest Animals/dear.png",
    squirrel:"Forest Animals/squirrel.png",
    goat:"Farm Animals/goat.png",zebra:"Wild-Jungle Animals/zebra.png",
    penguin:"Cute Animals/penguin.png",seal:"Cute Animals/seal.png",
    frog:"Water Animals/frog.png",toad:"Water Animals/toad.png",
    bat:"Small Creatures/bat.png",spider:"Small Creatures/spider.png"
  });
  const speciesUrl=kind=>FILES[kind]?ROOT+FILES[kind].split("/").map(encodeURIComponent).join("/"):null;
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
  function spawn(world,objects=[]){
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
        if(insideSanctuary(world,x,y))continue;
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
  function step(animals,world,elapsed,blocked){
    if(!world||!Array.isArray(animals)||!(elapsed>0))return;
    const water=new Set((world.water||[]).map(o=>tileKey(o.x,o.y)));
    for(const animal of animals){
      if(!animal.wild)continue;
      animal.timer=(Number(animal.timer)||0)+elapsed;
      if(animal.timer<8)continue;
      animal.timer%=8;
      const x=Math.floor(animal.x),y=Math.floor(animal.y);
      const n=hash(world.seed+Math.floor((animal.age||0)*13),x,y+Math.floor(animal.homeX));
      const options=[[1,0],[-1,0],[0,1],[0,-1],[0,0]];
      const [dx,dy]=options[Math.floor(n*options.length)];
      const nx=x+dx,ny=y+dy;
      const id=tileKey(nx,ny);
      if(nx<1||ny<1||nx>=world.width-1||ny>=world.height-1||
          world.biomeMap[ny*world.width+nx]!==animal.biome||
          insideSanctuary(world,nx,ny)||water.has(id)||
          Math.abs(nx-animal.homeX)>4||Math.abs(ny-animal.homeY)>4||
          blocked?.(nx,ny))continue;
      animal.x=nx+.5;animal.y=ny+.5;
    }
  }
  return Object.freeze({PROTECTION,GEAR,SPECIES,FILES,ROOT,speciesUrl,
    requirement,blocker,insideSanctuary,spawn,step});
});
