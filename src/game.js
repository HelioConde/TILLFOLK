"use strict";
(() => {
  const TILE = 32, W = 80, H = 50, BASE_W=28, BASE_H=18, SAVE_KEY = "tillfolk-v01";
  const World=window.TillfolkWild,Orders=window.TillfolkOrders,Prologue=window.TillfolkPrologue;
  if(!Prologue)throw new Error("Carregue prologue.js antes de game.js.");
  if(!Orders)throw new Error("Carregue src/task-orders.js antes do motor TILLFOLK.");
  Orders.setBounds(W,H);
  window.TillfolkHouseBuilder.setBounds(W,H);
  if(!World)throw new Error("Carregue src/wild-world.js antes do motor TILLFOLK.");
  const canvas = document.querySelector("#world"), ctx = canvas.getContext("2d");
  canvas.width=W*TILE;canvas.height=H*TILE;
  const $ = (s) => document.querySelector(s);
  let worldPanX=0,worldPanY=0,panPointer=null,suppressMapClick=false;
  let selectionPointer=null,areaSelection=null,areaMode=false,suppressRightContext=false;
  // A câmera tem escala renderizada e escala desejada: a roda não salta entre quadros.
  let cameraZoom=1,targetCameraZoom=1,cameraAnchor=null,lastCameraFrame=0,lastMinimapFrame=-1000;
  const ZOOM_MIN=.5,ZOOM_MAX=6;
  const zoomSteps=[.5,.75,1,1.25,1.5,1.75,2,2.5,3,4,5,6];
  const movementKeys=new Set(),activeTouches=new Map();
  let pinchGesture=null;
  const minimap=document.querySelector("#minimap"),miniCtx=minimap?.getContext("2d");
  if(miniCtx)miniCtx.imageSmoothingEnabled=false;
  const zoomIndex=()=>zoomSteps.reduce((best,z,i)=>
    Math.abs(z-targetCameraZoom)<Math.abs(zoomSteps[best]-targetCameraZoom)?i:best,0);
  const clampZoom=value=>Math.max(ZOOM_MIN,Math.min(ZOOM_MAX,value));
  function syncCameraButtons(){
    const percent=$("#zoom-value");
    if(percent)percent.textContent=Math.round(targetCameraZoom*100)+"%";
    $("#zoom-out").disabled=targetCameraZoom<=ZOOM_MIN+0.001;
    $("#zoom-in").disabled=targetCameraZoom>=ZOOM_MAX-0.001;
  }
  function captureCameraAnchor(screenX,screenY){
    const view=$(".canvas-scroll").getBoundingClientRect(),
      rect=canvas.getBoundingClientRect();
    const x=Number.isFinite(screenX)?screenX:view.left+view.width/2,
      y=Number.isFinite(screenY)?screenY:view.top+view.height/2;
    return {screenX:x,screenY:y,
      u:(x-rect.left)/Math.max(1,rect.width),
      v:(y-rect.top)/Math.max(1,rect.height)};
  }
  let hoveredTile=null;
  const feedbackParticles=[];
  const reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)");
  function showMapFeedback(x,y,color="#f4df9e"){
    if(reducedMotion.matches)return;
    feedbackParticles.push({x,y,color,start:performance.now()});
    if(feedbackParticles.length>22)feedbackParticles.shift();
  }
  function clampWorldPan(){
    if(!document.body.classList.contains("play-session"))return;
    const view=$(".canvas-scroll").getBoundingClientRect();
    const boundsX=Math.max(0,(canvas.getBoundingClientRect().width-view.width)/2);
    const boundsY=Math.max(0,(canvas.getBoundingClientRect().height-view.height)/2);
    worldPanX=Math.max(-boundsX,Math.min(boundsX,worldPanX));
    worldPanY=Math.max(-boundsY,Math.min(boundsY,worldPanY));
    canvas.style.setProperty("--pan-x",worldPanX+"px");
    canvas.style.setProperty("--pan-y",worldPanY+"px");
  }
  function fitWorldCanvas(){
    if(document.body.classList.contains("play-session")){
      const view=$(".canvas-scroll").getBoundingClientRect();
      if(view.width<1||view.height<1)return;
      // O zoom 100% conserva a escala visual da antiga área 28x18.
      // O mundo é maior, mas os personagens não viram pontos minúsculos.
      const scale=Math.max(view.width/(BASE_W*TILE),view.height/(BASE_H*TILE))*cameraZoom;
      canvas.style.width=Math.ceil(canvas.width*scale)+2+"px";
      canvas.style.height=Math.ceil(canvas.height*scale)+2+"px";
      clampWorldPan();
      return;
    }
    // Ajuste do palco apenas em desktops altos; celulares conservam scroll/pan.
    const desktop=window.matchMedia("(min-width: 1181px) and (min-height: 700px)").matches;
    if(!desktop || document.body.classList.contains("focus-game")){
      canvas.style.removeProperty("width");
      canvas.style.removeProperty("height");
      return;
    }
    const area=$(".canvas-wrap");
    if(!area)return;
    const rect=area.getBoundingClientRect();
    if(rect.width<50||rect.height<50)return;
    const scale=Math.min(rect.width/canvas.width,rect.height/canvas.height);
    const width=Math.max(1,Math.floor(canvas.width*scale));
    const height=Math.max(1,Math.floor(canvas.height*scale));
    if(canvas.style.width!==width+"px")canvas.style.width=width+"px";
    if(canvas.style.height!==height+"px")canvas.style.height=height+"px";
  }
  function setCameraZoom(value,screenX,screenY){
    if(!playing||!document.body.classList.contains("play-session"))return;
    const next=clampZoom(Number(value));
    if(!Number.isFinite(next))return;
    if(Math.abs(next-targetCameraZoom)<.0001)return;
    // Calcular coordenadas relativas do ponto sob o mouse antes do zoom.
    cameraAnchor=captureCameraAnchor(screenX,screenY);
    targetCameraZoom=next;
    syncCameraButtons();
  }
  function updateCamera(now){
    if(!playing||!document.body.classList.contains("play-session")){lastCameraFrame=now;return;}
    const dt=Math.min(50,Math.max(0,now-(lastCameraFrame||now)));
    lastCameraFrame=now;
    const speed=(eventSpeed=dt)=>eventSpeed*.6*(movementKeys.has("shift")?1.7:1);
    let vx=Number(movementKeys.has("a")||movementKeys.has("arrowleft"))-
      Number(movementKeys.has("d")||movementKeys.has("arrowright"));
    let vy=Number(movementKeys.has("w")||movementKeys.has("arrowup"))-
      Number(movementKeys.has("s")||movementKeys.has("arrowdown"));
    if(vx||vy){
      const norm=Math.hypot(vx,vy);
      worldPanX+=vx/norm*speed();
      worldPanY+=vy/norm*speed();
      cameraAnchor=null;
      clampWorldPan();
    }
    if(Math.abs(targetCameraZoom-cameraZoom)<.0001){
      cameraZoom=targetCameraZoom;
      // Pinça com dois dedos também permite arrastar, mesmo sem mudar a distância.
      if(pinchGesture&&cameraAnchor){
        const view=$(".canvas-scroll").getBoundingClientRect();
        const rect=canvas.getBoundingClientRect();
        worldPanX=cameraAnchor.screenX-(view.left+view.width/2)-(cameraAnchor.u-.5)*rect.width;
        worldPanY=cameraAnchor.screenY-(view.top+view.height/2)-(cameraAnchor.v-.5)*rect.height;
        clampWorldPan();
      }else cameraAnchor=null;
      return;
    }
    const fraction=reducedMotion.matches?1:1-Math.exp(-dt/95);
    cameraZoom+=(targetCameraZoom-cameraZoom)*fraction;
    if(Math.abs(targetCameraZoom-cameraZoom)<.002)cameraZoom=targetCameraZoom;
    fitWorldCanvas();
    if(cameraAnchor){
      const view=$(".canvas-scroll").getBoundingClientRect();
      const rect=canvas.getBoundingClientRect();
      worldPanX=cameraAnchor.screenX-(view.left+view.width/2)-
        (cameraAnchor.u-.5)*rect.width;
      worldPanY=cameraAnchor.screenY-(view.top+view.height/2)-
        (cameraAnchor.v-.5)*rect.height;
    }
    clampWorldPan();
    if(cameraZoom===targetCameraZoom)cameraAnchor=null;
  }
  function focusCameraAt(x,y){
    if(!playing)return;
    cameraAnchor=null;
    const rect=canvas.getBoundingClientRect();
    worldPanX=(.5-x/W)*rect.width;
    worldPanY=(.5-y/H)*rect.height;
    clampWorldPan();
  }
  function resetCamera(){
    cameraZoom=1;targetCameraZoom=1;cameraAnchor=null;worldPanX=0;worldPanY=0;
    fitWorldCanvas();focusCameraAt(state?.spawn?.x??W/2,state?.spawn?.y??H/2);syncCameraButtons();
  }
  function paintMinimap(){
    if(!playing||!state||!minimap||!miniCtx||minimap.hidden)return;
    const w=minimap.width,h=minimap.height;
    miniCtx.clearRect(0,0,w,h);
    miniCtx.imageSmoothingEnabled=false;
    // Minimap independente da câmera: não reutilizar o canvas com regiões
    // fora da viewport transparentes. Assim ele retrata o mundo inteiro.
    const pixelWidth=w/W,pixelHeight=h/H;
    for(let ty=0;ty<H;ty++)for(let tx=0;tx<W;tx++){
      const kind=World.biomeAt(state.world,tx,ty);
      miniCtx.fillStyle=window.TillfolkBiomes.COLORS[kind]||"#a4d17c";
      miniCtx.fillRect(Math.floor(tx*pixelWidth),Math.floor(ty*pixelHeight),
        Math.ceil(pixelWidth)+1,Math.ceil(pixelHeight)+1);
    }
    miniCtx.fillStyle="#578da0";
    for(const tile of state.world.water)miniCtx.fillRect(
      Math.floor(tile.x*pixelWidth),Math.floor(tile.y*pixelHeight),
      Math.ceil(pixelWidth)+1,Math.ceil(pixelHeight)+1);
    miniCtx.fillStyle="#2d5532";
    for(const obj of state.world.objects)if(obj.kind==="tree"||obj.kind==="thicket"){
      miniCtx.fillRect(Math.floor(obj.x*pixelWidth),Math.floor(obj.y*pixelHeight),
        Math.ceil(pixelWidth),Math.ceil(pixelHeight));
    }
    // Marcadores de ordens: amarelo = pronta, marrom = dependência pendente.
    for(const job of tasks){
      miniCtx.fillStyle=job.status==="ready"?"#ffe5a1":"#aa7057";
      miniCtx.fillRect(Math.round((job.x+.5)*w/W)-2,Math.round((job.y+.5)*h/H)-2,4,4);
    }
    for(const worker of state.workers){
      miniCtx.fillStyle="#faf0cc";
      const x=Math.round(worker.x*w/W),y=Math.round(worker.y*h/H);
      miniCtx.fillRect(x-2,y-2,5,5);
      miniCtx.fillStyle="#34472e";miniCtx.fillRect(x-1,y-1,3,3);
    }
    // Janela real da câmera; visível mesmo em zoom máximo.
    const image=canvas.getBoundingClientRect(),view=$(".canvas-scroll").getBoundingClientRect();
    const x=Math.max(0,(view.left-image.left)/image.width*w),
      y=Math.max(0,(view.top-image.top)/image.height*h),
      right=Math.min(w,(view.right-image.left)/image.width*w),
      bottom=Math.min(h,(view.bottom-image.top)/image.height*h);
    miniCtx.fillStyle="#fff0bf22";
    miniCtx.fillRect(x,y,Math.max(0,right-x),Math.max(0,bottom-y));
    miniCtx.strokeStyle="#fff3cf";miniCtx.lineWidth=2;
    miniCtx.strokeRect(Math.round(x)+1,Math.round(y)+1,
      Math.max(0,Math.round(right-x)-2),Math.max(0,Math.round(bottom-y)-2));
  }
  $("#zoom-in").addEventListener("click",()=>setCameraZoom(zoomSteps[Math.min(zoomSteps.length-1,zoomIndex()+1)]));
  $("#zoom-out").addEventListener("click",()=>setCameraZoom(zoomSteps[Math.max(0,zoomIndex()-1)]));
  $("#zoom-reset").addEventListener("click",resetCamera);
  $("#minimap-toggle").addEventListener("click",()=>{
    minimap.hidden=!minimap.hidden;
    $("#biome-legend").hidden=minimap.hidden;
    $("#minimap-toggle").setAttribute("aria-expanded",String(!minimap.hidden));
    $("#minimap-toggle").textContent=minimap.hidden?"+":"−";
    if(!minimap.hidden)paintMinimap();
  });
  minimap.addEventListener("click",event=>{
    const rect=minimap.getBoundingClientRect();
    focusCameraAt((event.clientX-rect.left)/rect.width*W,
      (event.clientY-rect.top)/rect.height*H);
  });
  $("#biome-legend").addEventListener("click",event=>{
    const chosen=event.target.closest("[data-visit-biome]");
    if(!chosen||!state?.world)return;
    const position=state.world.biomeMap?.indexOf(chosen.dataset.visitBiome)??-1;
    if(position<0)return;
    focusCameraAt(position%W+.5,Math.floor(position/W)+.5);
  });
  minimap.addEventListener("keydown",event=>{
    const move={ArrowUp:[0,-1.5],ArrowDown:[0,1.5],ArrowLeft:[-1.5,0],ArrowRight:[1.5,0]}[event.key];
    if(move){
      event.preventDefault();
      const rect=canvas.getBoundingClientRect();
      focusCameraAt(W/2-worldPanX/rect.width*W+move[0],
        H/2-worldPanY/rect.height*H+move[1]);
    }else if(event.key==="Enter"||event.key===" "){event.preventDefault();resetCamera();}
  });
  // Oxygen Not Included: WASD move a câmera, H volta para o centro da colônia.
  document.addEventListener("keydown",event=>{
    if(!playing||!document.body.classList.contains("play-session")||
       event.altKey||event.ctrlKey||event.metaKey||
       event.target.closest("input,textarea,select,[contenteditable]")||
       event.target===minimap||
       document.querySelector("dialog[open]")||
       document.body.classList.contains("drawer-open"))return;
    const key=event.key.toLowerCase();
    if(["w","a","s","d","arrowup","arrowleft","arrowdown","arrowright"].includes(key)){
      movementKeys.add(key);event.preventDefault();return;
    }
    if(key==="shift"){movementKeys.add("shift");return;}
    if(event.repeat)return;
    if(key==="h"){event.preventDefault();focusCameraAt(state?.spawn?.x??W/2,state?.spawn?.y??H/2);return;}
    if(key==="m"){$("#minimap-toggle").click();return;}
    if(key==="+"||key==="="){event.preventDefault();$("#zoom-in").click();}
    if(key==="-"){event.preventDefault();$("#zoom-out").click();}
    if(key==="0"){event.preventDefault();resetCamera();}
  });
  document.addEventListener("keyup",event=>movementKeys.delete(event.key.toLowerCase()));
  window.addEventListener("blur",()=>movementKeys.clear());
  // Zoom contínuo: trackpad e roda do mouse compartilham a mesma sensibilidade.
  canvas.addEventListener("wheel",event=>{
    if(!playing||!document.body.classList.contains("play-session"))return;
    event.preventDefault();
    const unit=event.deltaMode===1?16:event.deltaMode===2?250:1;
    const delta=Math.max(-180,Math.min(180,event.deltaY*unit));
    setCameraZoom(targetCameraZoom*Math.exp(-delta*.0018),event.clientX,event.clientY);
  },{passive:false});
  syncCameraButtons();
  window.addEventListener("resize",fitWorldCanvas);
  let compactMap=window.innerWidth<=700;
  window.addEventListener("resize",()=>{
    const compact=window.innerWidth<=700;
    if(compact===compactMap)return;
    compactMap=compact;
    if(!playing)return;
    // Ao entrar no modo celular, recolher o mapa para não cobrir o jogo.
    minimap.hidden=compact;
    $("#biome-legend").hidden=compact;
    $("#minimap-toggle").setAttribute("aria-expanded",String(!compact));
    $("#minimap-toggle").textContent=compact?"+":"−";
  });
  if("ResizeObserver" in window){
    new ResizeObserver(fitWorldCanvas).observe(document.querySelector(".canvas-wrap"));
  }

  ctx.imageSmoothingEnabled = false;
  const A = "./public/assets/sprout-lands/";
  const spriteUrls = {
    grass:A+"terrain/grass.png", dirt:A+"terrain/tilled-dirt.png", soil:A+"terrain/soil.png",
    crops:A+"farming/crops.png", trees:A+"environment/trees-and-bushes.png",
    worker:A+"characters/worker-basic.png", premium:A+"characters/worker-variants.png", actions:A+"characters/worker-actions.png", wateringFx:A+"characters/watering-effects.png",
    cow:A+"animals/cow.png", well:A+"structures/water-well.png", fences:A+"structures/fences.png",
    roof:A+"structures/wood-roof.png",walls:A+"structures/wood-walls.png",door:A+"structures/wood-door.png",furniture:A+"structures/furniture.png",chest:A+"structures/chest.png",paths:A+"structures/paths.png",fenceGates:A+"structures/fence-gates.png",
    rocks:A+"environment/forageables.png"
  };
  const sprite = {};
  for (const [key,url] of Object.entries(spriteUrls)) {
    const img = new Image(); img.src = url; sprite[key] = img;
  }

  // Variações de paleta feitas sobre os mesmos frames originais, sem adicionar imagens.
  // O atlas base possui corpo creme e contorno roxo; apenas essas cores são alteradas.
  const workerPalettes=[
    {outline:[92,78,146],shade:[118,109,170],body:[243,242,192],light:[221,213,222],accent:[232,181,172]},
    {outline:[112,69,56],shade:[161,102,69],body:[249,210,152],light:[247,222,182],accent:[219,137,116]},
    {outline:[52,104,85],shade:[89,148,117],body:[243,232,166],light:[214,238,190],accent:[226,162,138]},
    {outline:[62,84,140],shade:[107,136,183],body:[236,244,212],light:[198,222,239],accent:[227,159,151]},
    {outline:[151,71,111],shade:[194,117,144],body:[255,224,196],light:[246,204,221],accent:[233,147,149]},
    {outline:[75,86,98],shade:[112,130,138],body:[230,214,180],light:[204,221,205],accent:[225,158,125]},
    {outline:[117,90,56],shade:[175,136,73],body:[252,236,169],light:[250,213,176],accent:[232,160,104]},
    {outline:[69,118,115],shade:[95,157,154],body:[231,244,206],light:[208,231,219],accent:[234,174,151]}
  ];
  const workerPaletted=new Map();
  function workerAppearanceId(person){return Math.abs(Math.trunc(Number(person?.appearance)||0))%workerPalettes.length;}
  function getWorkerSprite(person, useAction=false){
    // As animações das ferramentas são do próprio pacote já incluído no projeto.
    const sourceId=useAction&&valid(sprite.actions)?"actions":valid(sprite.premium)?"premium":"worker";
    const original=sprite[sourceId];
    if(!valid(original))return original;
    const paletteId=workerAppearanceId(person);
    if(paletteId===0)return original;
    const paletteKey=sourceId+":"+paletteId;
    if(workerPaletted.has(paletteKey))return workerPaletted.get(paletteKey);
    const off=document.createElement("canvas");
    off.width=original.naturalWidth;off.height=original.naturalHeight;
    const context=off.getContext("2d",{willReadFrequently:true});
    context.imageSmoothingEnabled=false;context.drawImage(original,0,0);
    try{
      const frame=context.getImageData(0,0,off.width,off.height),pixels=frame.data;
      const target=workerPalettes[paletteId];
      const replacements=[
        [[92,78,146],target.outline],[[118,109,170],target.shade],
        [[243,242,192],target.body],[[221,213,222],target.light],
        [[232,181,172],target.accent]
      ];
      for(let i=0;i<pixels.length;i+=4){
        if(pixels[i+3]===0)continue;
        for(const [source,shade] of replacements){
          if(Math.abs(pixels[i]-source[0])<3&&Math.abs(pixels[i+1]-source[1])<3&&Math.abs(pixels[i+2]-source[2])<3){
            pixels[i]=shade[0];pixels[i+1]=shade[1];pixels[i+2]=shade[2];break;
          }
        }
      }
      context.putImageData(frame,0,0);
    }catch(err){console.warn("Paleta original mantida:",err);}
    workerPaletted.set(paletteKey,off);
    return off;
  }
  sprite.premium.addEventListener("load",()=>{workerPaletted.clear();redrawStarterAvatars();});
  sprite.worker.addEventListener("load",()=>{workerPaletted.clear();redrawStarterAvatars();});
  sprite.actions.addEventListener("load",()=>workerPaletted.clear());
  const labels = {clear:"Limpar",till:"Arar",fertilize:"Fertilizar",sow:"Semear",water:"Regar",harvest:"Colher",carry:"Transportar",collectWater:"Buscar água",collectManure:"Recolher esterco",buildHome:"Construir casa"};
  const icons = {clear:"🪓",till:"⛏️",fertilize:"🌿",sow:"🌱",water:"💧",harvest:"🥕",carry:"📦",collectWater:"🪣",collectManure:"🐄",buildHome:"🏠"};
  const baseTime = {clear:120,till:90,fertilize:60,sow:60,water:90,harvest:120,carry:60,collectWater:65,collectManure:45,buildHome:180};
  const startPriorities = {clear:7,till:6,fertilize:5,sow:6,water:8,harvest:9,carry:8,collectWater:7,collectManure:5,buildHome:7};
  // Homenagem a Simone: nomes dos colonos inspirados no nome dela.
  // O jogador continua livre para personalizar cada personagem.
  const names=["Sim","Simo","Mone","Moni","Mona","Simi","Simona","Monê","Mimo","Simone"];
  const legacyWorkerNames={
    Nico:"Sim",Cora:"Simo",Tito:"Mone",Eva:"Moni",Bia:"Mona",
    Theo:"Simi","Léo":"Simona",Sol:"Monê",Ravi:"Mimo",
    Mel:"Simone",Ivo:"Simo",Lua:"Mone",Dora:"Sim",Zeca:"Moni"
  };
  function homageSavedName(person){
    // Só nomes automaticamente gerados nas versões antigas: "Lua 88", etc.
    // Não altera nomes personalizados, IDs, habilidades ou tarefas.
    if(!person||typeof person.name!=="string")return;
    const old=/^([^\d]+) ([1-9]\d)$/.exec(person.name);
    if(old&&Object.hasOwn(legacyWorkerNames,old[1]))
      person.name=legacyWorkerNames[old[1]]+" "+old[2];
  }
  const initialCandidates = [
    {name:"Sim",skills:["water"],neg:["clear"],cost:6,color:"#fff2bd"},
    {name:"Simo",skills:["till","sow","harvest"],neg:["fertilize"],cost:10,color:"#d3d6fc"},
    {name:"Mone",skills:["carry","fertilize"],neg:[],cost:8,color:"#ffcfc5"}
  ];
  const HOME_WOOD_COST=8;
  const homeTiles=(x,y)=>[[x,y],[x+1,y],[x,y+1],[x+1,y+1]];
  function occupiedByHome(x,y){
    return Boolean(state?.homes?.some(h=>!h.legacy&&x>=h.x&&x<=h.x+1&&y>=h.y&&y<=h.y+1));
  }
  function homeSiteValid(x,y){
    if(x<2||y<2||x>=W-3||y>=H-3)return false;
    return homeTiles(x,y).every(([tx,ty])=>
      World.terrainAt(state.world,tx,ty).buildable&&
      !World.waterAt(state.world,tx,ty)&&!World.at(state.world,tx,ty)&&
      !state.animals?.some(a=>Math.floor(a.x)===tx&&Math.floor(a.y)===ty)&&
      !window.TillfolkHouseBuilder.occupied(state.house,tx,ty)&&
      !occupiedByHome(tx,ty)&&
      !state.plots.some(p=>p.x===tx&&p.y===ty&&(p.tilled||p.seeded||p.produce||
        (p.selected&&!state.orders.some(o=>o.type==="buildHome"&&o.x===x&&o.y===y))))&&
      !state.orders.some(o=>o.type==="buildHome"&&
        !(o.x===x&&o.y===y)&&homeTiles(o.x,o.y).some(([ox,oy])=>ox===tx&&oy===ty))
    );
  }
  function assignHomes(){
    if(!state)return;
    const residents=new Set(state.workers.map(w=>w.id));
    const taken=new Set();
    for(const home of state.homes){
      if(!residents.has(home.residentId)||taken.has(home.residentId))home.residentId=null;
      else taken.add(home.residentId);
    }
    for(const worker of state.workers){
      if(taken.has(worker.id))continue;
      const vacant=state.homes.find(h=>h.residentId==null);
      if(vacant){vacant.residentId=worker.id;taken.add(worker.id);}
    }
  }
  function syncLegacyHome(){
    if(!state)return;
    const completed=state.house.floor.length>=2&&state.house.walls.length>0&&state.house.roof.length>0;
    const present=state.homes.find(h=>h.legacy);
    if(completed&&!present){
      const [x,y]=state.house.anchor.split("-").map(Number);
      state.homes.push({x,y,residentId:null,legacy:true});
    }else if(!completed&&present)state.homes=state.homes.filter(h=>!h.legacy);
    assignHomes();
  }
  function housingVacancy(){
    syncLegacyHome();
    return Math.max(0,state.homes.length-state.workers.length);
  }
  const keyOf=(x,y)=>x+"-"+y;
  const blocked=(x,y)=>World.blocked(state?.world,x,y,W,H)||Boolean(state?.house&&window.TillfolkHouseBuilder.occupied(state.house,x,y))||occupiedByHome(x,y);
  // Caminhos em grade impedem que colonos atravessem a casa, árvores e objetos.
  // Só a navegação usa esta malha; o cultivo continua seguindo as regras existentes.
  const directions=[[1,0],[-1,0],[0,1],[0,-1]];
  function routeBetween(fromX,fromY,toX,toY){
    // O lenhador fica ao LADO da árvore/pedra; nunca pisa dentro do obstáculo.
    const start=[Math.floor(fromX),Math.floor(fromY)],id=(x,y)=>x+","+y;
    const origin=id(...start);
    // Ao clicar num ponto interno da lagoa, qualquer margem da MESMA lagoa
    // é válida: um trabalhador nunca precisa pisar na água.
    const sourceTiles=World.waterAt(state?.world,toX,toY)?state.world.water:[{x:toX,y:toY}];
    const goals=blocked(toX,toY)?sourceTiles.flatMap(tile=>
      directions.map(([dx,dy])=>[tile.x+dx,tile.y+dy])
        .filter(([x,y])=>!blocked(x,y))):[[toX,toY]];
    if(!goals.length)return [];
    const destinations=new Set(goals.map(([x,y])=>id(x,y)));
    const queue=[start],previous=new Map([[origin,null]]);
    let reached=destinations.has(origin)?origin:null;
    for(let head=0;head<queue.length&&reached===null;head++){
      const [x,y]=queue[head];
      for(const [dx,dy] of directions){
        const nx=x+dx,ny=y+dy,key=id(nx,ny);
        if(previous.has(key)||blocked(nx,ny))continue;
        previous.set(key,id(x,y));queue.push([nx,ny]);
        if(destinations.has(key)){reached=key;break;}
      }
    }
    if(reached===null)return [];
    const path=[];
    for(let current=reached;current!==origin;current=previous.get(current)){
      const [x,y]=current.split(",").map(Number);path.push({x:x+.5,y:y+.5});
    }
    path.reverse();
    if(!path.length){const [x,y]=reached.split(",").map(Number);path.push({x:x+.5,y:y+.5});}
    return path;
  }
  let state = null, tasks = [], selectedTool = "universal", buildLayer = "floor", eraseBuild = false, buildHover = null, houseHistory = [], playing = false, simSpeed = 1, last = 0, frameAccumulator = 0, uiAccumulator = 0, saveAccumulator=0, toastTimer, starters = [], pendingMode = "survival", managementTab = "priorities", managementWorker = null, speedBeforeManagement = 1;
  const random = (a) => a[Math.floor(Math.random()*a.length)];
  function makePlot(x,y,selected=false){
    return {x,y,selected,dirty:false,tilled:false,fertilized:false,seeded:false,watered:false,growth:0,produce:false};
  }
  function reset(chosenStarters = [], config = {}){
    // O jogador recebe uma clareira e recursos naturais, não uma fazenda pronta.
    const seed=Math.floor(Math.random()*0xFFFFFFFF)>>>0;
    const world=World.create(seed,W,H);
    const plots=[];
    for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){
      if(!World.waterAt(world,x,y))plots.push(makePlot(x,y,false));
    }
    const team = chosenStarters.slice(0,2).map((c,i)=>({
      id:i+1,name:c.name,skills:[...c.skills],neg:[...c.neg],color:c.color,
      appearance:c.appearance ?? i,equippedTool:null,personalPriority:{},x:W/2-.5+i,y:H/2-.5,task:null,progress:0,facing:"down",moving:false,walkFrame:0
    }));
    state = {day:1,minutes:8*60,seeds:0,water:0,food:8,mode:config.mode||"survival",farmName:config.farmName||"Vale do Amanhecer",
      plots,orders:[],world,spawn:{x:W/2,y:H/2},house:window.TillfolkHouseBuilder.initial(),homes:[],animals:[],inventory:{wood:0,twigs:0,stone:0,mushroom:0,flower:0,herbs:0,grass:0,manure:0},tools:{},prologue:Prologue.initial(),workers:team,
      candidates:structuredClone(initialCandidates),nextWorkerId:team.length+1,priorities:{...startPriorities},
      journal:["A equipe inicial chegou ao vale: "+team.map(w=>w.name).join(" e ")+"!"]};
    tasks=[]; simSpeed=1; updateSpeed();
  }
  function readSave(){
    try {
      const s=JSON.parse(localStorage.getItem(SAVE_KEY));
      if(!s||!Array.isArray(s.plots)||!Array.isArray(s.workers))return false;
      state=s;
      state.workers.forEach(homageSavedName);
      // Migração não destrutiva: os saves continuam utilizáveis, mas não há moeda.
      delete state.coins;
      state.food=Math.max(0,Number(state.food)||0);
      state.house=window.TillfolkHouseBuilder.normalize(s.house);
      state.orders=Orders.normalize(s.orders);
      // Saves anteriores nunca geram tarefas implícitas após a atualização.
      if(!Array.isArray(s.orders))state.plots.forEach(p=>{p.selected=false;});
      // Salvamentos antigos continuam válidos: a geração não apaga cultivos já feitos.
      if(!state.world){
        state.world=World.create((Date.now()>>>0),BASE_W,BASE_H,[
          ...state.plots.filter(p=>p.selected||p.tilled||p.seeded),
          ...state.workers.map(w=>({x:Math.floor(w.x),y:Math.floor(w.y)}))
        ]);
      }
      const legacySize=state.world.width!==W||state.world.height!==H||
        state.world.version<2;
      if(legacySize){
        // Migração aditiva: mantém a fazenda 28x18 intacta, expande só o exterior.
        const previousWidth=state.world.width||BASE_W,
          previousHeight=state.world.height||BASE_H;
        state.world=World.expand(state.world,W,H,previousWidth,previousHeight);
        const registered=new Set(state.plots.map(p=>p.x+","+p.y));
        for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){
          const id=x+","+y;
          if(!registered.has(id)&&!World.waterAt(state.world,x,y)){
            state.plots.push(makePlot(x,y));
          }
        }
        state.spawn=s.spawn||{x:14,y:10};
      }else state.spawn=s.spawn||{x:W/2,y:H/2};
      // Saves legados podem trazer árvores com frutos: substituir somente a
      // variante gráfica, mantendo a árvore, sua posição e o recurso de madeira.
      World.stripFruitTrees(state.world);
      state.inventory=state.inventory||{wood:0,stone:0,mushroom:0,flower:0,herbs:0,grass:0};
      state.inventory.manure=Math.max(0,Number(state.inventory.manure)||0);
      // Saves antigos mantêm as ferramentas antes disponíveis gratuitamente.
      if(!s.tools&&!s.prologue){
        state.tools=Object.fromEntries(Object.keys(Prologue.RECIPES).map(id=>[id,1]));
        state.prologue={stage:Prologue.CHAPTERS.length,done:true};
      }
      Prologue.normalize(state);
      state.homes=Array.isArray(s.homes)?s.homes.filter(h=>Number.isInteger(h.x)&&Number.isInteger(h.y)&&h.x>=2&&h.y>=2):[];
      // Construções legadas com piso, parede e telhado passam a valer como moradia.
      if(!state.homes.some(h=>h.legacy)&&state.house.floor.length>=2&&state.house.walls.length>0&&state.house.roof.length>0){
        const [x,y]=state.house.anchor.split("-").map(Number);
        state.homes.push({x,y,residentId:null,legacy:true});
      }
      // A fase inicial não tem animais. Remover apenas a vaca inicial antiga
      // (inclusive de saves anteriores), sem apagar animais legítimos de fases futuras.
      const isLegacyStarterCow=a=>a?.id===1&&a.kind==="cow"&&
        a.x===16.5&&a.y===9.5&&!a.placedByPlayer;
      state.animals=(Array.isArray(s.animals)?s.animals:[])
        .filter(a=>a&&Number.isFinite(a.x)&&Number.isFinite(a.y)&&!isLegacyStarterCow(a))
        .map(a=>({...a,manure:Math.max(0,Number(a.manure)||0),timer:Number(a.timer)||0}));
      // Ordens da vaca removida não ficam bloqueadas para sempre.
      state.orders=state.orders.filter(o=>o.type!=="collectManure"||
        state.animals.some(a=>Math.floor(a.x)===o.x&&Math.floor(a.y)===o.y));
      assignHomes();
      state.mode=state.mode||"survival";
      state.farmName=state.farmName||"Minha Fazenda";
      state.priorities={...startPriorities,...s.priorities};
      state.workers.forEach(w=>{
        // Uma carga interrompida por recarregamento retorna ao depósito.
        if(w.carryingWater)state.water=(Number(state.water)||0)+1;
        if(w.carryingManure)state.inventory.manure++;
        w.carryingWater=false;w.carryingManure=false;w.supplyStage=null;w.supplyTarget=null;
        w.task=null;w.progress=0;w.personalPriority=w.personalPriority||{};
        w.x=Number.isFinite(w.x)?w.x:state.spawn.x;w.y=Number.isFinite(w.y)?w.y:state.spawn.y;
        w.route=[];w.routeTask=null;w.equippedTool=null;
        w.facing=w.facing||"down";w.moving=false;w.walkFrame=0;
      });
      state.candidates=Array.isArray(s.candidates)?s.candidates:structuredClone(initialCandidates);
      state.candidates.forEach(homageSavedName);
      state.journal=Array.isArray(s.journal)?s.journal:[];
      tasks=[];recalcTasks();simSpeed=1;updateSpeed();return true;
    }catch {return false;}
  }
  function save(){if(!state||!playing)return;try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));}catch(e){console.warn("Não foi possível salvar:",e);}}
  function log(text){state.journal.unshift(text);state.journal.length=Math.min(5,state.journal.length);}
  function notify(text){const t=$("#toast");t.textContent=text;t.classList.add("visible");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("visible"),3000);}
  // Falas flutuantes são desenhadas sobre o personagem existente, sem sprites
  // externos e sem mudar a lógica de movimento ou a câmera.
  let speechUntil=0,speechText="",speechWorkerId=null;
  function sayTutorial(text,seconds=12){
    if(!state?.workers?.length)return;
    const worker=state.workers.find(w=>!w.neg.includes("clear"))||state.workers[0];
    speechWorkerId=worker.id;speechText=text;
    speechUntil=performance.now()+seconds*1000;
    $("#tutorial-speaker").textContent=worker.name;
    $("#tutorial-speech-text").textContent=text;
    updateTutorialSpeech();
  }
  function updateTutorialSpeech(){
    const bubble=$("#tutorial-speech");
    if(!playing||!state||!speechText||performance.now()>speechUntil){
      bubble.hidden=true;return;
    }
    const worker=state.workers.find(w=>w.id===speechWorkerId)||state.workers[0];
    const bounds=canvas.getBoundingClientRect();
    const viewport=$(".canvas-scroll").getBoundingClientRect();
    if(!worker||bounds.width<1||bounds.height<1){bubble.hidden=true;return;}
    const x=bounds.left+worker.x/W*bounds.width;
    const y=bounds.top+worker.y/H*bounds.height;
    if(x<viewport.left+12||x>viewport.right-12||y<viewport.top+25||y>viewport.bottom-3){
      bubble.hidden=true;return;
    }
    bubble.hidden=false;
    const width=bubble.offsetWidth||190,height=bubble.offsetHeight||70;
    bubble.style.left=Math.round(Math.max(8,Math.min(innerWidth-width-8,x-width/2)))+"px";
    bubble.style.top=Math.round(Math.max(viewport.top+8,y-height-48))+"px";
  }
  function tutorialHint(){
    const mission=Prologue.snapshot(state).mission;
    return mission?mission.short+" Abra a missão para mais detalhes.":"";
  }
  function announceMission(previous){
    if(state.mode!=="tutorial"||state.prologue.stage<=previous)return;
    if(state.prologue.done){
      // A última cabana é o encerramento. Não apaga ou recria o estado da fazenda.
      state.mode="survival";
      $("#prologue-card").hidden=true;
      notify("🏅 Tutorial concluído! Continue jogando na mesma fazenda.");
      sayTutorial("Conseguimos! O tutorial acabou. Agora vamos cuidar da nossa fazenda!",16);
    }else{
      notify("✓ Missão concluída! "+Prologue.CHAPTERS[state.prologue.stage].title);
      sayTutorial(tutorialHint(),12);
    }
  }
  function recordPrologue(action,amount=1){
    // Normal/Sobrevivência e Fazenda tranquila nunca exibem ou avançam missões.
    if(state.mode!=="tutorial")return;
    const previous=state.prologue.stage;
    Prologue.event(state,action,amount);
    announceMission(previous);
  }
  function renderPrologue(){
    if(!state)return;
    const info=Prologue.snapshot(state),mission=info.mission;
    $("#prologue-card").hidden=state.mode!=="tutorial"||info.done;
    $("#prologue-step").textContent=info.done?"✓ PRÓLOGO CONCLUÍDO":"PRÓLOGO · MISSÃO "+(info.stage+1)+"/"+info.total;
    $("#prologue-title").textContent=mission?mission.icon+" "+mission.title:"🏅 Você aprendeu a sobreviver!";
    $("#prologue-summary").textContent=mission?mission.short:"A campanha terminou. Agora explore o vale e expanda sua colônia livremente.";
    $("#prologue-description").textContent=mission?mission.detail:"Você domina a coleta, a fabricação, o plantio, a água, a colheita e a construção. Nenhuma nova missão será gerada.";
    const goalsHtml=info.done?
      '<div class="prologue-goal done">✓ Todas as 10 missões concluídas</div>':
      info.progress.map(goal=>'<div class="prologue-goal '+(goal.value===goal.max?'done':'')+'"><span>'+
      (goal.value===goal.max?'✓ ':'○ ')+goal.label+'</span><b>'+goal.value+'/'+goal.max+'</b></div>').join("");
    $("#prologue-goals").innerHTML=goalsHtml;
    $("#prologue-dialog-goals").innerHTML=goalsHtml;
    $("#prologue-dialog-step").textContent=$("#prologue-step").textContent;
    $("#prologue-dialog-title").textContent=$("#prologue-title").textContent;
    $("#prologue-dialog-description").textContent=$("#prologue-description").textContent;
    $("#prologue-card").title=mission?mission.detail:"O tutorial está concluído. Você pode continuar jogando livremente.";
    $("#prologue-tool-count").textContent=Object.values(state.tools).filter(Boolean).length+"/"+Object.keys(Prologue.RECIPES).length;
  }
  const recipeResourceLabel={twigs:"Gravetos",stone:"Pedras",wood:"Madeira"};
  function renderWorkshop(){
    if(!state)return;
    $("#workshop-stock").innerHTML=[["twigs","🪵"],["stone","🪨"],["wood","🌳"]]
      .map(([resource,icon])=>'<span>'+icon+' '+recipeResourceLabel[resource]+': '+(state.inventory[resource]||0)+'</span>').join("");
    $("#workshop-recipes").innerHTML=Object.entries(Prologue.RECIPES).map(([id,recipe])=>{
      const made=!!state.tools[id];
      const cost=Object.entries(recipe.cost).map(([resource,qty])=>qty+' '+recipeResourceLabel[resource].toLowerCase()).join(' · ');
      const missing=Object.entries(recipe.cost).filter(([resource,qty])=>(state.inventory[resource]||0)<qty);
      return '<article class="workshop-recipe"><h3>'+recipe.icon+' '+recipe.label+'</h3><p>'+recipe.help+
        '</p><small>Custo: '+cost+'</small><button type="button" data-craft-tool="'+id+'" '+
        (made||missing.length?'disabled':'')+'>'+(made?'✓ Fabricada':missing.length?'Recursos insuficientes':'Fabricar')+'</button></article>';
    }).join("");
  }
  $("#prologue-open").addEventListener("click",()=>{
    if(window.matchMedia("(max-width:520px)").matches){
      $("#prologue-dialog").showModal();
      $("#prologue-open").setAttribute("aria-controls","prologue-dialog");
      $("#prologue-open").setAttribute("aria-expanded","true");
      return;
    }
    const el=$("#prologue-details"),expanded=el.hidden;
    el.hidden=!expanded;
    $("#prologue-open").setAttribute("aria-controls","prologue-details");
    $("#prologue-open").setAttribute("aria-expanded",String(expanded));
    $("#prologue-open").textContent=expanded?"▴ Recolher":"▣ Detalhes";
  });
  $("#prologue-dialog").addEventListener("close",()=>{
    $("#prologue-open").setAttribute("aria-expanded","false");
    $("#prologue-open").textContent="▣ Detalhes";
  });
  $("#prologue-dialog-craft").addEventListener("click",()=>{
    $("#prologue-dialog").close();
    $("#workshop-open").click();
  });
  const openWorkshop=()=>{
    if(!playing)return;
    renderWorkshop();$("#workshop-message").textContent="Fabrique uma ferramenta quando tiver todos os recursos.";
    if(!$("#workshop-dialog").open)$("#workshop-dialog").showModal();
  };
  $("#workshop-open").addEventListener("click",openWorkshop);
  $("#workshop-hud-button").addEventListener("click",openWorkshop);
  $("#workshop-recipes").addEventListener("click",event=>{
    const button=event.target.closest("[data-craft-tool]");
    if(!button||!state)return;
    const previous=state.prologue.stage;
    const result=Prologue.craft(state,button.dataset.craftTool);
    if(result.ok)announceMission(previous);
    $("#workshop-message").textContent=result.message;
    $("#workshop-message").dataset.error=String(!result.ok);
    if(result.ok){
      log(result.message);recalcTasks();refresh();save();renderWorkshop();
    }
  });
  function start(continueSaved=false, chosenStarters = [], config = {}){
    if(!continueSaved||!readSave())reset(chosenStarters,config);
    houseHistory=[];buildHover=null;areaSelection=null;selectionPointer=null;setTool("universal");
    recalcTasks(); // Limpar ordens já concluídas antes da primeira renderização.
    playing=true;$("#menu").hidden=true;$(".app-shell").inert=false;$("#continue").disabled=false;
    document.body.classList.add("play-session","focus-game");
    worldPanX=0;worldPanY=0;cameraZoom=1;targetCameraZoom=1;cameraAnchor=null;
    movementKeys.clear();activeTouches.clear();pinchGesture=null;hoveredTile=null;feedbackParticles.length=0;closeDrawer();refresh();save();
    minimap.hidden=window.innerWidth<=700;
    $("#biome-legend").hidden=minimap.hidden;
    $("#minimap-toggle").setAttribute("aria-expanded",String(!minimap.hidden));
    $("#minimap-toggle").textContent=minimap.hidden?"+":"−";
    syncCameraButtons();
    speechUntil=0;speechText="";$("#tutorial-speech").hidden=true;
    requestAnimationFrame(()=>{
      fitWorldCanvas();
      focusCameraAt(state.spawn?.x??W/2,state.spawn?.y??H/2);
      if(state.mode==="tutorial"&&!state.prologue.done)
        sayTutorial("Bem-vindo ao vale! "+tutorialHint(),15);
    });
    // O HUD contextual já explica a ação; não obstruir o mapa com aviso no modo normal.
  }
  // Somente ordens solicitadas pelo jogador entram na fila. Nenhuma etapa é
  // fabricada depois de limpar, arar, semear, regar ou colher.
  function releaseSupply(w){
    if(w.carryingWater){state.water++;w.carryingWater=false;}
    if(w.carryingManure){state.inventory.manure++;w.carryingManure=false;}
    w.supplyStage=null;w.supplyTarget=null;
  }
  // Uma marcação indica exclusivamente uma ordem PENDENTE, não uma memória
  // permanente da seleção. Limpa inclusive saves antigos que tinham selected=true.
  let lastSelectionPlots=null,lastSelectionSignature=null;
  function syncOrderSelections(){
    const signature=state.orders.filter(o=>!["collectWater","collectManure","buildHome"].includes(o.type))
      .map(o=>o.x+","+o.y).sort().join("|");
    if(lastSelectionPlots===state.plots&&lastSelectionSignature===signature)return;
    const selected=new Set(signature?signature.split("|"):[]);
    for(const p of state.plots)p.selected=selected.has(p.x+","+p.y);
    lastSelectionPlots=state.plots;lastSelectionSignature=signature;
  }
  function recalcTasks(){
    const current=new Set(state.orders.map(o=>o.id));
    for(const w of state.workers){
      if(w.task&&!current.has(w.task)){
        releaseSupply(w);
        w.task=null;w.progress=0;w.route=[];w.routeTask=null;w.workGoal=null;
      }
    }
    const assigned=new Map(state.workers.filter(w=>w.task).map(w=>[w.task,w.id]));
    tasks=state.orders.map(order=>{
      const p=findPlot(order.x,order.y);
      const result=Orders.status(order,p,World.at(state.world,order.x,order.y),state);
      return {...order,status:result.state,reason:result.reason,assigned:assigned.get(order.id)||null};
    });
    // Eliminar somente ordens que já perderam o sentido (ex.: save legado).
    const stale=tasks.filter(t=>t.status==="done");
    if(stale.length){
      const ids=new Set(stale.map(t=>t.id));
      state.orders=state.orders.filter(t=>!ids.has(t.id));
      tasks=tasks.filter(t=>!ids.has(t.id));
      for(const w of state.workers)if(ids.has(w.task)){
        releaseSupply(w);
        w.task=null;w.progress=0;w.route=[];w.routeTask=null;w.workGoal=null;
      }
    }
    syncOrderSelections();
  }
  function bonus(w,type){return w.skills.includes(type)?(w.skills.length===1?2:w.skills.length===2?1.6:1.3):1;}
  // Mesma regra para escolher trabalho e para explicar a ociosidade.
  // Traços negativos são proibições, não uma penalidade de velocidade.
  function workerTaskBlocker(w,t){
    if(t.status!=="ready")return t.reason||"Aguardando pré-requisitos";
    if(w.neg.includes(t.type))return "Traço negativo: não pode "+labels[t.type].toLowerCase();
    if(t.type==="water"&&state.water<=0&&w.neg.includes("collectWater"))
      return "Traço negativo: não pode buscar água";
    if(t.type==="fertilize"&&state.inventory.manure<=0&&w.neg.includes("collectManure"))
      return "Traço negativo: não pode recolher esterco";
    if(t.type==="buildHome"){
      const alreadyAssigned=state.workers.filter(other=>other.id!==w.id&&other.task&&
        tasks.some(job=>job.id===other.task&&job.type==="buildHome")).length;
      if(state.inventory.wood<HOME_WOOD_COST*(alreadyAssigned+1))
        return "Madeira reservada para outras construções";
    }
    if(!routeBetween(w.x,w.y,t.x,t.y).length)
      return "Sem caminho acessível até o trabalho";
    return null;
  }
  function idleReason(w){
    if(simSpeed===0)return "Simulação pausada";
    if(!tasks.length)return "Sem ordens: designe um trabalho no mapa";
    const open=tasks.filter(t=>t.status==="ready");
    if(!open.length){
      const missing=tasks.find(t=>t.reason&&/(semente|esterco|material|madeira|água)/i.test(t.reason));
      return "Aguardando pré-requisitos"+(missing?": "+missing.reason:"");
    }
    const free=open.filter(t=>!t.assigned);
    if(!free.length)return "Todas as ordens prontas já estão atribuídas";
    const restrictions=free.filter(t=>w.neg.includes(t.type)||
      (t.type==="water"&&state.water<=0&&w.neg.includes("collectWater"))||
      (t.type==="fertilize"&&state.inventory.manure<=0&&w.neg.includes("collectManure")));
    if(restrictions.length===free.length)
      return "Restrições impedem as tarefas disponíveis: "+[...new Set(restrictions.map(t=>labels[t.type]))].join(", ");
    const accessible=free.filter(t=>!workerTaskBlocker(w,t));
    if(!accessible.length){
      const problems=free.map(t=>workerTaskBlocker(w,t)).filter(Boolean);
      return problems.includes("Sem caminho acessível até o trabalho")?
        "Não há caminho acessível para as ordens livres":
        problems[0]||"Aguardando tarefa compatível";
    }
    return "Procurando a próxima ordem";
  }
  function assign(w){
    if(w.task)return;
    const available=tasks.filter(t=>t.status==="ready"&&!t.assigned&&!workerTaskBlocker(w,t));
    const priorityScore=t=>{
      const global=state.priorities[t.type]||5;
      const individual=w.personalPriority?.[t.type]??5;
      const expertise=bonus(w,t.type);
      const distance=Math.abs(w.x-(t.x+.5))+Math.abs(w.y-(t.y+.5));
      return global*20+individual*14+expertise*9-distance*.3;
    };
    available.sort((a,b)=>priorityScore(b)-priorityScore(a));
    if(available.length){w.task=available[0].id;w.progress=0;w.routeTask=null;w.route=[];available[0].assigned=w.id;}
  }
  function assignIdleWorkers(){
    const idle=state.workers.filter(w=>!w.task);
    if(!idle.length)return;
    // Trabalhadores especializados/restritos escolhem antes dos generalistas.
    // Evita o versátil ocupar a única ordem disponível para outro colono.
    // Contagem leve: o teste de caminho continua centralizado em assign().
    const options=w=>tasks.reduce((count,t)=>{
      if(t.status!=="ready"||t.assigned||w.neg.includes(t.type))return count;
      if(t.type==="water"&&state.water<=0&&w.neg.includes("collectWater"))return count;
      if(t.type==="fertilize"&&state.inventory.manure<=0&&w.neg.includes("collectManure"))return count;
      return count+1;
    },0);
    const ranked=idle.map(w=>({worker:w,options:options(w)}))
      .sort((a,b)=>a.options-b.options||a.worker.id-b.worker.id);
    for(const entry of ranked)assign(entry.worker);
  }
  function finish(w,t){
    const p=findPlot(t.x,t.y);
    if(t.type==="collectWater"){
      if(!World.waterAt(state.world,t.x,t.y))return false;
      state.water+=4;recordPrologue("collectWater");log(w.name+" buscou 4 baldes de água na lagoa.");return true;
    }
    if(t.type==="collectManure"){
      const animal=state.animals.find(a=>Math.floor(a.x)===t.x&&Math.floor(a.y)===t.y&&a.manure>0);
      if(!animal)return false;
      animal.manure--;state.inventory.manure++;
      log(w.name+" recolheu esterco de "+(animal.kind==="cow"?"vaca":"animal")+".");return true;
    }
    if(t.type==="buildHome"){
      if(state.inventory.wood<HOME_WOOD_COST||!homeSiteValid(t.x,t.y))return false;
      state.inventory.wood-=HOME_WOOD_COST;
      recordPrologue("buildHome");
      state.homes.push({x:t.x,y:t.y,residentId:null,legacy:false});
      for(const [hx,hy] of homeTiles(t.x,t.y)){
        state.plots=state.plots.filter(plot=>plot.x!==hx||plot.y!==hy);
      }
      assignHomes();
      log(w.name+" concluiu uma cabana. "+housingVacancy()+" vaga(s) livres.");return true;
    }
    if(!p)return false;
    let complete=true;
    switch(t.type){
      case "clear":{
        const obj=World.at(state.world,p.x,p.y);
        if(obj){
          const kind=obj.kind, result=World.clear(state.world,p.x,p.y);
          const types={tree:"wood",stump:"wood",log:"wood",boulder:"stone",pebble:"stone",
            mushroom:"mushroom",flowers:"flower",herbs:"herbs",grass:"grass",thicket:"wood",twig:"twigs"};
          const amount={tree:3,stump:2,log:2,boulder:3}[kind]||1;
          const resource=types[kind]||"grass";
          state.inventory[resource]=(state.inventory[resource]||0)+amount;
          if(kind==="twig")recordPrologue("twig",amount);
          if(kind==="pebble")recordPrologue("pebble",amount);
          if(kind==="grass")recordPrologue("grass",amount);
          if(resource==="wood")recordPrologue("wood",amount);
          // Grama alta tem chance de soltar uma semente. Não existe semente infinita.
          if(kind==="grass"&&Math.random()<.25){state.seeds++;recordPrologue("seed");log(w.name+" encontrou uma semente ao cortar grama!");}
          if(result.resource)log(w.name+" coletou "+result.resource+".");
          p.dirty=result.remaining;
          if(result.remaining)complete=false; // Continuar a mesma ordem até retirar o toco.
        }else p.dirty=false;
        // Limpar o terreno produz recursos naturais, nunca moedas.
        break;
      }
      case "till":p.tilled=true;break;
      case "fertilize":
        if(!w.carryingManure&&state.inventory.manure<=0)return false;
        if(w.carryingManure)w.carryingManure=false;else state.inventory.manure--;
        p.fertilized=true;break;
      case "sow":if(state.seeds<=0)return false;p.seeded=true;p.growth=0;state.seeds--;break;
      case "water":
        if(!w.carryingWater&&state.water<=0)return false;
        if(w.carryingWater)w.carryingWater=false;else state.water--;
        p.watered=true;break;
      case "harvest":p.produce=true;p.seeded=false;p.watered=false;p.growth=0;break;
      case "carry":p.produce=false;p.fertilized=false;state.food+=3;state.seeds++;log(w.name+" armazenou a colheita (+3 comida, +1 semente).");break;
    }
    if(complete&&["till","sow","water","harvest","carry"].includes(t.type))
      recordPrologue(t.type);
    if(complete&&t.type!=="carry"&&t.type!=="harvest")log(w.name+" terminou: "+labels[t.type].toLowerCase()+".");
    return complete;
  }
  function step(dt){
    if(!playing||simSpeed===0)return;
    const scaled=Math.min(dt,.07)*simSpeed;
    state.minutes+=scaled*1.25;
    if(state.minutes>=1440){
      state.minutes-=1440;state.day++;
      // A água agora vem somente de ordens manuais para a lagoa.
      const houseCells=[...state.house.floor,...state.house.walls].map(id=>{const [x,y]=id.split("-").map(Number);return {x,y,selected:true};});
      for(const home of state.homes.filter(h=>!h.legacy))for(const [x,y] of homeTiles(home.x,home.y))houseCells.push({x,y,selected:true});
      for(const order of state.orders.filter(o=>o.type==="buildHome"))for(const [x,y] of homeTiles(order.x,order.y))houseCells.push({x,y,selected:true});
      const births=World.regrow(state.world,state.day,W,H,[...state.plots,...houseCells]);
      if(births>0)log("A natureza renovou "+births+" pequenos elementos do vale.");
      if(state.mode==="survival"){
        state.food=Math.max(0,state.food-state.workers.length);
        log("Um novo dia começou. A equipe consumiu alimentos.");
        if(state.food===0)log("Atenção: sem comida para a equipe!");
      }else log("Um novo dia começou na fazenda tranquila.");
    }
    for(const animal of state.animals){
      animal.timer=(animal.timer||0)+scaled;
      while(animal.timer>=120){
        animal.timer-=120;
        animal.manure=Math.min(3,(animal.manure||0)+1);
      }
    }
    for(const p of state.plots)if(p.seeded&&p.watered&&p.growth<1){
      const fertility=World.terrainAt(state.world,p.x,p.y).fertility;
      p.growth=Math.min(1,p.growth+scaled/180*fertility);
    }
    recalcTasks();
    assignIdleWorkers();
    for(const w of state.workers){
      w.moving=false;
      if(!w.task)continue;
      const t=tasks.find(t=>t.id===w.task);
      if(!t){releaseSupply(w);w.task=null;w.progress=0;w.route=[];continue;}
      // Uma ordem de irrigação já autoriza buscar água; fertilizar autoriza
      // buscar esterco. Não cria ordens extras nem tira decisões do jogador.
      const fetchWater=t.type==="water"&&state.water<=0&&!w.carryingWater;
      const fetchManure=t.type==="fertilize"&&state.inventory.manure<=0&&!w.carryingManure;
      const stage=fetchWater?"water":fetchManure?"manure":null;
      if(stage&&w.neg.includes(stage==="water"?"collectWater":"collectManure")){
        releaseSupply(w);w.task=null;w.progress=0;w.route=[];w.routeTask=null;continue;
      }
      if(stage){
        if(w.supplyStage!==stage||!w.supplyTarget){
          const sources=stage==="water"?state.world.water:
            state.animals.filter(animal=>animal.manure>0).map(a=>({
              x:Math.floor(a.x),y:Math.floor(a.y)
            }));
          const reachable=sources.map(source=>({...source,route:routeBetween(w.x,w.y,source.x,source.y)}))
            .filter(source=>source.route.length>0).sort((a,b)=>a.route.length-b.route.length);
          w.supplyTarget=reachable[0]?{x:reachable[0].x,y:reachable[0].y}:null;
          w.supplyStage=stage;w.routeTask=null;w.route=[];
        }
        if(!w.supplyTarget)continue;
      }else if(w.supplyStage){w.supplyStage=null;w.supplyTarget=null;w.routeTask=null;w.route=[];}
      const goal=w.supplyTarget||t;
      const pathKey=w.task+":"+(w.supplyStage||"work")+":"+goal.x+","+goal.y;
      if(w.routeTask!==pathKey){
        w.route=routeBetween(w.x,w.y,goal.x,goal.y);
        w.workGoal=w.route[w.route.length-1]||null;
        w.routeTask=pathKey;
      }
      const target=w.route?.[0]||w.workGoal||{x:goal.x+.5,y:goal.y+.5};
      const dx=target.x-w.x,dy=target.y-w.y,d=Math.hypot(dx,dy);
      if(d>.055){
        if(Math.abs(dx)>Math.abs(dy))w.facing=dx>0?"right":"left";
        else w.facing=dy>0?"down":"up";
        const terrain=World.terrainAt(state.world,Math.floor(w.x),Math.floor(w.y));
        const distance=Math.min(d,scaled*2.65/terrain.moveCost);
        w.x+=dx/d*distance;w.y+=dy/d*distance;
        w.moving=true;w.walkFrame=(w.walkFrame||0)+distance*4.5;
        continue;
      }
      w.x=target.x;w.y=target.y;
      if(w.route?.length){w.route.shift();continue;}
      if(w.supplyStage==="water"){
        if(!World.waterAt(state.world,goal.x,goal.y))continue;
        w.carryingWater=true;w.supplyStage=null;w.supplyTarget=null;
        w.routeTask=null;w.route=[];w.workGoal=null;
        log(w.name+" encheu o balde na lagoa e está voltando para regar.");continue;
      }
      if(w.supplyStage==="manure"){
        const animal=state.animals.find(a=>Math.floor(a.x)===goal.x&&Math.floor(a.y)===goal.y&&a.manure>0);
        if(!animal){
          w.supplyTarget=null;w.routeTask=null;w.route=[];continue;
        }
        animal.manure--;w.carryingManure=true;w.supplyStage=null;w.supplyTarget=null;
        w.routeTask=null;w.route=[];w.workGoal=null;
        log(w.name+" pegou esterco e está levando até a plantação.");continue;
      }
      const loose=World.at(state.world,t.x,t.y)?.kind;
      const duration=t.type==="clear"&&["twig","pebble"].includes(loose)?18:
        t.type==="clear"&&loose==="grass"?45:baseTime[t.type];
      w.progress+=scaled*bonus(w,t.type)/duration;
      if(w.progress>=1){
        const complete=finish(w,t);
        if(complete)showMapFeedback(t.x,t.y,"#ddf2a2");
        if(complete)state.orders=state.orders.filter(order=>order.id!==t.id);
        w.task=null;w.progress=0;w.route=[];w.routeTask=null;w.workGoal=null;
        recalcTasks();
        if(complete)save();
      }
    }
  }
  function valid(img){return img&&img.complete&&img.naturalWidth>0;}
  function part(img,sx,sy,sw,sh,x,y,w=32,h=32){
    if(!img||!(valid(img)||(img instanceof HTMLCanvasElement&&img.width>0&&img.height>0)))return;
    const width=img.naturalWidth||img.width,height=img.naturalHeight||img.height;
    if(sx<0||sy<0||sw<=0||sh<=0||sx+sw>width||sy+sh>height)return;
    ctx.drawImage(img,sx,sy,sw,sh,Math.round(x),Math.round(y),Math.round(w),Math.round(h));
  }
  function write(s,x,y,color="#fff7dd",size=11){
    ctx.font="bold "+size+"px system-ui";ctx.textAlign="center";ctx.lineWidth=3;ctx.strokeStyle="#253d30";ctx.strokeText(s,x,y);ctx.fillStyle=color;ctx.fillText(s,x,y);
  }
  function draw(){
    if(!state)return;
    // Nada pré-construído: a paisagem vem do seed salvo com a partida.
    const screen=$(".canvas-scroll").getBoundingClientRect(),surface=canvas.getBoundingClientRect();
    const visibleBounds={
      x0:Math.max(0,Math.floor((screen.left-surface.left)/surface.width*W)-4),
      x1:Math.min(W-1,Math.ceil((screen.right-surface.left)/surface.width*W)+4),
      y0:Math.max(0,Math.floor((screen.top-surface.top)/surface.height*H)-4),
      y1:Math.min(H-1,Math.ceil((screen.bottom-surface.top)/surface.height*H)+4)
    };
    const inView=(x,y,margin=0)=>x>=visibleBounds.x0-margin&&x<=visibleBounds.x1+margin&&
      y>=visibleBounds.y0-margin&&y<=visibleBounds.y1+margin;
    // Limpar apenas a área visível; o minimapa é renderizado a partir dos dados
    // do mundo, então não depende do canvas completo em todos os quadros.
    ctx.clearRect(visibleBounds.x0*TILE,visibleBounds.y0*TILE,
      (visibleBounds.x1-visibleBounds.x0+1)*TILE,
      (visibleBounds.y1-visibleBounds.y0+1)*TILE);
    World.drawGround(ctx,sprite,state.world,W,H,TILE,part,visibleBounds);
    // Construções vivem no save e compartilham o mesmo atlas da referencia Godot.
    window.TillfolkHouseBuilder.draw(ctx,sprite,part,state.house,{
      building:selectedTool==="construir",layer:buildLayer,workers:state.workers,
      previewX:buildHover?.x,previewY:buildHover?.y,
      previewValid:buildHover?Boolean(getBuildEdit(buildHover.x,buildHover.y,eraseBuild).house):false
    });
    // Cabanas 2x2 são estruturas independentes, concluídas pelos trabalhadores.
    for(const home of state.homes.filter(h=>!h.legacy&&inView(h.x,h.y,4))){
      const x=home.x*TILE,y=home.y*TILE;
      part(sprite.walls,16,16,16,16,x+4,y+22,56,41);
      part(sprite.roof,16,0,16,16,x-5,y-14,74,50);
      part(sprite.roof,32,16,16,16,x+27,y-9,38,36);
      part(sprite.door,0,0,16,32,x+21,y+28,22,34);
      if(home.residentId==null)write("LIVRE",x+32,y-19,"#e5f7ae",9);
    }
    // A vegetação e os colonos são desenhados juntos, ordenados pelos pés.
    for(const p of state.plots){
      if(!inView(p.x,p.y,1)||!p.tilled&&!p.seeded&&!p.produce&&!p.dirty&&!p.fertilized)continue;
      const x=p.x*TILE,y=p.y*TILE;
      // Solo natural não recebe quadrado verde: a ordem aparece só como
      // contorno temporário. O cultivo real permanece visível após a tarefa.
      if(p.tilled||p.seeded||p.produce){
        ctx.fillStyle="#b38f6c";ctx.fillRect(x+1,y+1,TILE-2,TILE-2);
      }
      if(p.tilled)part(sprite.dirt,0,80,16,16,x,y);
      if(p.fertilized){ctx.fillStyle="#6c7652";ctx.fillRect(x+4,y+8,3,3);ctx.fillRect(x+25,y+22,2,2);}
      if(p.seeded)part(sprite.crops,Math.min(4,Math.floor(p.growth*5))*16,0,16,16,x,y,32,32);
      if(p.produce)part(sprite.crops,48,16,16,16,x,y,32,32);
      if(p.dirty&&!World.at(state.world,p.x,p.y))part(sprite.rocks,0,16,16,16,x,y,32,32);
      if(p.watered&&p.seeded){ctx.fillStyle="#6cc8e5";ctx.fillRect(x+2,y+26,4,3);}
    }
    // Marcadores discretos: ordens prontas (creme) ou aguardando (marrom).
    const markers={clear:"L",till:"A",fertilize:"F",sow:"S",water:"R",harvest:"C",carry:"T",collectWater:"💧",collectManure:"E",buildHome:"⌂"};
    const byTile=new Map();
    for(const job of tasks){
      const id=keyOf(job.x,job.y),entry=byTile.get(id)||[];
      entry.push(job);byTile.set(id,entry);
    }
    for(const [tile,jobs] of byTile){
      const [x,y]=tile.split("-").map(Number);
      if(!inView(x,y,1))continue;
      // Contorno leve apenas enquanto existe ordem ativa nessa célula.
      ctx.strokeStyle="#f4e9a3";ctx.lineWidth=1;ctx.setLineDash([4,3]);
      ctx.strokeRect(x*TILE+3,y*TILE+3,TILE-6,TILE-6);
      ctx.setLineDash([]);
      const next=jobs.find(j=>j.status==="ready")||jobs[0];
      ctx.fillStyle=next.status==="ready"?"#ecdc9b":"#ad8d68";
      ctx.fillRect(x*TILE+2,y*TILE+2,19,13);
      ctx.fillStyle="#23382b";ctx.font="bold 10px sans-serif";ctx.textAlign="left";
      ctx.fillText(markers[next.type]||"?",x*TILE+5,y*TILE+12);
      if(jobs.length>1){ctx.fillStyle="#273a2d";ctx.fillText(String(jobs.length),x*TILE+23,y*TILE+12);}
    }
    // Profundidade natural: árvores cobrem personagens atrás delas e vice-versa.
    const layers=[
      ...state.world.objects.filter(object=>inView(object.x,object.y,3))
        .map(object=>({type:"nature",object,depth:(object.y+.8)*TILE})),
      ...state.workers.filter(worker=>inView(worker.x,worker.y,3))
        .map(worker=>({type:"worker",worker,depth:worker.y*TILE})),
      ...state.animals.filter(animal=>inView(animal.x,animal.y,3))
        .map(animal=>({type:"animal",animal,depth:animal.y*TILE}))
    ].sort((a,b)=>a.depth-b.depth);
    // IMPORTANTE: as spritesheets de caminhada e ferramentas usam ordens laterais opostas.
    // Caminhada: linha 2 = direita, 3 = esquerda; trabalho: linha 2 = esquerda, 3 = direita.
    const walkingRowFor={down:0,up:1,left:3,right:2};
    const actionRowFor={down:0,up:1,left:2,right:3};
    // worker-actions.png: três grupos de quatro direções (ferramenta, corte e carga).
    const actionRow={till:0,fertilize:0,sow:0,clear:4,harvest:4,carry:8};
    for(const item of layers){
      const {x,y,type}=item;
      if(type==="nature"){
        World.drawObject(ctx,item.object,sprite,TILE,part);
      }else if(type==="animal"){
        const a=item.animal,x=a.x*TILE,y=a.y*TILE;
        part(sprite.cow,0,0,32,32,x-20,y-32,40,38);
        if(a.manure>0)write("💩 "+a.manure,x+5,y-33,"#f3dcb0",10);
      }else{
        const w=item.worker,px=w.x*TILE,py=w.y*TILE;
        if(w.carryingWater)write("💧",px+18,py-32,"#b6f3fe",13);
        if(w.carryingManure)write("💩",px+18,py-32,"#eac7a4",13);
        ctx.fillStyle="#223c3180";ctx.beginPath();ctx.ellipse(px,py-2,11,4,0,0,Math.PI*2);ctx.fill();
        const active=tasks.find(t=>t.id===w.task);
        const working=Boolean(active&&!w.moving&&w.progress>0);
        // A troca dos atlas não deve inverter a direção do personagem.
        // Parado = quadro fixo; andando = caminhada; trabalhando = ação.
        const collectingByHand=active?.type==="clear"&&
          !Prologue.toolForOrder("clear",World.at(state.world,active.x,active.y)).length;
        if(working&&!collectingByHand&&active.type!=="water"&&valid(sprite.actions)){
          const image=getWorkerSprite(w,true);
          const actionGroup=actionRow[active.type]??0;
          const actionDirection=actionRowFor[w.facing]??0;
          const frame=simSpeed===0?0:Math.floor(performance.now()/250)%2;
          part(image,frame*48,(actionGroup+actionDirection)*48,48,48,px-34,py-51,68,68);
        }else{
          const image=getWorkerSprite(w);
          const direction=walkingRowFor[w.facing]??0;
          const row=direction+(w.moving?4:0);
          const frame=w.moving?Math.floor(w.walkFrame||0)%8:0;
          part(image,frame*48+11,row*48+12,26,24,px-20,py-34,40,40);
        }
        if(!valid(sprite.premium)&&!valid(sprite.worker)){
          ctx.fillStyle=w.color;ctx.fillRect(px-10,py-30,20,27);
        }
        // A irrigação usa as gotas verdes do atlas local; não mostra pedras como água.
        if(working&&active.type==="water"&&valid(sprite.wateringFx)){
          const fxFrame=simSpeed===0?0:Math.floor(performance.now()/150)%9;
          part(sprite.wateringFx,fxFrame*48,0,48,48,px+4,py-24,48,48);
        }
        // Placa de colono com estado — mesma paleta do HUD, sem cobrir o sprite.
        const name=String(w.name||"Colono").slice(0,17);
        const moving=Boolean(w.moving),busy=Boolean(active),badgeColor=working?"#e7d27c":busy?"#91c7e5":"#abc891";
        const neighbor=state.workers.some(other=>other.id!==w.id&&
          Math.abs(other.x-w.x)<2.2&&Math.abs(other.y-w.y)<1.3);
        const nameY=py-67-(neighbor&&w.id%2?16:0);
        ctx.font="bold 10px system-ui";ctx.textAlign="center";
        const nameWidth=Math.min(118,Math.max(47,Math.ceil(ctx.measureText(name).width)+25));
        const left=Math.round(px-nameWidth/2),top=Math.round(nameY);
        ctx.fillStyle="#2c3929ef";ctx.fillRect(left,top,nameWidth,18);
        ctx.fillStyle="#b59b70";ctx.fillRect(left,top,nameWidth,2);
        ctx.fillStyle=badgeColor;ctx.fillRect(left+5,top+6,6,6);
        write(name,px+4,top+13,"#fff0ca",10);
        if(busy&&!moving){
          ctx.fillStyle="#1c3223";ctx.fillRect(Math.round(px-19),Math.round(py+5),38,7);
          ctx.fillStyle=badgeColor;ctx.fillRect(Math.round(px-18),Math.round(py+6),36*Math.min(1,w.progress),5);
        }
      }
    }
    World.drawAmbient(ctx,state.world,performance.now(),TILE);
    // Ordem sob o cursor: destaque de tile, não adiciona tarefas automaticamente.
    if(playing&&hoveredTile&&selectedTool!=="construir"&&!panPointer){
      const {x,y}=hoveredTile,validTile=x>=0&&x<W&&y>=0&&y<H;
      if(validTile){
        const px=x*TILE,py=y*TILE;
        const canOrder=Boolean(findPlot(x,y)||selectedTool==="collectWater"||selectedTool==="remover");
        ctx.fillStyle=canOrder?"#f8ec9440":"#ed8f7a33";
        ctx.fillRect(px+1,py+1,TILE-2,TILE-2);
        ctx.lineWidth=2;ctx.strokeStyle=canOrder?"#fff5b2":"#f3ae9b";
        ctx.strokeRect(px+2,py+2,TILE-4,TILE-4);
      }
    }
    // Prévia da seleção em área: cada célula fica destacada sem mudar o save.
    if(areaSelection){
      const a=areaSelection.from,b=areaSelection.to;
      const x0=Math.max(0,Math.min(a.x,b.x)),x1=Math.min(W-1,Math.max(a.x,b.x));
      const y0=Math.max(0,Math.min(a.y,b.y)),y1=Math.min(H-1,Math.max(a.y,b.y));
      ctx.fillStyle=selectionPointer?.cancel?"#ee95804d":"#e6f7ad3d";
      ctx.fillRect(x0*TILE,y0*TILE,(x1-x0+1)*TILE,(y1-y0+1)*TILE);
      ctx.lineWidth=2;ctx.strokeStyle=selectionPointer?.cancel?"#ffb19c":"#f9ed9b";
      ctx.strokeRect(x0*TILE+1,y0*TILE+1,(x1-x0+1)*TILE-2,(y1-y0+1)*TILE-2);
    }
    // Feedback breve e descartável ao concluir ou atribuir uma ordem.
    const now=performance.now();
    for(let i=feedbackParticles.length-1;i>=0;i--){
      const particle=feedbackParticles[i],elapsed=(now-particle.start)/650;
      if(elapsed>=1){feedbackParticles.splice(i,1);continue;}
      const cx=(particle.x+.5)*TILE,cy=(particle.y+.5)*TILE;
      ctx.globalAlpha=1-elapsed;
      ctx.strokeStyle=particle.color;ctx.lineWidth=2;
      ctx.strokeRect(cx-5-elapsed*10,cy-5-elapsed*10,10+elapsed*20,10+elapsed*20);
      ctx.globalAlpha=1;
    }
  }
  function refresh(){
    if(!state)return;
    const set=(id,value)=>{$(id).textContent=value;};
    set("#day",String(state.day).padStart(2,"0"));
    const m=Math.floor(state.minutes);set("#clock",String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0"));
    for(const key of ["seeds","water","food"])set("#"+key,state[key]);
    set("#worker-count",state.workers.length);set("#task-count",tasks.length);
    const manureOrderButton=$('[data-order-type="collectManure"]');
    if(manureOrderButton)manureOrderButton.hidden=state.animals.length===0;
    if($("#homes-count"))$("#homes-count").textContent=state.homes.length+"/"+state.workers.length;
    set("#hud-workers",state.workers.length);set("#hud-tasks",tasks.length);
    renderPrologue();
    $("#order-count").textContent=String(tasks.length);
    const stock=state.inventory||{};
    const inventoryItems=[
      ["wood","🪵","Madeira"],["twigs","🌿","Gravetos"],["stone","🪨","Pedra"],
      ["mushroom","🍄","Cogumelos"],["flower","🌸","Flores"],
      ["herbs","🌿","Ervas"],["grass","🌾","Fibras"],
      ["manure","💩","Esterco"]
    ];
    $("#inventory").innerHTML=inventoryItems.map(([kind,icon,label])=>
      '<div class="resource-slot" title="'+label+': '+(stock[kind]||0)+'" aria-label="'+label+': '+(stock[kind]||0)+'">'+
      '<span class="resource-art" aria-hidden="true">'+icon+'</span>'+
      '<span class="resource-amount">'+(stock[kind]||0)+'</span>'+
      '<small>'+label+'</small></div>').join("")+
      '<div class="resource-slot housing" aria-label="Moradias: '+state.homes.length+' de '+state.workers.length+'">'+
      '<span class="resource-art" aria-hidden="true">⌂</span><span class="resource-amount">'+state.homes.length+'/'+state.workers.length+'</span><small>Casas</small></div>';
    set("#farm-title",state.farmName||"Minha Fazenda");
    set("#mode-label",(state.mode==="tutorial"?"TUTORIAL GUIADO":state.mode==="relaxed"?"FAZENDA TRANQUILA":"SOBREVIVÊNCIA")+" · DIA "+state.day);
    $("#status").textContent=simSpeed===0?"Ⅱ Simulação pausada":"● Fazenda em funcionamento";
    $("#workers").innerHTML=state.workers.map(w=>{
      const t=tasks.find(t=>t.id===w.task);
      const title=w.supplyStage==="water"?"Buscando água na lagoa":
        w.carryingWater?"Levando água ao canteiro":
        w.supplyStage==="manure"?"Buscando esterco na vaca":
        w.carryingManure?"Levando esterco ao canteiro":
        t?labels[t.type]+" em ("+(t.x+1)+", "+(t.y+1)+")":idleReason(w);
      const positive=w.skills.length?w.skills.map(s=>'<span class="tag">✦ '+labels[s]+'</span>').join(""):'<span class="tag">Generalista</span>';
      const neg=w.neg.map(s=>'<span class="tag negative">✕ '+labels[s]+'</span>').join("");
      const assignedTool=t?Prologue.toolForOrder(t.type,World.at(state.world,t.x,t.y))[0]:null;
      const equipment=assignedTool&&state.tools[assignedTool]
        ?'<span class="tag">🔧 '+Prologue.RECIPES[assignedTool].label+'</span>':"";
      const factor=w.skills.length===1?"+100%":w.skills.length===2?"+60%":w.skills.length===3?"+30%":"sem bônus";
      return '<div class="worker" data-worker-state="'+(w.moving?"moving":t?"working":"idle")+'"><div class="worker-head"><canvas class="portrait worker-avatar" data-worker-avatar="'+w.id+'" width="40" height="42"></canvas><div class="worker-identity"><div class="worker-name">'+escapeHtml(w.name)+'</div><div class="worker-job">'+escapeHtml(title)+'</div><span class="worker-status">'+(w.moving?"➤ Caminhando":t?"● Em atividade":tasks.length?"⏳ Aguardando ordens compatíveis":"● Disponível")+'</span></div></div><div class="tags">'+positive+neg+equipment+'</div><div class="worker-bar" role="progressbar" aria-label="Progresso de '+escapeHtml(w.name)+'" aria-valuenow="'+Math.round(w.progress*100)+'" aria-valuemin="0" aria-valuemax="100"><i style="width:'+(w.progress*100)+'%"></i></div><div class="worker-role">Especialização: '+factor+'</div></div>';
    }).join("");
    // Ordens ativas/prontas ficam em destaque; dependências aguardando são
    // recolhidas para não ocupar toda a tela com tarefas impossíveis agora.
    const diagnose=(t)=>{
      if(t.status==="blocked")return t.reason||"Aguardando pré-requisito";
      if(t.assigned)return null;
      const possible=state.workers.filter(w=>!workerTaskBlocker(w,t));
      if(possible.length)return null;
      const blockers=state.workers.map(w=>workerTaskBlocker(w,t)).filter(Boolean);
      return blockers.every(reason=>reason.startsWith("Traço negativo"))?
        "Nenhum colono pode executar: restrições de habilidade":
        blockers.some(reason=>reason.includes("Sem caminho"))?
        "Nenhum trabalhador tem caminho livre até esta ordem":
        blockers[0]||"Nenhum trabalhador disponível";
    };
    // Cache por atualização para não repetir busca de caminho em listas grandes.
    const diagnostics=new Map(tasks.map(t=>[t.id,diagnose(t)]));
    const active=tasks.filter(t=>Boolean(t.assigned));
    const ready=tasks.filter(t=>!t.assigned&&!diagnostics.get(t.id));
    const waiting=tasks.filter(t=>!t.assigned&&Boolean(diagnostics.get(t.id)));
    const renderOrder=t=>{
      const w=state.workers.find(w=>w.id===t.assigned);
      const reason=diagnostics.get(t.id);
      const status=reason?"waiting":w?"working":"ready";
      const statusText=reason?"Aguardando":w?"Em execução":"Pronta";
      const statusDetail=reason|| (w?escapeHtml(w.name)+" · trabalhando":"Aguardando atribuição");
      const progress=w?Math.min(100,Math.max(0,Math.round(w.progress*100))):0;
      return '<div class="task order-task '+(reason?"order-blocked":"")+'" data-order-state="'+status+'">'+
        '<div class="order-task-main"><div class="order-task-title">'+
        '<span class="order-symbol" aria-hidden="true">'+icons[t.type]+'</span>'+
        '<strong>'+labels[t.type]+'</strong><span class="order-state">'+statusText+'</span></div>'+
        '<small>Terreno '+(t.x+1)+', '+(t.y+1)+' · '+escapeHtml(statusDetail)+'</small>'+
        (w?'<div class="order-progress" role="progressbar" aria-label="Progresso da tarefa" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+progress+'"><i style="width:'+progress+'%"></i></div>':'')+
        '</div><div class="order-task-controls"><b>P'+state.priorities[t.type]+'</b>'+
        '<button type="button" data-cancel-order="'+t.id+'" aria-label="Cancelar ordem '+labels[t.type]+' do terreno '+(t.x+1)+', '+(t.y+1)+'">✕</button></div></div>';
    };
    // Recalcular o painel não fecha os grupos que o jogador abriu.
    const expandedGroups=new Set([...$("#tasks").querySelectorAll('details[data-task-group][open]')]
      .map(el=>el.dataset.taskGroup));
    const now=[...active,...ready];
    const preview=now.slice(0,30).map(renderOrder).join("");
    const rest=now.length>30?'<details class="task-waiting-group" data-task-group="more"><summary>Mostrar mais '+(now.length-30)+' ordens prontas</summary>'+
      now.slice(30).map(renderOrder).join("")+'</details>':"";
    const waitingBlock=waiting.length?
      '<details class="task-waiting-group" data-task-group="waiting"><summary>⏳ '+waiting.length+
      ' aguardando recursos, desbloqueio ou caminho</summary>'+
      '<div class="task-blocked-hint">Essas ordens não são executáveis ainda. Abra para ver o motivo de cada uma; não é preciso cancelá-las.</div>'+
      waiting.slice(0,80).map(renderOrder).join("")+
      (waiting.length>80?'<p>Mais '+(waiting.length-80)+' ordens aguardando.</p>':"")+
      '</details>':"";
    const totals='<div class="task-list-summary" role="status">'+
      '<span>● '+active.length+' em execução</span><span>✓ '+ready.length+
      ' prontas</span><span>⏳ '+waiting.length+' aguardando</span></div>';
    $("#tasks").innerHTML=tasks.length?
      totals+preview+rest+waitingBlock:
      '<div class="empty">Sem ordens. Escolha um trabalho e marque o terreno. A equipe não inicia etapas automaticamente.</div>';
    for(const group of $("#tasks").querySelectorAll('details[data-task-group]')){
      if(expandedGroups.has(group.dataset.taskGroup))group.open=true;
    }
    $("#journal").innerHTML=state.journal.map(s=>'<div class="log">✧ '+escapeHtml(s)+'</div>').join("");
    drawSidebarAvatars();
  }
  function renderPriorityControls(){
    $("#priorities").innerHTML=Object.keys(labels).map(type=>{
      return '<div class="priority"><span>'+icons[type]+' '+labels[type]+'</span><div><button data-priority="'+type+'" data-delta="-1" aria-label="Diminuir prioridade de '+labels[type]+'">−</button> <strong id="priority-'+type+'">'+state.priorities[type]+'</strong> <button data-priority="'+type+'" data-delta="1" aria-label="Aumentar prioridade de '+labels[type]+'">+</button></div></div>';
    }).join("");
  }
  function updateSpeed(){
    document.querySelectorAll("[data-speed]").forEach(b=>{
      const on=Number(b.dataset.speed)===simSpeed;b.classList.toggle("chosen",on);b.setAttribute("aria-pressed",String(on));
    });
  }
  function escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  function drawSidebarAvatars(){
    for(const avatar of document.querySelectorAll(".worker-avatar")){
      const worker=state.workers.find(w=>w.id===Number(avatar.dataset.workerAvatar));
      if(worker)showStarterAvatar(avatar,worker);
    }
  }
  function htmlTags(person){
    const special=person.skills.length===1?"100%":person.skills.length===2?"60%":person.skills.length===3?"30%":"0%";
    return '<div class="tags">'+(person.skills.map(s=>'<span class="tag">✦ '+labels[s]+'</span>').join("")||'<span class="tag">Generalista</span>')+person.neg.map(s=>'<span class="tag negative">✕ '+labels[s]+'</span>').join("")+'</div><p>Bônus em cada habilidade: +'+special+'. '+person.neg.length+' restrições.</p>';
  }
  const foodHireCost=c=>4+2*Math.max(1,Math.min(3,c.skills?.length||1));
  function renderCandidates(){
    const vacant=housingVacancy();
    $("#housing-status").textContent=vacant>0
      ?"✅ "+state.homes.length+" casas, "+state.workers.length+" moradores: "+vacant+" vaga(s) livre(s)."
      :"🏠 Casas concluídas: "+state.homes.length+". Trabalhadores: "+state.workers.length+
      ". Construa mais "+(state.workers.length+1-state.homes.length)+" casa(s) com a ordem Construir casa para liberar o próximo ajudante.";
    $("#candidates").innerHTML=state.candidates.map((c,i)=>{
      return '<div class="candidate"><div class="candidate-head"><h3>🌿 '+c.name+'</h3><b>🥕 '+foodHireCost(c)+' comida</b></div>'+htmlTags(c)+'<button class="small-primary" data-hire="'+i+'" '+(state.food<foodHireCost(c)||vacant<1?"disabled":"")+'>Contratar trabalhador</button></div>';
    }).join("");
  }
  function newCandidate(){
    const types=Object.keys(labels),count=1+Math.floor(Math.random()*3);
    const skills=types.slice().sort(()=>Math.random()-.5).slice(0,count);
    const negative=types.filter(t=>!skills.includes(t)).sort(()=>Math.random()-.5).slice(0,Math.floor(Math.random()*4));
    return {name:random(names)+" "+String(Math.floor(Math.random()*90)+10),skills,neg:negative,cost:4+2*count,color:random(["#f4dfad","#badbd1","#f1c4c5","#b9cdef"]),appearance:Math.floor(Math.random()*workerPalettes.length)};
  }
  function hire(i){
    const c=state.candidates[i];
    if(!c)return;
    if(housingVacancy()<1){notify("Construa uma casa livre para o novo ajudante.");return;}
    const price=foodHireCost(c);
    if(state.food<price){notify("Comida insuficiente para a troca.");return;}
    state.food-=price;
    state.workers.push({id:state.nextWorkerId++,name:c.name,skills:[...c.skills],neg:[...c.neg],color:c.color,appearance:c.appearance??0,personalPriority:{},x:state.spawn.x,y:state.spawn.y,task:null,progress:0,facing:"down",moving:false,walkFrame:0});
    assignHomes();
    state.candidates[i]=newCandidate();
    log(c.name+" entrou para a equipe.");
    renderCandidates();refresh();save();notify(c.name+" contratado(a)!");$("#hire-dialog").close();
  }
  let plotCache={array:null,count:0,index:new Map()};
  function findPlot(x,y){
    if(!state?.plots)return null;
    const plots=state.plots;
    if(plotCache.array!==plots||plotCache.count!==plots.length){
      plotCache={array:plots,count:plots.length,
        index:new Map(plots.map(p=>[p.x+","+p.y,p]))};
    }
    return plotCache.index.get(x+","+y)||null;
  }
  function inspect(p){
    const planned=state.orders.filter(o=>o.x===p.x&&o.y===p.y);
    $("#tile-tooltip").hidden=false;
    $("#tile-tooltip").textContent="Terreno "+(p.x+1)+", "+(p.y+1)+
      " · "+World.terrainAt(state.world,p.x,p.y).name+" · "+(p.produce?"Colheita pronta":p.seeded?"Crescimento "+Math.floor(p.growth*100)+"%":p.tilled?"Solo arado":"Solo natural")+
      " · Ordens: "+(planned.length?planned.map(o=>labels[o.type]).join(" → "):"nenhuma");
  }
  function removeOrders(ids){
    if(!ids.length)return;
    const cancelled=new Set(ids);
    state.orders=state.orders.filter(o=>!cancelled.has(o.id));
    for(const worker of state.workers)if(cancelled.has(worker.task)){
      releaseSupply(worker);
      worker.task=null;worker.progress=0;worker.route=[];worker.routeTask=null;worker.workGoal=null;
    }
    hoveredTile=null;
    recalcTasks();refresh();save();
  }
  // A ferramenta universal atribui APENAS a próxima etapa ao clicar.
  // Ela nunca cria tarefas após a conclusão do trabalho.
  function nextUniversalOrder(x,y){
    const plot=findPlot(x,y);
    if(!plot||World.waterAt(state.world,x,y)||
       occupiedByHome(x,y)||window.TillfolkHouseBuilder.occupied(state.house,x,y))return null;
    if(World.at(state.world,x,y)||plot.dirty)return "clear";
    const terrain=World.terrainAt?.(state.world,x,y);
    if(terrain&&!terrain.farmable)return null;
    if(plot.produce)return "carry";
    if(plot.seeded)return plot.growth>=1?"harvest":!plot.watered?"water":null;
    if(plot.tilled)return "sow";
    return "till";
  }
  function queueAt(type,x,y){
    if(window.TillfolkHouseBuilder.occupied(state.house,x,y)||occupiedByHome(x,y)||
       (World.waterAt(state.world,x,y)&&type!=="collectWater"))return {error:"Terreno indisponível"};
    if(type==="buildHome"&&!homeSiteValid(x,y))return {error:"Casa precisa de área 2×2 livre"};
    if(type==="collectManure"&&!state.animals.some(a=>Math.floor(a.x)===x&&Math.floor(a.y)===y))
      return {error:"Selecione um animal com esterco"};
    const plot=findPlot(x,y);
    const result=Orders.add(state.orders,type,x,y,plot,World.at(state.world,x,y),state);
    if(result.error)return result;
    state.orders.push(result.order);
    if(plot&&!["buildHome","collectWater","collectManure"].includes(type))plot.selected=true;
    showMapFeedback(x,y,result.state==="blocked"?"#d4a779":"#fff5af");
    return result;
  }
  function applyToArea(from,to,forceCancel=false){
    const x0=Math.max(0,Math.min(from.x,to.x)),x1=Math.min(W-1,Math.max(from.x,to.x));
    const y0=Math.max(0,Math.min(from.y,to.y)),y1=Math.min(H-1,Math.max(from.y,to.y));
    let added=0,cancelled=0,skipped=0;
    const removals=[];
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
      if(forceCancel||selectedTool==="remover"){
        const ids=state.orders.filter(o=>o.x===x&&o.y===y).map(o=>o.id);
        removals.push(...ids);cancelled+=ids.length;continue;
      }
      const type=selectedTool==="universal"?nextUniversalOrder(x,y):selectedTool;
      if(!type||!Orders.TYPES.includes(type)){skipped++;continue;}
      const result=queueAt(type,x,y);
      if(result.error)skipped++;else added++;
    }
    if(cancelled){
      const ids=new Set(removals);
      state.orders=state.orders.filter(o=>!ids.has(o.id));
      for(const worker of state.workers)if(ids.has(worker.task)){
        releaseSupply(worker);
        worker.task=null;worker.progress=0;worker.route=[];worker.routeTask=null;worker.workGoal=null;
      }
    }
    if(added||cancelled){hoveredTile=null;recalcTasks();refresh();save();}
    $("#tile-tooltip").hidden=true;
    notify(added?added+" ordem(ns) adicionada(s)"+(skipped?" · "+skipped+" ignorada(s)":"")+"."
      :cancelled?cancelled+" ordem(ns) cancelada(s).":
      "Nenhuma ordem aplicável nesta área.");
  }
  function placeOrder(type,x,y){
    if(window.TillfolkHouseBuilder.occupied(state.house,x,y)||occupiedByHome(x,y)||
       (World.waterAt(state.world,x,y)&&type!=="collectWater")){
      notify("Terreno indisponível para ordens.");return;
    }
    if(type==="buildHome"&&!homeSiteValid(x,y)){notify("Casa precisa de uma área livre 2×2 (sem árvores, água ou plantações).");return;}
    if(type==="collectManure"&&!state.animals.some(a=>Math.floor(a.x)===x&&Math.floor(a.y)===y)){
      notify("Selecione a posição de um animal para recolher esterco.");return;
    }
    const plot=findPlot(x,y);
    const terrain=World.terrainAt(state.world,x,y);
    if(["till","fertilize","sow","water","harvest","carry"].includes(type)&&!terrain.farmable){
      notify("Não é possível cultivar em "+terrain.name.toLowerCase()+".");return;
    }
    const result=Orders.add(state.orders,type,x,y,plot,World.at(state.world,x,y),state);
    if(result.error){notify(result.error);return;}
    state.orders.push(result.order);
    showMapFeedback(x,y,result.state==="blocked"?"#d4a779":"#fff5af");
    if(plot&&type!=="buildHome"&&type!=="collectWater"&&type!=="collectManure")
      plot.selected=true; // Marcador visual, sem criar etapas automáticas.
    recalcTasks();refresh();save();
    $("#tile-tooltip").hidden=true;
    if(result.state==="blocked")notify(labels[type]+" adicionada: "+result.reason.toLowerCase()+".");
  }
  function buildCellFromEvent(event){
    const rect=canvas.getBoundingClientRect();
    return {x:Math.floor((event.clientX-rect.left)/rect.width*W),
      y:Math.floor((event.clientY-rect.top)/rect.height*H)};
  }
  function isBuildCellBusy(x,y){
    if(occupiedByHome(x,y)||World.waterAt(state.world,x,y)||World.at(state.world,x,y))return true;
    if(state.workers.some(w=>Math.max(Math.abs(Math.floor(w.x)-x),Math.abs(Math.floor(w.y)-y))<=1))return true;
    return state.plots.some(p=>p.x===x&&p.y===y&&(p.selected||p.tilled||p.seeded||p.produce));
  }
  function getBuildEdit(x,y,erase){
    if(!World.terrainAt(state.world,x,y).buildable)
      return {error:"Este bioma não permite construir nesta área."};
    if(!erase&&(state.inventory?.wood||0)<1)return {error:"Madeira insuficiente! Use os trabalhadores para recolher madeira."};
    return window.TillfolkHouseBuilder.edit(state.house,buildLayer,x,y,erase,isBuildCellBusy);
  }
  function updateBuildPanel(){
    if(!state)return;
    $("#build-stock").textContent=String(state.inventory?.wood||0);
    $("#build-floor-count").textContent=String(state.house.floor.length);
    if($("#build-homes-count"))$("#build-homes-count").textContent=String(state.homes.length);
    document.querySelectorAll("[data-build-layer]").forEach(btn=>{
      const on=btn.dataset.buildLayer===buildLayer;
      btn.classList.toggle("chosen",on);btn.setAttribute("aria-pressed",String(on));
    });
    $("#build-erase").setAttribute("aria-pressed",String(eraseBuild));
    $("#build-erase").classList.toggle("chosen",eraseBuild);
    $("#build-roof").textContent=state.house.roofHidden?"◉ Mostrar telhado":"◌ Ocultar telhado";
  }
  let cameraPanBeforeBuilding=null;
  function focusHouseCamera(){
    if(!playing||!document.body.classList.contains("play-session"))return;
    const viewport=$(".canvas-scroll").getBoundingClientRect(),bounds=canvas.getBoundingClientRect();
    if(bounds.width<=viewport.width+80)return; // Desktop: a casa ja esta visivel.
    // Não enviar o jogador para a região antiga (13,9) enquanto a casa
    // nova ainda não tiver fundação. Mantenha a câmera no centro da colônia.
    if(!state.house?.anchor)return;
    const anchor=state.house.anchor.split("-").map(Number);
    const focusX=anchor?.length===2&&Number.isFinite(anchor[0])?anchor[0]+.5:13.5;
    const houseX=(focusX*TILE/canvas.width)*bounds.width;
    worldPanX+=viewport.left+viewport.width*.5-(bounds.left+houseX);
    clampWorldPan();
  }
  function setTool(next){
    const entering=next==="construir"&&selectedTool!=="construir";
    const leaving=selectedTool==="construir"&&next!=="construir";
    if(entering)cameraPanBeforeBuilding={x:worldPanX,y:worldPanY};
    selectedTool=next;
    areaSelection=null;selectionPointer=null;
    const stage=Orders.TYPES.includes(next);
    $("#order-selected").textContent=stage?labels[next]:"Especificar";
    $("#orders-btn").classList.toggle("active",stage);
    $("#orders-btn").setAttribute("aria-pressed",String(stage));
    if(!stage){$("#orders-panel").hidden=true;$("#orders-btn").setAttribute("aria-expanded","false");}
    document.querySelectorAll("[data-tool]").forEach(btn=>{
      const on=btn.dataset.tool===next;
      btn.classList.toggle("active",on);btn.setAttribute("aria-pressed",String(on));
    });
    $("#construction-panel").hidden=next!=="construir";
    if(next==="construir")$("#orders-panel").hidden=true;
    $("#tile-tooltip").hidden=true;
    buildHover=null;
    if(next==="construir"){
      updateBuildPanel();
      if(entering)requestAnimationFrame(focusHouseCamera);
    } else if(leaving && cameraPanBeforeBuilding){
      worldPanX=cameraPanBeforeBuilding.x;worldPanY=cameraPanBeforeBuilding.y;
      cameraPanBeforeBuilding=null;clampWorldPan();
    }
  }
  function paintHouse(x,y,erase=eraseBuild){
    if(!playing||selectedTool!=="construir")return;
    const result=getBuildEdit(x,y,erase);
    if(!result.house){$("#build-status").textContent=result.error;return;}
    houseHistory.push(JSON.stringify({house:state.house,plots:state.plots,wood:state.inventory.wood}));
    if(houseHistory.length>30)houseHistory.shift();
    state.house=result.house;
    state.inventory.wood=Math.max(0,state.inventory.wood+(erase?1:-1));
    syncLegacyHome();
    if(buildLayer==="floor"){
      if(!erase)state.plots=state.plots.filter(p=>p.x!==x||p.y!==y);
      else if(!blocked(x,y)&&!state.plots.some(p=>p.x===x&&p.y===y))state.plots.push(makePlot(x,y));
    }
    state.workers.forEach(w=>{w.route=[];w.routeTask=null;});
    recalcTasks();refresh();save();updateBuildPanel();
    $("#build-status").textContent=(erase?"Removido: ":"Construído: ")+
      ({floor:"piso",walls:"parede",roof:"telhado"})[buildLayer]+" em "+(x+1)+", "+(y+1)+".";
  }
  document.querySelectorAll("[data-build-layer]").forEach(btn=>btn.addEventListener("click",()=>{
    buildLayer=btn.dataset.buildLayer;updateBuildPanel();
    $("#build-status").textContent="Camada: "+btn.textContent.trim()+". Clique para construir ou use o botão direito para apagar.";
  }));
  $("#build-erase").addEventListener("click",()=>{
    eraseBuild=!eraseBuild;updateBuildPanel();
    $("#build-status").textContent=eraseBuild?"Toque no mapa para apagar peças.":"Toque no mapa para construir.";
  });
  $("#build-roof").addEventListener("click",()=>{
    state.house.roofHidden=!state.house.roofHidden;updateBuildPanel();save();
  });
  $("#build-undo").addEventListener("click",()=>{
    const snapshot=houseHistory.pop();
    if(!snapshot){$("#build-status").textContent="Nenhuma mudança para desfazer.";return;}
    const previous=JSON.parse(snapshot);
    state.house=window.TillfolkHouseBuilder.normalize(previous.house);
    syncLegacyHome();
    state.plots=previous.plots;state.inventory.wood=previous.wood;
    state.workers.forEach(w=>{w.route=[];w.routeTask=null;});
    recalcTasks();refresh();save();updateBuildPanel();
    $("#build-status").textContent="Última alteração desfeita.";
  });
  $("#build-exit").addEventListener("click",()=>setTool("universal"));
  canvas.addEventListener("contextmenu",event=>{
    if(!playing)return;
    event.preventDefault(); // Não abrir o menu do navegador sobre o jogo.
    if(suppressRightContext){suppressRightContext=false;return;}
    const {x,y}=buildCellFromEvent(event);
    if(x<0||y<0||x>=W||y>=H)return;
    if(selectedTool==="construir"){paintHouse(x,y,true);return;}
    // Clique direito sempre cancela as ordens do terreno, não importa a
    // ferramenta selecionada. Cultivo concluído e árvores nunca são apagados.
    const ids=state.orders.filter(o=>o.x===x&&o.y===y).map(o=>o.id);
    if(ids.length){
      removeOrders(ids);notify(ids.length+" ordem(ns) cancelada(s) com botão direito.");
    }else notify("Nenhuma ordem pendente neste terreno.");
  });
  canvas.addEventListener("pointerleave",()=>{buildHover=null;hoveredTile=null;});
  document.addEventListener("keydown",event=>{
    if(!playing||event.target.closest("input,textarea,select,[contenteditable]")||document.querySelector("dialog[open]"))return;
    const k=event.key.toLowerCase();
    if(k==="b"){setTool(selectedTool==="construir"?"universal":"construir");return;}
    if(selectedTool!=="construir")return;
    if(k==="escape"){setTool("universal");return;}
    if(["1","2","3"].includes(k)){buildLayer=["floor","walls","roof"][Number(k)-1];updateBuildPanel();}
    if(k==="r"){state.house.roofHidden=!state.house.roofHidden;updateBuildPanel();save();}
    if((event.ctrlKey||event.metaKey)&&k==="z"){event.preventDefault();$("#build-undo").click();}
  });
  // Clique individual ou arraste para selecionar um retângulo de tarefas.
  // Shift+arrastar ou botão central sempre move a câmera.
  // No celular, ativar Área faz o dedo selecionar; desativar volta ao pan.
  function canSelectArea(){
    return selectedTool==="universal"||selectedTool==="remover"||Orders.TYPES.includes(selectedTool);
  }
  function pointerTile(event){
    const p=buildCellFromEvent(event);
    return {x:Math.max(0,Math.min(W-1,p.x)),y:Math.max(0,Math.min(H-1,p.y))};
  }
  $("#drag-mode").addEventListener("click",()=>{
    areaMode=!areaMode;areaSelection=null;selectionPointer=null;
    $("#drag-mode").setAttribute("aria-pressed",String(areaMode));
    $("#drag-mode").classList.toggle("chosen",areaMode);
    $("#drag-mode").textContent=areaMode?"▣ Área: ligada":"▧ Área: desligada";
  });
  // O cálculo da célula utiliza o retângulo real do canvas expandido/cortado.
  function pinchCoordinates(){
    const list=[...activeTouches.values()];
    if(list.length<2)return null;
    const [a,b]=list;
    return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,distance:Math.hypot(a.x-b.x,a.y-b.y)};
  }
  canvas.addEventListener("pointerdown",event=>{
    if(!playing||!document.body.classList.contains("play-session"))return;
    if(event.pointerType==="touch"){
      activeTouches.set(event.pointerId,{x:event.clientX,y:event.clientY});
      if(activeTouches.size===2){
        selectionPointer=null;areaSelection=null;
        const p=pinchCoordinates();
        pinchGesture={distance:p.distance,zoom:targetCameraZoom,
          anchor:captureCameraAnchor(p.x,p.y)};
        panPointer=null;suppressMapClick=true;
      }else if(activeTouches.size===1){
        suppressMapClick=false;
        if(areaMode&&canSelectArea()){
          selectionPointer={id:event.pointerId,x:event.clientX,y:event.clientY,moved:false};
          const cell=pointerTile(event);
          areaSelection={from:cell,to:cell};
          panPointer=null;
        }else{
          panPointer={id:event.pointerId,x:event.clientX,y:event.clientY,
            lastX:event.clientX,lastY:event.clientY,moved:false};
        }
      }
      canvas.setPointerCapture(event.pointerId);
      hoveredTile=null;
      return;
    }
    suppressMapClick=false;
    if((event.button===0||event.button===2)&&!event.shiftKey&&canSelectArea()){
      const cell=pointerTile(event);
      selectionPointer={id:event.pointerId,x:event.clientX,y:event.clientY,
        moved:false,cancel:event.button===2};
      areaSelection={from:cell,to:cell};hoveredTile=null;
      canvas.setPointerCapture(event.pointerId);
      return;
    }
    if(!event.shiftKey&&event.button!==1)return;
    hoveredTile=null;
    panPointer={id:event.pointerId,x:event.clientX,y:event.clientY,
      lastX:event.clientX,lastY:event.clientY,moved:false};
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove",event=>{
    if(selectionPointer&&selectionPointer.id===event.pointerId){
      const tile=pointerTile(event);
      areaSelection.to=tile;
      if(Math.hypot(event.clientX-selectionPointer.x,event.clientY-selectionPointer.y)>6)
        selectionPointer.moved=true;
      return;
    }
    if(playing&&!panPointer&&event.pointerType!=="touch")hoveredTile=buildCellFromEvent(event);
    if(playing&&selectedTool==="construir"&&!panPointer)buildHover=buildCellFromEvent(event);
    if(event.pointerType==="touch"&&activeTouches.has(event.pointerId)){
      activeTouches.set(event.pointerId,{x:event.clientX,y:event.clientY});
      if(pinchGesture&&activeTouches.size>=2){
        const p=pinchCoordinates();
        cameraAnchor={...pinchGesture.anchor,screenX:p.x,screenY:p.y};
        targetCameraZoom=clampZoom(pinchGesture.zoom*p.distance/Math.max(1,pinchGesture.distance));
        syncCameraButtons();suppressMapClick=true;
        return;
      }
    }
    if(!panPointer||panPointer.id!==event.pointerId)return;
    const dx=event.clientX-panPointer.lastX,dy=event.clientY-panPointer.lastY;
    if(Math.hypot(event.clientX-panPointer.x,event.clientY-panPointer.y)>6)panPointer.moved=true;
    if(panPointer.moved){
      cameraAnchor=null;worldPanX+=dx;worldPanY+=dy;clampWorldPan();
    }
    panPointer.lastX=event.clientX;panPointer.lastY=event.clientY;
  });
  function finishMapPan(event){
    if(selectionPointer&&selectionPointer.id===event.pointerId){
      const selection=areaSelection,moved=selectionPointer.moved;
      const cancel=event.type==="pointercancel"||pinchGesture!=null;
      // Um único toque continua produzindo o clique convencional.
      if(moved&&!cancel&&selection){
        selection.to=pointerTile(event);
        applyToArea(selection.from,selection.to,selectionPointer.cancel);
        if(selectionPointer.cancel)suppressRightContext=true;
        suppressMapClick=true;
      }
      selectionPointer=null;areaSelection=null;
      if(event.pointerType==="touch")activeTouches.delete(event.pointerId);
      if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
      return;
    }
    if(event.pointerType==="touch"){
      activeTouches.delete(event.pointerId);
      if(pinchGesture){
        suppressMapClick=true;
        if(activeTouches.size<2){pinchGesture=null;panPointer=null;}
      }
    }
    if(panPointer&&panPointer.id===event.pointerId){
      suppressMapClick=panPointer.moved||suppressMapClick;
      panPointer=null;
    }
    if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
  }
  canvas.addEventListener("pointerup",finishMapPan);
  canvas.addEventListener("pointercancel",finishMapPan);
  canvas.addEventListener("click",event=>{
    if(suppressMapClick){suppressMapClick=false;return;}
    if(!playing||!state)return;
    const rect=canvas.getBoundingClientRect(),x=Math.floor((event.clientX-rect.left)/rect.width*W),y=Math.floor((event.clientY-rect.top)/rect.height*H);
    if(selectedTool==="construir"){paintHouse(x,y);return;}
    if(window.TillfolkHouseBuilder.occupied(state.house,x,y)){notify("Esta área já faz parte da casa.");return;}
    const p=findPlot(x,y);
    if(!p&&selectedTool!=="collectWater"&&selectedTool!=="remover"){notify("Para buscar água escolha a lagoa; para outras tarefas, escolha terra.");return;}
    if(selectedTool==="inspecionar"){if(p)inspect(p);return;}
    if(selectedTool==="remover"){
      const matches=state.orders.filter(o=>o.x===x&&o.y===y).map(o=>o.id);
      if(!matches.length){notify("Nenhuma ordem nesse terreno.");return;}
      removeOrders(matches);notify(matches.length+" ordem(ns) cancelada(s).");return;
    }
    if(selectedTool==="universal"){
      const type=nextUniversalOrder(x,y);
      if(type)placeOrder(type,x,y);
      else notify("Não há uma nova etapa disponível neste terreno.");
      return;
    }
    if(Orders.TYPES.includes(selectedTool))placeOrder(selectedTool,x,y);
  });
  document.querySelectorAll("[data-tool]").forEach(b=>b.addEventListener("click",()=>setTool(b.dataset.tool)));
  $("#orders-btn").addEventListener("click",()=>{
    if(!playing)return;
    const open=$("#orders-panel").hidden;
    $("#orders-panel").hidden=!open;
    $("#orders-btn").setAttribute("aria-expanded",String(open));
  });
  document.querySelectorAll("[data-order-type]").forEach(btn=>btn.addEventListener("click",()=>{
    setTool(btn.dataset.orderType);
    document.querySelectorAll("[data-order-type]").forEach(item=>{
      const on=item===btn;item.classList.toggle("chosen",on);item.setAttribute("aria-pressed",String(on));
    });
    $("#orders-panel").hidden=true;$("#orders-btn").setAttribute("aria-expanded","false");
    notify("Ordem "+labels[btn.dataset.orderType]+": clique nos terrenos onde ela deve ser executada.");
  }));
  $("#tasks").addEventListener("click",event=>{
    const btn=event.target.closest("[data-cancel-order]");
    if(btn){removeOrders([btn.dataset.cancelOrder]);notify("Ordem cancelada.");}
  });
  document.querySelectorAll("[data-speed]").forEach(b=>b.addEventListener("click",()=>{simSpeed=Number(b.dataset.speed);updateSpeed();refresh();}));
  $("#priorities").addEventListener("click",e=>{
    const btn=e.target.closest("[data-priority]");if(!btn||!state)return;
    const type=btn.dataset.priority;
    state.priorities[type]=Math.max(1,Math.min(9,state.priorities[type]+Number(btn.dataset.delta)));
    $("#priority-"+type).textContent=state.priorities[type];save();
  });
  $("#candidates").addEventListener("click",e=>{const b=e.target.closest("[data-hire]");if(b)hire(Number(b.dataset.hire));});
  $("#hire-btn").addEventListener("click",()=>{if(!playing)return;renderCandidates();$("#hire-dialog").showModal();});

  // Tela obrigatória antes da nova partida: dois espaços de recrutamento gratuitos.
  function randomStarter(excludeNames = [], excludeAppearances = []){
    let candidate;
    do {candidate=newCandidate();}
    while(excludeNames.includes(candidate.name)||excludeAppearances.includes(candidate.appearance));
    return candidate;
  }
  function createStarterTeam(){
    const first=randomStarter();
    let other=randomStarter([first.name],[first.appearance]);
    for(let attempt=0;attempt<20&&first.neg.includes("clear")&&other.neg.includes("clear");attempt++)
      other=randomStarter([first.name],[first.appearance]);
    starters=[first,other];
    renderStarters();
    $("#starter-dialog").showModal();
  }
  // Os sprites Sprout Lands possuem quadros de 48px com margem transparente.
  // Recortar essa margem deixa o trabalhador bem maior, sem suavizar pixels.
  function showStarterAvatar(canvasEl,person){
    if(!canvasEl)return;
    const context=canvasEl.getContext("2d");if(!context)return;
    const width=canvasEl.width,height=canvasEl.height;
    context.imageSmoothingEnabled=false;context.clearRect(0,0,width,height);
    const img=getWorkerSprite(person);
    if(valid(sprite.premium)||valid(sprite.worker)){
      const side=Math.min(width*.78,height*.94);
      // A aparência vem de variações de paleta, não de linhas de animação.
      context.drawImage(img,11,10,26,27,(width-side)/2,height-side,side,side);
    }else{
      context.fillStyle=person.color||"#9bc78d";
      context.fillRect(width*.3,height*.25,width*.4,height*.5);
      context.fillStyle="#1e3529";context.textAlign="center";
      context.font="bold "+Math.floor(height*.23)+"px system-ui";
      context.fillText("✿",width/2,height*.55);
    }
  }
  function redrawStarterAvatars(){
    document.querySelectorAll(".starter-portrait,.worker-avatar").forEach(el=>{
      const person=el.dataset.slot!==undefined
        ?starters[Number(el.dataset.slot)]
        :state?.workers?.find(w=>w.id===Number(el.dataset.workerAvatar));
      if(person)showStarterAvatar(el,person);
    });
  }
  const activityDetails={
    clear:"Retira pedras e obstáculos, liberando novos espaços para o plantio.",
    till:"Prepara a terra com uma enxada para receber as próximas sementes.",
    fertilize:"Enriquece o solo antes da semeadura, preparando-o para cultivo.",
    sow:"Planta sementes em um terreno preparado.",
    water:"Mantém as plantações irrigadas durante o crescimento.",
    harvest:"Recolhe culturas maduras assim que ficam prontas.",
    carry:"Leva os produtos colhidos ao armazém e libera o canteiro."
  };
  function renderStarters(){
    const availableTasks=Object.keys(labels);
    $("#starter-slots").innerHTML=starters.map((person,index)=>{
      const count=person.skills.length;
      const bonus=count===1?100:count===2?60:count===3?30:0;
      const profile=count===1?"Especialista":count===2?"Multitalento":count===3?"Versátil":"Generalista";
      const allowed=availableTasks.length-person.neg.length;
      const skills=person.skills.length
        ?person.skills.map(type=>{
          const seconds=Math.round(baseTime[type]/bonusForCandidate(person,type));
          const description=labels[type]+': '+seconds+' segundos por ação (velocidade 1×, sem deslocamento). Bônus de +'+bonus+'% nesta especialidade.';
          return '<button type="button" class="starter-chip specialty" data-specialty-tooltip="'+escapeHtml(description)+'" aria-label="'+escapeHtml(description)+'" aria-expanded="false">'+icons[type]+' '+labels[type]+' <span aria-hidden="true" class="chip-info">ⓘ</span></button>';
        }).join("")
        :'<span class="starter-chip none">Sem especialidade · velocidade normal</span>';
      const blocked=person.neg.length
        ?person.neg.map(type=>'<span class="starter-chip negative" title="'+escapeHtml(activityDetails[type])+'">✕ '+labels[type]+'</span>').join("")
        :'<span class="starter-chip none">✓ Nenhuma restrição</span>';
      return '<article class="starter-slot" aria-label="Trabalhador inicial '+(index+1)+'">'+
        '<div class="starter-card-top"><span>TRABALHADOR 0'+(index+1)+'</span><span class="starter-kind">'+profile+'</span></div>'+
        '<div class="starter-identity"><div class="starter-avatar-frame"><canvas width="78" height="88" class="starter-portrait" data-slot="'+index+'" role="img" aria-label="Sprite de '+escapeHtml(person.name)+'"></canvas></div>'+
        '<div class="starter-person"><div class="starter-name-wrap"><label for="starter-name-'+index+'">Nome do personagem <span>✎ Editável</span></label>'+
        '<input class="starter-name-input" id="starter-name-'+index+'" data-starter-name="'+index+'" maxlength="18" value="'+escapeHtml(person.name)+'" autocomplete="off" spellcheck="false">'+
        '<small>'+count+' especialidade'+(count===1?'':'s')+' · '+person.neg.length+' restrição'+(person.neg.length===1?'':'ões')+'</small></div></div></div>'+
        '<div class="recruit-summary">'+
        '<div><span>Bônus nas especialidades</span><strong>+'+bonus+'%</strong></div>'+
        '<div><span>Tarefas permitidas</span><strong>'+allowed+'/'+availableTasks.length+'</strong></div></div>'+
        '<div class="starter-highlights">'+
        '<section aria-label="Especialidades de '+escapeHtml(person.name)+'"><h3 class="starter-highlight-heading">✦ Especialidades <small>'+count+'</small></h3><div class="starter-chip-list">'+skills+'</div></section>'+
        '<section aria-label="Restrições de '+escapeHtml(person.name)+'"><h3 class="starter-highlight-heading">✕ Não pode realizar <small>'+person.neg.length+'</small></h3><div class="starter-chip-list">'+blocked+'</div></section>'+
        '</div>'+
        '<button class="starter-reroll" type="button" data-reroll="'+index+'" aria-label="Sortear outro trabalhador para a posição '+(index+1)+'">↻ Trocar este trabalhador</button>'+
        '</article>';
    }).join("");
    hideSpecialtyTooltip();
    redrawStarterAvatars();
  }
  function bonusForCandidate(person,type){
    if(!person.skills.includes(type))return 1;
    return person.skills.length===1?2:person.skills.length===2?1.6:1.3;
  }
  // Tooltip único fora do conteúdo rolável. Mouse, teclado e toque compartilham
  // o mesmo texto; não exige biblioteca nem usa sprites externos.
  const specialtyTooltip=$("#starter-specialty-tooltip");
  let activeSpecialty=null, pinnedSpecialty=false;
  function hideSpecialtyTooltip(force=false){
    if(pinnedSpecialty&&!force)return;
    if(activeSpecialty?.isConnected)activeSpecialty.setAttribute("aria-expanded","false");
    activeSpecialty=null;pinnedSpecialty=false;specialtyTooltip.hidden=true;
  }
  function showSpecialtyTooltip(button,pinned=false){
    if(!button||!button.isConnected)return;
    if(activeSpecialty&&activeSpecialty!==button)activeSpecialty.setAttribute("aria-expanded","false");
    activeSpecialty=button;pinnedSpecialty=pinned;
    specialtyTooltip.textContent=button.dataset.specialtyTooltip||"";
    specialtyTooltip.hidden=false;
    button.setAttribute("aria-expanded",String(pinned));
    // Posicionamento em coordenadas da viewport, sem recorte pelo scroll dos cards.
    specialtyTooltip.style.left="0px";
    specialtyTooltip.style.top="0px";
    const rect=button.getBoundingClientRect();
    const dialog=$("#starter-dialog").getBoundingClientRect();
    const width=specialtyTooltip.offsetWidth,height=specialtyTooltip.offsetHeight;
    // Mantém a dica dentro da janela, inclusive nos cantos do desktop.
    const minX=Math.max(10,dialog.left+10);
    const maxX=Math.max(minX,Math.min(innerWidth-width-10,dialog.right-width-10));
    const left=Math.max(minX,Math.min(maxX,rect.left+rect.width/2-width/2));
    const topLimit=Math.max(8,dialog.top+8);
    const bottomLimit=Math.min(innerHeight-8,dialog.bottom-8);
    const above=rect.top-height-10;
    const top=above>=topLimit?above:
      Math.max(topLimit,Math.min(bottomLimit-height,rect.bottom+10));
    specialtyTooltip.style.left=Math.round(left)+"px";
    specialtyTooltip.style.top=Math.round(top)+"px";
  }
  $("#starter-slots").addEventListener("pointerover",event=>{
    if(event.pointerType!=="mouse"&&event.pointerType!=="pen")return;
    const chip=event.target.closest(".starter-chip.specialty");
    if(chip&&(!activeSpecialty||!pinnedSpecialty))showSpecialtyTooltip(chip);
  });
  $("#starter-slots").addEventListener("pointerout",event=>{
    if(event.pointerType!=="mouse"&&event.pointerType!=="pen")return;
    const chip=event.target.closest(".starter-chip.specialty");
    if(chip&&!chip.contains(event.relatedTarget))hideSpecialtyTooltip();
  });
  $("#starter-slots").addEventListener("focusin",event=>{
    const chip=event.target.closest(".starter-chip.specialty");
    if(chip)showSpecialtyTooltip(chip);
  });
  $("#starter-slots").addEventListener("focusout",event=>{
    const chip=event.target.closest(".starter-chip.specialty");
    if(chip)hideSpecialtyTooltip();
  });
  $("#starter-slots").addEventListener("click",event=>{
    const chip=event.target.closest(".starter-chip.specialty");
    if(!chip)return;
    if(activeSpecialty===chip&&pinnedSpecialty)hideSpecialtyTooltip(true);
    else showSpecialtyTooltip(chip,true);
  });
  document.addEventListener("pointerdown",event=>{
    if(!event.target.closest(".starter-chip.specialty"))hideSpecialtyTooltip(true);
  });
  document.addEventListener("keydown",event=>{
    if(event.key==="Escape"&&activeSpecialty){
      event.preventDefault(); // Primeiro fecha a dica, não a janela de recrutamento.
      hideSpecialtyTooltip(true);
    }
  });
  $(".starter-content").addEventListener("scroll",()=>hideSpecialtyTooltip(true),{passive:true});
  $("#starter-dialog").addEventListener("close",()=>hideSpecialtyTooltip(true));
  // Atualização dos avatares ao carregar atlas feita pelo sistema de paletas.
  $("#starter-slots").addEventListener("click",event=>{
    const btn=event.target.closest("[data-reroll]");if(!btn)return;
    const i=Number(btn.dataset.reroll);
    starters[i]=randomStarter(starters.filter((_,idx)=>idx!==i).map(c=>c.name),starters.filter((_,idx)=>idx!==i).map(c=>c.appearance));
    renderStarters();
  });
  $("#starter-slots").addEventListener("change",event=>{
    const field=event.target.closest("[data-starter-name]");
    if(!field)return;
    const index=Number(field.dataset.starterName);
    const requested=field.value.trim().slice(0,18);
    const validName=requested||starters[index].name;
    const other=starters[1-index];
    if(other&&validName.toLocaleLowerCase()===other.name.toLocaleLowerCase()){
      notify("Os dois trabalhadores precisam ter nomes diferentes.");
      field.value=starters[index].name;
      return;
    }
    starters[index].name=validName;field.value=validName;
  });
  $("#starter-reroll-all").addEventListener("click",()=>{
    const first=randomStarter();starters=[first,randomStarter([first.name],[first.appearance])];renderStarters();
  });
  $("#starter-confirm").addEventListener("click",()=>{
    if(starters.length!==2||starters[0].name===starters[1].name)return;
    if(starters.every(person=>person.neg.includes("clear"))){
      notify("Escolha pelo menos um trabalhador que possa Limpar e recolher recursos.");return;
    }
    const selected=starters.map(c=>({name:c.name,skills:[...c.skills],neg:[...c.neg],color:c.color,appearance:c.appearance}));
    const farmName=$("#farm-name").value.trim().slice(0,32)||"Vale do Amanhecer";
    $("#starter-dialog").close();start(false,selected,{mode:pendingMode,farmName});renderPriorityControls();
  });

  // Gerenciamento inspirado no fluxo de simulações de colônia, com regras próprias.
  function openManagement(tab){
    if(!playing)return;
    managementTab=tab;
    managementWorker=state.workers.some(w=>w.id===managementWorker)?managementWorker:state.workers[0]?.id??null;
    speedBeforeManagement=simSpeed;
    simSpeed=0;updateSpeed();refresh();
    renderManagement();
    $("#management-dialog").showModal();
  }
  function renderManagement(){
    document.querySelectorAll("[data-management-tab]").forEach(b=>b.setAttribute("aria-selected",String(b.dataset.managementTab===managementTab)));
    const target=$("#management-body");
    if(managementTab==="priorities"){
      const types=Object.keys(labels);
      target.innerHTML='<p class="management-explainer">Defina as atividades preferidas de cada trabalhador (1–9). As prioridades globais continuam valendo para toda a fazenda. A especialidade aumenta a velocidade; traços negativos bloqueiam completamente a tarefa.</p>'+
        '<div class="matrix-scroll"><table class="priority-matrix"><thead><tr><th>Trabalhador</th>'+
        types.map(type=>'<th>'+icons[type]+' '+labels[type]+'</th>').join("")+
        '</tr></thead><tbody>'+state.workers.map(w=>
          '<tr><td><span class="matrix-worker-name">'+escapeHtml(w.name)+'</span><span class="matrix-worker-info">'+(w.skills.length?'+ '+(w.skills.length===1?'100':w.skills.length===2?'60':'30')+'% especialização':'Generalista')+'</span></td>'+
          types.map(type=>{
            if(w.neg.includes(type))return '<td><span class="matrix-forbidden" title="Proibido por traço negativo">✕ Bloqueado</span></td>';
            const priority=w.personalPriority?.[type]??5;
            const special=w.skills.includes(type);
            return '<td><div class="matrix-cell">'+
              '<button type="button" data-worker-priority="'+w.id+'" data-work-type="'+type+'" data-work-delta="-1" aria-label="Diminuir '+labels[type]+' de '+escapeHtml(w.name)+'" '+(priority<=1?'disabled':'')+'>−</button>'+
              '<strong class="'+(special?'special':'')+'">'+priority+(special?' ✦':'')+'</strong>'+
              '<button type="button" data-worker-priority="'+w.id+'" data-work-type="'+type+'" data-work-delta="1" aria-label="Aumentar '+labels[type]+' de '+escapeHtml(w.name)+'" '+(priority>=9?'disabled':'')+'>+</button>'+
              '</div></td>';
          }).join("")+'</tr>').join("")+'</tbody></table></div>'+
          '<p class="matrix-legend">✦ Especialidade · ✕ Atividade proibida · 9 = preferência máxima. Os trabalhadores podem realizar todas as atividades não proibidas.</p>';
    } else {
      const worker=state.workers.find(w=>w.id===managementWorker)||state.workers[0];
      if(!worker){target.innerHTML='<p>Sem trabalhadores. Contrate uma equipe.</p>';return;}
      const percentage=worker.skills.length===1?100:worker.skills.length===2?60:worker.skills.length===3?30:0;
      target.innerHTML='<p class="management-explainer">Especialidades são bônus de eficiência e não desbloqueios de atividades. Quanto menos especialidades, mais rápido o trabalhador executa cada uma delas.</p>'+
        '<div class="skills-view"><nav class="skills-roster" aria-label="Selecionar trabalhador">'+
        state.workers.map(w=>'<button type="button" data-select-worker="'+w.id+'" class="'+(worker.id===w.id?'active':'')+'">'+escapeHtml(w.name)+'<br><small>'+w.skills.length+' especialidades</small></button>').join("")+
        '</nav><section class="skills-detail"><h3>✦ '+escapeHtml(worker.name)+'</h3>'+
        '<p>'+worker.skills.length+' habilidade(s) positiva(s) · '+worker.neg.length+' restrição(ões) · bônus de +'+percentage+'% nas especialidades.</p>'+
        '<div class="skills-grid">'+Object.keys(labels).map(type=>{
          const forbidden=worker.neg.includes(type),special=worker.skills.includes(type);
          const label=forbidden?'Bloqueado':special?'+'+percentage+'% de velocidade':'Velocidade normal';
          const time=forbidden?'—':Math.ceil(baseTime[type]/bonus(worker,type))+' s / ação';
          return '<div class="'+(forbidden?'skill-locked':'')+'"><span>'+icons[type]+' '+labels[type]+'</span><strong>'+label+'</strong><small>'+time+'</small></div>';
        }).join("")+'</div>'+
        '<p>A progressão e a árvore de habilidades poderão ser adicionadas futuramente. Nesta versão, as especialidades são definidas no recrutamento.</p></section></div>';
    }
  }
  $("#management-body").addEventListener("click",e=>{
    const inc=e.target.closest("[data-worker-priority]");
    if(inc){
      const worker=state.workers.find(w=>w.id===Number(inc.dataset.workerPriority));
      if(!worker)return;
      const type=inc.dataset.workType;
      if(!Object.hasOwn(labels,type)||worker.neg.includes(type))return;
      worker.personalPriority=worker.personalPriority||{};
      worker.personalPriority[type]=Math.max(1,Math.min(9,(worker.personalPriority[type]??5)+Number(inc.dataset.workDelta)));
      renderManagement();save();return;
    }
    const selector=e.target.closest("[data-select-worker]");
    if(selector){managementWorker=Number(selector.dataset.selectWorker);renderManagement();}
  });
  document.querySelectorAll("[data-management-tab]").forEach(btn=>btn.addEventListener("click",()=>{managementTab=btn.dataset.managementTab;renderManagement();}));
  $("#nav-priorities").addEventListener("click",()=>openManagement("priorities"));
  $("#nav-skills").addEventListener("click",()=>openManagement("skills"));
  $("#management-dialog").addEventListener("close",()=>{
    if(playing){simSpeed=speedBeforeManagement;updateSpeed();refresh();save();}
  });
  $("#new-game").addEventListener("click",()=>$("#mode-dialog").showModal());
  $("#mode-dialog").addEventListener("click",event=>{
    const btn=event.target.closest("[data-game-mode]");
    if(!btn)return;
    pendingMode=btn.dataset.gameMode;
    $("#mode-dialog").close();
    createStarterTeam();
  });
  $("#continue").addEventListener("click",()=>{start(true);renderPriorityControls();});
  $("#help-btn").addEventListener("click",()=>$("#help-dialog").showModal());
  $("#help-close").addEventListener("click",()=>$("#help-dialog").close());
  const sidebar=$("#farm-sidebar"),backdrop=$("#drawer-backdrop");
  let drawerReturnFocus=null;
  function closeDrawer(){
    document.body.classList.remove("drawer-open");
    sidebar.inert=true;sidebar.setAttribute("aria-hidden","true");backdrop.hidden=true;
    $("#open-workers").setAttribute("aria-expanded","false");
    $("#open-tasks").setAttribute("aria-expanded","false");
  }
  function openDrawer(section){
    if(!playing)return;
    drawerReturnFocus=document.activeElement;
    document.body.classList.add("drawer-open");sidebar.inert=false;
    sidebar.setAttribute("aria-hidden","false");backdrop.hidden=false;
    $("#open-workers").setAttribute("aria-expanded","true");
    $("#open-tasks").setAttribute("aria-expanded","true");
    requestAnimationFrame(()=>{
      sidebar.scrollTop=section==="tasks"?$("#tasks").getBoundingClientRect().top-sidebar.getBoundingClientRect().top+sidebar.scrollTop-90:0;
      $("#drawer-close").focus({preventScroll:true});
    });
  }
  $("#open-workers").addEventListener("click",()=>openDrawer("workers"));
  $("#open-tasks").addEventListener("click",()=>openDrawer("tasks"));
  function dismissDrawer(){closeDrawer();if(drawerReturnFocus?.isConnected)drawerReturnFocus.focus({preventScroll:true});}
  $("#drawer-close").addEventListener("click",dismissDrawer);
  backdrop.addEventListener("click",dismissDrawer);
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&document.body.classList.contains("drawer-open")){dismissDrawer();}});
  // As opções preservam a partida e pausam enquanto a janela está aberta.
  const optionsDialog=$("#game-options-dialog"),stockDialog=$("#game-stock-dialog");
  const fullMapDialog=$("#full-map-dialog"),fullMapCanvas=$("#full-map-canvas");
  let speedBeforeOptions=1;
  function showGameDialog(d){
    if(!playing||d.open)return;
    if(optionsDialog.open)optionsDialog.close();
    d.showModal();
  }
  function drawFullMap(){
    if(!state)return;
    const mapCtx=fullMapCanvas.getContext("2d");
    mapCtx.imageSmoothingEnabled=false;
    const tileW=fullMapCanvas.width/W,tileH=fullMapCanvas.height/H;
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      const biome=World.biomeAt(state.world,x,y);
      mapCtx.fillStyle=window.TillfolkBiomes.COLORS[biome]||"#a4d17c";
      mapCtx.fillRect(Math.floor(x*tileW),Math.floor(y*tileH),Math.ceil(tileW)+1,Math.ceil(tileH)+1);
    }
    mapCtx.fillStyle="#669eae";
    for(const tile of state.world.water||[])mapCtx.fillRect(tile.x*tileW,tile.y*tileH,tileW+1,tileH+1);
    mapCtx.fillStyle="#305c34";
    for(const tree of state.world.objects||[])if(["tree","thicket"].includes(tree.kind))
      mapCtx.fillRect(tree.x*tileW,tree.y*tileH,Math.max(2,tileW*.75),Math.max(2,tileH*.75));
    mapCtx.fillStyle="#ffe7a1";
    for(const worker of state.workers){
      mapCtx.fillRect(worker.x*tileW-3,worker.y*tileH-3,7,7);
      mapCtx.strokeStyle="#314e32";mapCtx.strokeRect(worker.x*tileW-3,worker.y*tileH-3,7,7);
    }
  }
  function openFullMap(){showGameDialog(fullMapDialog);drawFullMap();}
  $("#menu-btn").addEventListener("click",()=>{
    if(!playing||optionsDialog.open)return;
    save();closeDrawer();
    speedBeforeOptions=simSpeed;simSpeed=0;updateSpeed();
    optionsDialog.showModal();
  });
  optionsDialog.addEventListener("close",()=>{
    if(playing){simSpeed=speedBeforeOptions;updateSpeed();}
  });
  $("#game-resume").addEventListener("click",()=>optionsDialog.close());
  $("#open-stock").addEventListener("click",()=>showGameDialog(stockDialog));
  $("#game-open-stock").addEventListener("click",()=>showGameDialog(stockDialog));
  $("#open-full-map").addEventListener("click",openFullMap);
  $("#game-open-map").addEventListener("click",openFullMap);
  $("#full-map-close").addEventListener("click",()=>fullMapDialog.close());
  fullMapCanvas.addEventListener("click",event=>{
    const bounds=fullMapCanvas.getBoundingClientRect();
    const x=(event.clientX-bounds.left)/bounds.width*W;
    const y=(event.clientY-bounds.top)/bounds.height*H;
    fullMapDialog.close();focusCameraAt(x,y);paintMinimap();
  });
  $("#game-return-title").addEventListener("click",()=>{
    optionsDialog.close();
    save();playing=false;closeDrawer();setTool("universal");
    document.body.classList.remove("play-session","focus-game");
    canvas.style.removeProperty("--pan-x");canvas.style.removeProperty("--pan-y");
    cameraZoom=1;targetCameraZoom=1;cameraAnchor=null;movementKeys.clear();syncCameraButtons();
    if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});
    $(".app-shell").inert=true;$("#menu").hidden=false;
    $("#continue").disabled=!localStorage.getItem(SAVE_KEY);
    $("#new-game").focus({preventScroll:true});
    requestAnimationFrame(fitWorldCanvas);
  });
  $("#continue").disabled=!localStorage.getItem(SAVE_KEY);
  $("#focus-game").setAttribute("aria-pressed","false");
  $("#focus-game").addEventListener("click",async()=>{
    try{
      if(document.fullscreenElement)await document.exitFullscreen();
      else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();
      else notify("Use F11 no navegador para ativar a tela cheia.");
    }catch{notify("O navegador bloqueou a tela cheia. Experimente F11.");}
  });
  document.addEventListener("fullscreenchange",()=>{
    const full=Boolean(document.fullscreenElement);
    $("#focus-game").setAttribute("aria-pressed",String(full));
    $("#focus-game").textContent=full?"⛶ Sair da tela cheia":"⛶ Tela cheia";
    requestAnimationFrame(fitWorldCanvas);
  });
  $(".app-shell").inert=!$("#menu").hidden;
  reset();renderPriorityControls();recalcTasks();refresh();
  function loop(now){
    const dt=last?Math.min((now-last)/1000,.07):0;last=now;
    if(playing){
      step(dt);uiAccumulator+=dt;saveAccumulator+=dt;
      if(uiAccumulator>.3){refresh();uiAccumulator=0;}
      if(saveAccumulator>8){save();saveAccumulator=0;}
    }
    updateCamera(now);
    draw();
    if(playing&&now-lastMinimapFrame>350){paintMinimap();lastMinimapFrame=now;}
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(fitWorldCanvas);
  requestAnimationFrame(loop);
})();