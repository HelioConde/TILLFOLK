"use strict";
(() => {
  const TILE = 32, W = 192, H = 120, BASE_W=28, BASE_H=18, SAVE_KEY = "tillfolk-v01", SESSION_KEY = "tillfolk-session-mode";
  const Contracts=window.TillfolkContracts,Council=window.TillfolkCouncil;
  if(!Council)throw new Error("Carregue src/colony-council.js antes de src/game.js.");
  if(!Contracts)throw new Error("Carregue src/colony-contracts.js antes do motor TILLFOLK.");
  const Exploration=window.TillfolkExploration,Progression=window.TillfolkProgression,
    Space=window.TillfolkSpace,Minerals=window.TillfolkMinerals;
  if(!Minerals)throw new Error("Carregue src/mineral-progression.js antes do motor TILLFOLK.");
  if(!Space)throw new Error("Carregue src/space-program.js antes de src/game.js.");
  if(!Progression)throw new Error("Carregue src/progression.js antes do motor TILLFOLK.");
  if(!Exploration)throw new Error("Carregue src/exploration.js antes do motor TILLFOLK.");
  const World=window.TillfolkWild,Orders=window.TillfolkOrders,Missions=window.TillfolkMissions,Crops=window.TillfolkCrops,Crafting=window.TillfolkCrafting,Survival=window.TillfolkSurvival,Logistics=window.TillfolkLogistics,Night=window.TillfolkDayNight,Life=window.TillfolkColonyLife;
  const Food=window.TillfolkFoodLedger;
  if(!Food)throw new Error("Carregue src/food-ledger.js antes do motor TILLFOLK.");
  if(!Crops)throw new Error("Carregue src/crop-catalog.js antes do motor TILLFOLK.");
  if(!Crafting)throw new Error("Carregue src/crafting.js antes do motor TILLFOLK.");
  if(!Missions)throw new Error("Carregue src/missions.js antes do motor TILLFOLK.");
  if(!Orders)throw new Error("Carregue src/task-orders.js antes do motor TILLFOLK.");
  if(!Survival)throw new Error("Carregue src/survival.js antes do motor TILLFOLK.");
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
  let blockedAttempt=null;
  const reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)");
  const animationsEnabled=()=>window.TillfolkPreferences?.animationsEnabled?.()??!reducedMotion.matches;
  function showMapFeedback(x,y,color="#f4df9e"){
    if(!animationsEnabled())return;
    feedbackParticles.push({x,y,color,start:performance.now()});
    if(feedbackParticles.length>22)feedbackParticles.shift();
  }
  const pickupEffects=[],pickupHistory=[];
  const chestImage=new Image();chestImage.src=Logistics.CHEST_SPRITE;
  const pickupTypes={
    chest:{icon:"🧰",name:"Baú"},twigs:{icon:"🌿",name:"Graveto"},grass:{icon:"🌾",name:"Fibra"},
    stone:{icon:"🪨",name:"Pedra"},gravel:{icon:"🪨",name:"Cascalho"},
    bronze:{icon:"🥉",name:"Bronze"},iron:{icon:"⚙️",name:"Ferro"},
    gold:{icon:"🟨",name:"Ouro"},diamond:{icon:"💎",name:"Diamante"},
    bauxite:{icon:"🔶",name:"Bauxita"},aluminumAlloy:{icon:"🔩",name:"Liga de alumínio"},
    goldCircuit:{icon:"🔌",name:"Circuito condutor"},wood:{icon:"🪵",name:"Madeira"},
    seed:{icon:"🌱",name:"Semente"},food:{icon:"🥕",name:"Comida"},
    water:{icon:"💧",name:"Água"},manure:{icon:"💩",name:"Esterco"},
    mushroom:{icon:"🍄",name:"Cogumelo"},flower:{icon:"🌸",name:"Flor"},
    herbs:{icon:"🌿",name:"Erva"},crop:{icon:"🥕",name:"Colheita"}
  };
  function showPickup(x,y,key,amount=1){
    const quantity=Number(amount)||1;if(quantity<=0)return;
    const kind=pickupTypes[key]||{icon:"📦",name:"Item"};
    const item={x,y,key,quantity,icon:kind.icon,name:kind.name,start:performance.now()};
    pickupHistory.unshift(item);pickupHistory.length=Math.min(8,pickupHistory.length);
    if(animationsEnabled()){pickupEffects.push(item);if(pickupEffects.length>28)pickupEffects.shift();}
  }
  function renderPickupHistory(){
    const container=$("#pickup-feed");if(!container)return;
    const current=performance.now();
    const latest=pickupHistory.filter(item=>current-item.start<5500).slice(0,5);
    container.hidden=!playing||latest.length===0;
    if(latest.length)container.innerHTML='<strong class="pickup-heading">🎒 COLETADO AGORA</strong>'+
      latest.map(item=>'<div class="pickup-entry"><span>'+item.icon+'</span><span>+'+item.quantity+' '+item.name+'</span></div>').join("");
  }
  function taskDuration(task){
    if(task.type==="buildRocket")return Space.STAGES[task.stage]?.work||150;
    if(task.type==="craftTool")return 45;
    if(task.type==="clear"){
      const object=World.at(state.world,task.x,task.y);
      // Recolher pequenos itens à mão é bem diferente de cortar uma árvore.
      if(object&&["twig","pebble","mushroom","flowers","herbs"].includes(object.kind))return 4;
      if(object?.kind==="grass")return 9;
    }
    return baseTime[task.type]||90;
  }
  const handPickup=task=>task?.type==="clear"&&
    ["twig","pebble","mushroom","flowers","herbs","grass"].includes(World.at(state.world,task.x,task.y)?.kind);
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
    const fraction=animationsEnabled()?1-Math.exp(-dt/95):1;
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
    // As pontes ficam legíveis no minimapa, inclusive após restaurar o save.
    miniCtx.fillStyle="#d6ad75";
    for(const tile of state.world.crossings||[])miniCtx.fillRect(
      Math.floor(tile.x*pixelWidth),Math.floor(tile.y*pixelHeight),
      Math.max(1,Math.ceil(pixelWidth)),Math.max(1,Math.ceil(pixelHeight)));
    miniCtx.fillStyle="#f3ddb2";
    for(const animal of state.animals||[])if(animal.wild)miniCtx.fillRect(
      Math.floor(animal.x*pixelWidth),Math.floor(animal.y*pixelHeight),
      Math.max(1,Math.ceil(pixelWidth)),Math.max(1,Math.ceil(pixelHeight)));
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
    rocks:A+"environment/forageables.png",
    bridge:"./public/assets/Sprout Lands - Sprites - premium pack/Sprout Lands - Sprites - premium pack/Tilesets/Building parts/Wooden_Bridge_v2.png",
    workstation:"./public/assets/Sprout Lands - Sprites - premium pack/Sprout Lands - Sprites - premium pack/Objects/work station.png"
  };
  const sprite = {};
  // Atlas premium de terrenos: imagens locais do projeto.
  const TerrainCatalog=window.TillfolkTerrainCatalog;
  for(const key of Object.keys(TerrainCatalog?.ATLAS||{}))
    spriteUrls["terrain_"+key]=TerrainCatalog.url(key);
  // Animações direcionais locais: imagens carregadas uma única vez.
  for(const entry of Exploration.spriteSources())
    spriteUrls[entry.key]=entry.url;
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
  const labels = {buildWell:"Construir poço",buildChest:"Construir baú",craftTool:"Fabricar",clear:"Limpar",till:"Arar",fertilize:"Fertilizar",sow:"Semear",water:"Regar",harvest:"Colher",carry:"Transportar",collectWater:"Buscar água",collectManure:"Recolher esterco",buildHome:"Construir casa",buildStation:"Montar oficina"};
  const icons = {buildWell:"🚰",buildChest:"🧰",craftTool:"⚒️",clear:"🪓",till:"⛏️",fertilize:"🌿",sow:"🌱",water:"💧",harvest:"🥕",carry:"📦",collectWater:"🪣",collectManure:"🐄",buildHome:"🏠",buildStation:"🛠️"};
  const baseTime = {buildWell:150,buildChest:120,craftTool:45,clear:120,till:90,fertilize:60,sow:60,water:90,harvest:120,carry:60,collectWater:65,collectManure:45,buildHome:180,buildStation:150};
  const startPriorities = {buildWell:6,buildChest:6,craftTool:7,clear:7,till:6,fertilize:5,sow:6,water:8,harvest:9,carry:8,collectWater:7,collectManure:5,buildHome:7,buildStation:6};
  // Homenagem à Simone misturada a nomes brasileiros e apelidos divertidos.
  // Nomes novos são sorteados; não renomeamos saves com nomes personalizados.
  const names=[
    "Sim","Mônica","Luna","Simo","Manu","Mone","Flávia","Moni",
    "João","Mona","Ana","Simi","Pedro","Simona","Júlia","Monê",
    "Maria","Mimo","Duda","Simone","Rafa","Siminha","Bruna","Zezinho",
    "Caio","Simônica","Bia","Môniquinha","José","Lia","Gabi","Toninho",
    "Nanda","Luiza","Chico","Clara","Zeca","Tati","Nina","Juca"
  ];
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
    {name:"Mônica",skills:["till","sow","harvest"],neg:["fertilize"],cost:10,color:"#d3d6fc"},
    {name:"Manu",skills:["carry","fertilize"],neg:[],cost:8,color:"#ffcfc5"}
  ];
  const HOME_WOOD_COST=8;
  const TUTORIAL_TILL_STATION_GAP=4;
  const homeTiles=(x,y)=>[[x,y],[x+1,y],[x,y+1],[x+1,y+1]];
  function occupiedByHome(x,y){
    return Boolean(state?.homes?.some(h=>!h.legacy&&x>=h.x&&x<=h.x+1&&y>=h.y&&y<=h.y+1));
  }
  function occupiedByStation(x,y){
    return Boolean(state?.workstations?.some(ws=>ws.x===x&&ws.y===y)||state?.crafting?.station?.x===x&&state?.crafting?.station?.y===y);
  }
  function occupiedByRocket(x,y){
    const pad=state?.rocket?.site||
      state?.orders?.find(order=>order.type==="buildRocket");
    return Boolean(pad&&x>=pad.x&&x<pad.x+Space.FOOTPRINT&&
      y>=pad.y&&y<pad.y+Space.FOOTPRINT);
  }
  function stationSiteValid(x,y){
    if(!state||state.workstations?.length||state.crafting?.station||x<2||y<2||x>=W-2||y>=H-2)return false;
    const plot=findPlot(x,y);
    return Boolean(plot&&World.terrainAt(state.world,x,y).buildable&&
      !plot.dirty&&!plot.seeded&&!plot.produce&&!plot.tilled&&
      !World.waterAt(state.world,x,y)&&!World.at(state.world,x,y)&&
      !window.TillfolkHouseBuilder.occupied(state.house,x,y)&&
      !occupiedByHome(x,y)&&!occupiedByStation(x,y)&&!occupiedByRocket(x,y)&&
      !state.chests?.some(c=>c.x===x&&c.y===y)&&!state.wells?.some(c=>c.x===x&&c.y===y)&&
      !state.orders.some(order=>order.x===x&&order.y===y&&order.type!=="buildStation"));
  }
  function tutorialTillSitePreferred(x,y){
    const station=state?.crafting?.station||state?.workstations?.[0];
    return !station||Math.hypot(x-station.x,y-station.y)>=TUTORIAL_TILL_STATION_GAP;
  }
  function chestSiteValid(x,y){
    return x>=2&&y>=2&&x<W-2&&y<H-2&&Boolean(findPlot(x,y))&&
      World.terrainAt(state.world,x,y).buildable&&
      !World.at(state.world,x,y)&&!World.waterAt(state.world,x,y)&&
      !occupiedByStation(x,y)&&!occupiedByHome(x,y)&&!occupiedByRocket(x,y)&&
      !window.TillfolkHouseBuilder.occupied(state.house,x,y)&&
      !state.chests?.some(c=>c.x===x&&c.y===y)&&
      !state.wells?.some(c=>c.x===x&&c.y===y)&&
      !state.orders.some(o=>o.type!=="buildChest"&&
        (o.type==="buildHome"?homeTiles(o.x,o.y).some(([hx,hy])=>hx===x&&hy===y):
         o.x===x&&o.y===y&&o.type==="buildStation"));
  }
  function wellSiteValid(x,y){
    if(!state||!state.crafting?.station||!state.colonyLife||state.colonyLife.researchLevel<2)return false;
    // A própria ordem buildWell não deve tornar o local inválido na conclusão.
    return chestSiteValid(x,y)&&!state.wells.some(w=>w.x===x&&w.y===y);
  }
  function homeSiteValid(x,y){
    if(x<2||y<2||x>=W-3||y>=H-3)return false;
    return homeTiles(x,y).every(([tx,ty])=>
      World.terrainAt(state.world,tx,ty).buildable&&
      !World.waterAt(state.world,tx,ty)&&!World.at(state.world,tx,ty)&&
      !state.animals?.some(a=>Math.floor(a.x)===tx&&Math.floor(a.y)===ty)&&
      !window.TillfolkHouseBuilder.occupied(state.house,tx,ty)&&
      !state.chests?.some(c=>c.x===tx&&c.y===ty)&&
      !state.wells?.some(c=>c.x===tx&&c.y===ty)&&
      !occupiedByHome(tx,ty)&&!occupiedByStation(tx,ty)&&!occupiedByRocket(tx,ty)&&
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
  const blocked=(x,y)=>Boolean(state?.chests?.some(c=>c.x===x&&c.y===y))||Boolean(state?.wells?.some(w=>w.x===x&&w.y===y))||World.blocked(state?.world,x,y,W,H)||Boolean(state?.house&&window.TillfolkHouseBuilder.occupied(state.house,x,y))||occupiedByHome(x,y)||occupiedByStation(x,y);
  // Caminhos em grade impedem que colonos atravessem a casa, árvores e objetos.
  // Só a navegação usa esta malha; o cultivo continua seguindo as regras existentes.
  const directions=[[1,0],[-1,0],[0,1],[0,-1]];
  function routeBetween(fromX,fromY,toX,toY,worker=null){
    // O lenhador fica ao LADO da árvore/pedra; nunca pisa dentro do obstáculo.
    const start=[Math.floor(fromX),Math.floor(fromY)],id=(x,y)=>x+","+y;
    const origin=id(...start);
    const cannotEnter=(x,y)=>blocked(x,y)||Boolean(worker&&Exploration.blocker(worker,state.world,x,y));
    // Ao clicar num ponto interno da lagoa, qualquer margem da MESMA lagoa
    // é válida: um trabalhador nunca precisa pisar na água.
    // Rios maiores não devem gerar milhares de destinos de BFS a cada busca.
    const sourceTiles=World.waterAt(state?.world,toX,toY)?
      state.world.water.slice().sort((a,b)=>
        (Math.abs(a.x-fromX)+Math.abs(a.y-fromY))-
        (Math.abs(b.x-fromX)+Math.abs(b.y-fromY))).slice(0,64):
      [{x:toX,y:toY}];
    const goals=blocked(toX,toY)?sourceTiles.flatMap(tile=>
      directions.map(([dx,dy])=>[tile.x+dx,tile.y+dy])
        .filter(([x,y])=>!cannotEnter(x,y))):[[toX,toY]];
    if(!blocked(toX,toY)&&cannotEnter(toX,toY))return [];
    if(!goals.length)return [];
    const destinations=new Set(goals.map(([x,y])=>id(x,y)));
    const queue=[start],previous=new Map([[origin,null]]);
    let reached=destinations.has(origin)?origin:null;
    for(let head=0;head<queue.length&&reached===null;head++){
      const [x,y]=queue[head];
      for(const [dx,dy] of directions){
        const nx=x+dx,ny=y+dy,key=id(nx,ny);
        if(previous.has(key)||cannotEnter(nx,ny))continue;
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
  // Transporte físico: ir à pilha ou ao baú, recolher até a capacidade,
  // atravessar o mapa carregando e entregar no local de construção.
  function processHaul(w,scaled){
    const job=w.haul;if(!job)return false;
    if(w.neg?.includes("carry")){refundHaul(w);return false;}
    const goal=job.phase==="fetch"?job.source:job.destination;
    const id="haul:"+job.phase+":"+goal.x+","+goal.y+":"+job.kind;
    if(w.routeTask!==id){
      w.route=routeBetween(w.x,w.y,goal.x,goal.y,w);
      if(!w.route.length){refundHaul(w);w.route=[];w.routeTask=null;return true;}
      w.routeTask=id;
    }
    const target=w.route[0]||{x:goal.x+.5,y:goal.y+.5};
    const dx=target.x-w.x,dy=target.y-w.y,d=Math.hypot(dx,dy);
    if(d>.055){
      w.facing=Math.abs(dx)>Math.abs(dy)?(dx>0?"right":"left"):(dy>0?"down":"up");
      const terrain=World.terrainAt(state.world,Math.floor(w.x),Math.floor(w.y));
      const move=Math.min(d,scaled*2.65/terrain.moveCost);
      w.x+=dx/d*move;w.y+=dy/d*move;
      w.moving=true;w.walkFrame=(w.walkFrame||0)+move*4.5;
      return true;
    }
    w.x=target.x;w.y=target.y;w.route.shift();
    if(w.route.length)return true;
    w.routeTask=null;w.route=[];
    if(job.phase==="fetch"){
      const grabbed=Logistics.collect(state,job);
      job.cargo=(job.cargo||0)+grabbed;
      if(job.cargo<=0){w.haul=null;return true;}
      w.inventory=w.inventory||{tools:{},items:{}};
      w.inventory.carrying={kind:job.kind,qty:job.cargo};
      // Transportadores visitam vários gravetos/pilhas antes de retornar.
      // A capacidade vale para a CARGA TOTAL, não apenas uma pilha.
      const remainder=Math.max(0,(job.limit||job.cargo)-job.cargo);
      const next=remainder>0?[...Logistics.sources(state,job.kind)]
        .sort((a,b)=>Math.abs(w.x-a.x)+Math.abs(w.y-a.y)-
          Math.abs(w.x-b.x)-Math.abs(w.y-b.y))
        .find(source=>source.qty>0&&routeBetween(w.x,w.y,source.x,source.y,w).length>0):null;
      if(next){
        job.source=next;job.qty=Math.min(remainder,next.qty);
        job.phase="fetch";w.routeTask=null;w.route=[];
      }else{
        job.qty=job.cargo;job.phase="deliver";
      }
      log(w.name+" pegou "+grabbed+" "+job.kind+" (carga: "+job.cargo+"/"+job.limit+").");
    }else{
      const order=job.orderId?state.orders.find(o=>o.id===job.orderId):null;
      if(job.orderId&&!order)Logistics.drop(state,goal.x,goal.y,job.kind,job.qty);
      else Logistics.deliver(state,order,job);
      if(w.inventory)w.inventory.carrying=null;
      log(w.name+" entregou "+job.qty+" "+job.kind+" no "+(order?"projeto":"baú")+".");
      w.haul=null;recalcTasks();save();
    }
    return true;
  }
  function beginHaul(w,order){
    if(w.neg?.includes("carry"))return false;
    const job=order?Logistics.plan(state,order,w):Logistics.planStorage(state,w);
    if(!job)return false;
    w.haul=job;w.route=[];w.routeTask=null;return true;
  }
  function refundHaul(w){
    if((w.haul?.cargo||0)>0)
      Logistics.drop(state,Math.floor(w.x),Math.floor(w.y),w.haul.kind,w.haul.cargo);
    w.haul=null;
    if(w.inventory)w.inventory.carrying=null;
  }
  const deliveryTypes=new Set(["buildStation","buildHome","buildChest","buildWell","buildRocket","craftTool"]);
  function pendingSupplyOrder(){
    // Entregadores podem abastecer uma obra mesmo sem executar a atividade final.
    const assigned=new Set(state.workers.map(w=>w.task).filter(Boolean));
    return state.orders.find(order=>deliveryTypes.has(order.type)&&
      !assigned.has(order.id)&&!Logistics.complete(order)&&
      tasks.some(t=>t.id===order.id&&t.status==="ready")&&
      Object.entries(Logistics.remaining(order)).every(([kind,qty])=>Logistics.available(state,kind)>=qty))||null;
  }
  let tutorialSpeedBeforeFinish=1;
  // Falas efêmeras: o ritmo do diálogo não altera saves nem tarefas.
  const speechScene={step:-1,sequence:0,text:"",workerId:null,until:0,next:0};
  function resetSpeechScene(){
    speechScene.step=-1;speechScene.sequence=0;speechScene.text="";
    speechScene.workerId=null;speechScene.until=0;speechScene.next=0;
  }
  let progressAccumulator=0;
  let state = null, tasks = [], selectedTool = "universal", buildLayer = "home", eraseBuild = false, buildHover = null, houseHistory = [], playing = false, simSpeed = 1, last = 0, frameAccumulator = 0, uiAccumulator = 0, saveAccumulator=0, toastTimer, starters = [], pendingMode = "survival", managementTab = "priorities", managementWorker = null, speedBeforeManagement = 1;
  const random = (a) => a[Math.floor(Math.random()*a.length)];
  function makePlot(x,y,selected=false){
    return {x,y,selected,dirty:false,tilled:false,fertilized:false,seeded:false,watered:false,growth:0,produce:false};
  }
  function reset(chosenStarters = [], config = {}){
    // O jogador recebe uma clareira e recursos naturais, não uma fazenda pronta.
    const seed=Math.floor(Math.random()*0xFFFFFFFF)>>>0;
    const world=World.create(seed,W,H);
    Minerals.populate(world);
    const plots=[];
    for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){
      if(!World.waterAt(world,x,y))plots.push(makePlot(x,y,false));
    }
    const initialColonists=chosenStarters.slice(0,2).map(c=>({
      name:c.name,skills:[...c.skills],neg:[...c.neg],color:c.color,appearance:c.appearance
    }));
    const team = initialColonists.map((c,i)=>({
      id:i+1,name:c.name,skills:[...c.skills],neg:[...c.neg],color:c.color,
      appearance:c.appearance ?? i,personalPriority:{},inventory:{tools:{},items:{}},x:W/2-.5+i,y:H/2-.5,task:null,progress:0,facing:"down",moving:false,walkFrame:0,
      satiety:100,health:100,hungerState:"fed",starvationMinutes:0,lastMealDay:1
    }));
    state = {day:1,minutes:8*60,seeds:0,water:0,food:8,firstHarvest:false,mode:config.mode||"survival",farmName:config.farmName||"Vale do Amanhecer",tutorial:Missions.create(),
      plots,orders:[],world,spawn:{x:W/2,y:H/2},house:window.TillfolkHouseBuilder.initial(),
      cropSeeds:Crops.normalizeStock({}),cropProduce:Crops.normalizeStock({}),selectedCrop:"potato",workstations:[],crafting:Crafting.normalize(null),
      groundItems:[],chests:[],wells:[],nextDropId:1,homes:[],
      animals:Exploration.spawn(world,world.objects),inventory:{wood:0,twigs:0,stone:0,mushroom:0,flower:0,herbs:0,grass:0,manure:0}, workers:team,
      candidates:structuredClone(initialCandidates),nextWorkerId:team.length+1,priorities:{...startPriorities},buildPriority:5,
      survivalVersion:1,startingColonists:initialColonists,deaths:[],gameOver:false,
      journal:["A equipe inicial chegou ao vale: "+team.map(w=>w.name).join(" e ")+"!"]};
    Food.normalize(state); // A comida inicial é genérica; não inventar colheitas.
    Life.normalize(state);
    Council.normalize(state);
    Minerals.normalize(state);
    Space.normalize(state);
    Progression.normalize(state);
    tasks=[]; simSpeed=1; updateSpeed();
  }
  // "play" significa que a fazenda estava aberta na última visita.
  // "menu" preserva a decisão explícita de voltar à tela inicial.
  function setSessionMode(mode){
    try{localStorage.setItem(SESSION_KEY,mode);}catch(error){console.warn("Preferência da sessão indisponível:",error);}
  }
  function shouldAutoResume(){
    try{
      // Saves antigos (sem SESSION_KEY) também devem reabrir a fazenda.
      return Boolean(localStorage.getItem(SAVE_KEY))&&localStorage.getItem(SESSION_KEY)!=="menu";
    }catch{return false;}
  }
  function readSave(){
    const previousState=state;
    try {
      const s=JSON.parse(localStorage.getItem(SAVE_KEY));
      if(!s||!Array.isArray(s.plots)||!Array.isArray(s.workers))return false;
      state=s;
      Life.normalize(state);
      Space.normalize(state);
      state.survivalVersion=1;
      state.gameOver=Boolean(s.gameOver);
      state.deaths=Array.isArray(s.deaths)?s.deaths.filter(death=>
        death&&typeof death.name==="string"&&Number.isInteger(death.day)):[];
      const savedStarters=Array.isArray(s.startingColonists)&&s.startingColonists.length?
        s.startingColonists:s.workers;
      state.startingColonists=savedStarters.slice(0,2).map((worker,index)=>({
        name:typeof worker.name==="string"?worker.name:"Colono "+(index+1),
        skills:Array.isArray(worker.skills)?worker.skills.slice(0,3):[],
        neg:Array.isArray(worker.neg)?worker.neg.slice(0,3):[],
        color:typeof worker.color==="string"?worker.color:"#b6de81",
        appearance:Number.isInteger(worker.appearance)?worker.appearance:index
      }));
      state.tutorial=Missions.normalize(s.tutorial); // Saves antigos continuam jogáveis, sem iniciar missões retroativas.
      // Migração das sementes genéricas preserva todos os recursos de fazendas antigas.
      state.cropSeeds=Crops.normalizeStock(s.cropSeeds||{carrot:Number(s.seeds)||0});
      state.cropProduce=Crops.normalizeStock(s.cropProduce);
      state.selectedCrop=Crops.get(s.selectedCrop)?s.selectedCrop:"potato";
      state.workstations=Array.isArray(s.workstations)?s.workstations.filter(ws=>
        Number.isInteger(ws.x)&&Number.isInteger(ws.y)&&ws.x>0&&ws.y>0&&ws.x<W-1&&ws.y<H-1):[];
      state.crafting=Crafting.normalize(s.crafting,!s.crafting);
      Logistics.normalize(state);
      state.wells=Array.isArray(s.wells)?s.wells.filter(w=>Number.isInteger(w.x)&&Number.isInteger(w.y)):[];
      if(!state.crafting.station&&state.workstations.length)
        state.crafting.station={x:state.workstations[0].x,y:state.workstations[0].y};
      if(state.crafting.station&&!state.workstations.some(ws=>ws.x===state.crafting.station.x&&ws.y===state.crafting.station.y))
        state.workstations.push({...state.crafting.station});
      state.seeds=Object.values(state.cropSeeds).reduce((sum,n)=>sum+n,0);
      state.plots.forEach(p=>{if((p.seeded||p.produce)&&!Crops.get(p.crop))p.crop="carrot";});
      state.workers.forEach(w=>{
        homageSavedName(w);
        Crafting.normalizeWorker(w,!w.inventory?s.crafting?.equipment:null);
        Survival.normalizeWorker(w,state.day);
      });
      Crafting.reconcileEquipment(state);
      // Migração não destrutiva: os saves continuam utilizáveis, mas não há moeda.
      delete state.coins;
      state.food=Survival.normalizeFood(state.food);
      Food.normalize(state); // Migração conservadora dos saves anteriores a foodLedger v1.
      state.firstHarvest=Boolean(s.firstHarvest||s.tutorial?.stats?.harvest>0);
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
        // Migração aditiva: preserva o retângulo do save antigo (28x18 ou 80x50).
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
      const oldBoundary=state.world.boundary;
      World.removeValleyEnclosure(state.world);
      if(oldBoundary){
        state.orders=state.orders.filter(order=>order.type!=="clear"||
          !World.ringTile(oldBoundary,order.x,order.y));
      }
      // Saves legados podem trazer árvores com frutos: substituir somente a
      // variante gráfica, mantendo a árvore, sua posição e o recurso de madeira.
      World.stripFruitTrees(state.world);
      state.inventory=state.inventory||{wood:0,stone:0,mushroom:0,flower:0,herbs:0,grass:0};
      state.inventory.manure=Math.max(0,Number(state.inventory.manure)||0);
      state.inventory.twigs=Math.max(0,Math.floor(Number(state.inventory.twigs)||0));
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
        .map(a=>({...a,manure:a.wild?0:Math.max(0,Number(a.manure)||0),
          timer:Number(a.timer)||0}));
      // Saves antigos recebem fauna sem apagar animais e construções existentes.
      for(const animal of state.animals)if(animal.wild){
        animal.kind=Exploration.normalizedKind(animal);
        animal.moving=false;
        delete animal.fromX;delete animal.fromY;
        delete animal.toX;delete animal.toY;
        animal.moveTime=0;
      }
      if(!state.animals.some(a=>a.wild)){
        const occupied=[...state.world.objects,
          ...state.workers.map(w=>({x:w.x,y:w.y})),
          ...state.plots.filter(p=>p.tilled||p.seeded||p.selected||p.produce),
          ...state.homes,...state.workstations];
        state.animals.push(...Exploration.spawn(state.world,occupied,[state.spawn]));
      }
      // Ordens da vaca removida não ficam bloqueadas para sempre.
      state.orders=state.orders.filter(o=>o.type!=="collectManure"||
        state.animals.some(a=>Math.floor(a.x)===o.x&&Math.floor(a.y)===o.y));
      assignHomes();
      state.mode=state.mode||"survival";
      state.farmName=state.farmName||"Minha Fazenda";
      state.priorities={...startPriorities,...s.priorities};
      state.buildPriority=Math.max(1,Math.min(9,Number(s.buildPriority)||5));
      state.workers.forEach(w=>{
        // Uma carga interrompida por recarregamento retorna ao depósito.
        if(w.carryingWater)state.water=(Number(state.water)||0)+1;
        if(w.carryingManure)state.inventory.manure++;
        w.carryingWater=false;w.carryingManure=false;w.supplyStage=null;w.supplyTarget=null;
        if((w.haul?.cargo||0)>0)
          Logistics.drop(state,Math.floor(w.x),Math.floor(w.y),w.haul.kind,w.haul.cargo);
        w.haul=null;if(w.inventory)w.inventory.carrying=null;
        w.task=null;w.progress=0;w.personalPriority=w.personalPriority||{};
        w.x=Number.isFinite(w.x)?w.x:state.spawn.x;w.y=Number.isFinite(w.y)?w.y:state.spawn.y;
        w.route=[];w.routeTask=null;w.facing=w.facing||"down";w.moving=false;w.walkFrame=0;
      });
      const protectedWaterTiles=[
        ...state.workers.map(w=>({x:Math.floor(w.x),y:Math.floor(w.y)})),
        ...state.plots.filter(p=>p.selected||p.tilled||p.seeded||p.produce)
          .map(p=>({x:p.x,y:p.y})),
        ...state.workstations,
        ...state.homes.flatMap(home=>homeTiles(home.x,home.y).map(([x,y])=>({x,y}))),
        ...(state.rocket?.site?Space.footprint(state.rocket.site.x,state.rocket.site.y):[]),
        ...state.animals.map(animal=>({x:Math.floor(animal.x),y:Math.floor(animal.y)})),
        ...["floor","walls","roof"].flatMap(layer=>state.house[layer].map(id=>{
          const [x,y]=id.split("-").map(Number);return {x,y};
        }))
      ];
      World.connectWater(state.world,protectedWaterTiles);
      // Saves antigos com pontes em zigue-zague são reparados uma única vez.
      // A água e o tilemap do jogador permanecem exatamente nas mesmas células.
      const repairedBridges=World.repairCrossings(state.world,protectedWaterTiles);
      if(repairedBridges)console.info("TILLFOLK: travessias antigas corrigidas sem alterar o terreno.");
      Minerals.normalize(state);
      Minerals.populate(state.world,[
        ...protectedWaterTiles,...state.chests,...state.wells,
        ...state.orders.map(o=>({x:o.x,y:o.y}))
      ]);
      state.orders=state.orders.filter(order=>!World.waterAt(state.world,order.x,order.y));
      state.candidates=Array.isArray(s.candidates)?s.candidates:structuredClone(initialCandidates);
      state.candidates.forEach(homageSavedName);
      state.journal=Array.isArray(s.journal)?s.journal:[];
      // Antigas partidas reconhecem suas conquistas, mas não recebem
      // recompensas retroativas que alterariam a economia já existente.
      Progression.normalize(state);
      Progression.advance(state,{backfill:!s.progression});
      Council.normalize(state); // Saves antigos recebem o próximo encontro sem prêmios retroativos.
      tasks=[];recalcTasks();
      // Retomar a velocidade anterior, inclusive pausa, sem mexer no tempo do dia.
      simSpeed=[0,1,3,6].includes(s.sessionSpeed)?s.sessionSpeed:1;
      updateSpeed();return true;
    }catch(error){
      state=previousState; // Save danificado não substitui nem estraga a cena corrente.
      console.warn("Não foi possível restaurar a partida salva:",error);
      return false;
    }
  }
  function save(){
    if(!state||(!playing&&!state.gameOver))return;
    try{
      // Se um modal pausou temporariamente a simulação, guardar a velocidade
      // de antes da janela para a retomada não abrir pausada por engano.
      const gameOptions=$("#game-options-dialog"),management=$("#management-dialog");
      state.sessionSpeed=gameOptions?.open?speedBeforeOptions:
        management?.open?speedBeforeManagement:
        optionsSubdialog?speedBeforeOptions:simSpeed;
      Food.normalize(state); // O total da comida permanece consistente com o estoque tipado.
      localStorage.setItem(SAVE_KEY,JSON.stringify(state));
      return true;
    }catch(error){console.warn("Não foi possível salvar:",error);return false;}
  }
  // Atualizações do Pages só recarregam uma partida após salvar com sucesso.
  window.TillfolkPrepareUpdate=()=>!playing||save()===true;
  // Salvamento imediato antes de atualizar, fechar ou trocar de aba.
  // O ciclo normal de 8 segundos continua ativo enquanto a página está aberta.
  window.addEventListener("pagehide",save);
  document.addEventListener("visibilitychange",()=>{
    if(document.visibilityState==="hidden")save();
  });
  function log(text){state.journal.unshift(text);state.journal.length=Math.min(5,state.journal.length);}
  function notify(text){const t=$("#toast");t.textContent=text;t.classList.add("visible");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("visible"),3000);}
  function recordTutorial(key,quantity=1){
    const previous=Missions.current(state);
    const result=Missions.record(state,key,quantity);
    if(!result.advanced)return;
    if(previous)log("✦ "+previous.complete);
    Missions.render(state);
    save();
    if(result.finished){
      tutorialSpeedBeforeFinish=simSpeed;
      simSpeed=0;updateSpeed();refresh();closeDrawer();
      $("#tutorial-done-dialog").showModal();
    }else if(previous)notify("✓ "+previous.complete);
  }
  function start(continueSaved=false, chosenStarters = [], config = {}){
    let restoredGameOver=false;
    if(continueSaved){
      // Nunca sobrescrever um save danificado com uma fazenda nova silenciosamente.
      if(!readSave()){
        notify("Não foi possível carregar esta fazenda. Seu salvamento não foi apagado.");
        return false;
      }
      restoredGameOver=state.gameOver||state.workers.length===0;
    }else reset(chosenStarters,config);
    houseHistory=[];buildHover=null;areaSelection=null;selectionPointer=null;resetSpeechScene();setTool("universal");
    recalcTasks(); // Limpar ordens já concluídas antes da primeira renderização.
    playing=true;$("#menu").hidden=true;$(".app-shell").inert=false;$("#continue").disabled=false;
    setSessionMode("play");
    document.body.classList.add("play-session","focus-game");
    worldPanX=0;worldPanY=0;cameraZoom=1;targetCameraZoom=1;cameraAnchor=null;
    movementKeys.clear();activeTouches.clear();pinchGesture=null;hoveredTile=null;feedbackParticles.length=0;pickupEffects.length=0;pickupHistory.length=0;closeDrawer();refresh();
    if(restoredGameOver){gameOver();return true;}
    save();
    minimap.hidden=window.innerWidth<=700;
    $("#biome-legend").hidden=minimap.hidden;
    $("#minimap-toggle").setAttribute("aria-expanded",String(!minimap.hidden));
    $("#minimap-toggle").textContent=minimap.hidden?"+":"−";
    syncCameraButtons();
    requestAnimationFrame(()=>{
      fitWorldCanvas();
      focusCameraAt(state.spawn?.x??W/2,state.spawn?.y??H/2);
    });
    // O HUD contextual já explica a ação; não obstruir o mapa com aviso ao iniciar.
    return true;
  }
  // Somente ordens solicitadas pelo jogador entram na fila. Nenhuma etapa é
  // fabricada depois de limpar, arar, semear, regar ou colher.
  function releaseSupply(w){
    if(w.carryingWater){state.water++;w.carryingWater=false;}
    if(w.carryingManure){state.inventory.manure++;w.carryingManure=false;}
    refundHaul(w);
    w.supplyStage=null;w.supplyTarget=null;
  }

  // S2: Game Over - todos os colonos morreram
  function gameOver(){
    state.gameOver=true;
    state.gameOverDay=state.day;
    save();
    playing=false;
    simSpeed=0;updateSpeed();
    const existing=document.querySelector("[data-gameover-dialog]");
    if(existing)return;
    const dialog = document.createElement('dialog');
    dialog.className = 'modal';
    dialog.dataset.gameoverDialog="true";
    dialog.innerHTML = `
      <h2>☠ A Colônia Falhou</h2>
      <p>Todos os colonos pereceram por inanição.</p>
      <p>A colônia durou <strong>${state.day} dias</strong>.</p>
      <div style="display:flex;gap:8px;justify-content:center;margin-top:16px;">
        <button class="large-primary" id="gameover-restart" type="button">Começar nova colônia</button>
        <button class="large-secondary" id="gameover-menu" type="button">Menu Principal</button>
      </div>
    `;
    document.body.appendChild(dialog);
    dialog.showModal();

    dialog.querySelector('#gameover-restart').onclick = () => {
      dialog.close(); dialog.remove();
      const first=state.startingColonists?.[0]||randomStarter();
      const second=state.startingColonists?.[1]||randomStarter([first.name],[first.appearance]);
      start(false,[first,second],{mode:state.mode,farmName:state.farmName});
    };
    dialog.querySelector('#gameover-menu').onclick = () => {
      dialog.close(); dialog.remove();
      $("#game-return-title").click();
      refresh();
    };
  }
  // Uma marcação indica exclusivamente uma ordem PENDENTE, não uma memória
  // permanente da seleção. Limpa inclusive saves antigos que tinham selected=true.
  let lastSelectionPlots=null,lastSelectionSignature=null;
  function syncOrderSelections(){
    const signature=state.orders.filter(o=>!["collectWater","collectManure","buildHome","buildStation","buildRocket"].includes(o.type))
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
  function specialtyMultiplier(w,type){
    if(!w.skills.includes(type))return 1;
    const reds=Math.min(3,w.neg?.length||0);
    if(w.skills.length===1)return 2+reds/3; // 3 restrições e 1 habilidade: 3×
    if(w.skills.length===2)return 1.6+reds*.23;
    return 1.3+reds*.1;
  }
  function bonus(w,type){
    const specialty=specialtyMultiplier(w,type);
    return specialty*Survival.workMultiplier(w)*Life.workMultiplier(w);
  }
  // Mesma regra para escolher trabalho e para explicar a ociosidade.
  // Traços negativos são proibições, não uma penalidade de velocidade.
  function workerTaskBlocker(w,t){
    if(t.status!=="ready")return t.reason||"Aguardando pré-requisitos";
    if(w.neg.includes(t.type))return "Traço negativo: não pode "+labels[t.type].toLowerCase();
    if(t.type==="craftTool"&&!Crafting.canEquip(w,t.recipe))
      return "Traço negativo: não pode equipar esta ferramenta";
    if(deliveryTypes.has(t.type)&&!Logistics.complete(t)&&w.neg.includes("carry"))
      return "Traço negativo: não pode transportar materiais desta obra";
    if(t.type==="water"&&state.water<=0&&w.neg.includes("collectWater"))
      return "Traço negativo: não pode buscar água";
    if(t.type==="fertilize"&&state.inventory.manure<=0&&w.neg.includes("collectManure"))
      return "Traço negativo: não pode recolher esterco";
    if(t.type==="craftTool"&&w.inventory?.tools?.[t.recipe])
      return "Este colono já possui esta ferramenta";
    const missingProtection=Exploration.blocker(w,state.world,t.x,t.y);
    if(missingProtection)return missingProtection;
    const personalBlock=Crafting.blocked(state,t.type,World.at(state.world,t.x,t.y),w);
    if(personalBlock)return personalBlock;
    if(t.type==="buildChest"&&!chestSiteValid(t.x,t.y))return "Baú exige terreno livre";
    if(t.type==="buildWell"&&!wellSiteValid(t.x,t.y))return "Poço exige pesquisa e solo livre";
    if(t.type==="buildRocket"){
      const obstacle=Space.canOrder(state,t.x,t.y,t.stage);
      if(obstacle)return obstacle;
    }
    if(t.type==="buildStation"&&!stationSiteValid(t.x,t.y))
      return "Escolha um terreno livre para a bancada";
    if(t.type==="buildHome"){
      const alreadyAssigned=state.workers.filter(other=>other.id!==w.id&&other.task&&
        tasks.some(job=>job.id===other.task&&job.type==="buildHome")).length;
      if(Logistics.available(state,"wood")<HOME_WOOD_COST*(alreadyAssigned+1))
        return "Madeira reservada para outras construções";
    }
    if(!routeBetween(w.x,w.y,t.x,t.y,w).length)
      return "Sem caminho acessível até o trabalho";
    return null;
  }
  function idleReason(w){
    if(w.resting)return "Descansando para recuperar energia";
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
    if(w.task||w.resting)return;
    const available=tasks.filter(t=>t.status==="ready"&&!t.assigned&&!workerTaskBlocker(w,t));
    const priorityScore=t=>{
      const global=Number.isInteger(t.priority)?t.priority:state.priorities[t.type]||5;
      const individual=w.personalPriority?.[t.type]??5;
      const expertise=bonus(w,t.type);
      const distance=Math.abs(w.x-(t.x+.5))+Math.abs(w.y-(t.y+.5));
      return global*100+individual*14+expertise*9-distance*.3;
    };
    available.sort((a,b)=>priorityScore(b)-priorityScore(a));
    if(available.length){w.task=available[0].id;w.progress=0;w.routeTask=null;w.route=[];available[0].assigned=w.id;}
  }
  function assignIdleWorkers(){
    const idle=state.workers.filter(w=>!w.task&&!w.resting);
    if(!idle.length)return;
    // Trabalhadores especializados/restritos escolhem antes dos generalistas.
    // Evita o versátil ocupar a única ordem disponível para outro colono.
    // Contagem leve: o teste de caminho continua centralizado em assign().
    const options=w=>tasks.reduce((count,t)=>{
      if(t.status!=="ready"||t.assigned||w.neg.includes(t.type))return count;
      if(t.type==="craftTool"&&!Crafting.canEquip(w,t.recipe))return count;
      if(deliveryTypes.has(t.type)&&!Logistics.complete(t)&&w.neg.includes("carry"))return count;
      if(t.type==="water"&&state.water<=0&&w.neg.includes("collectWater"))return count;
      if(t.type==="fertilize"&&state.inventory.manure<=0&&w.neg.includes("collectManure"))return count;
      return count+1;
    },0);
    const ranked=idle.map(w=>({worker:w,options:options(w)}))
      .sort((a,b)=>a.options-b.options||a.worker.id-b.worker.id);
    for(const entry of ranked)assign(entry.worker);
  }
  // Rotina real: o trabalhador caminha até o abrigo antes de descansar.
  // Sem casa ele descansa na clareira, mas perde moral e recupera-se mais devagar.
  function processRest(w,scaled){
    const assigned=state.homes.find(h=>h.residentId===w.id);
    const goal=assigned?{x:Math.max(1,assigned.x-1),y:assigned.y}:{x:Math.floor(state.spawn.x),y:Math.floor(state.spawn.y)};
    const key="rest:"+goal.x+","+goal.y;
    if(w.routeTask!==key){
      w.route=routeBetween(w.x,w.y,goal.x,goal.y,w);
      w.routeTask=key;
    }
    const target=w.route?.[0]||{x:goal.x+.5,y:goal.y+.5};
    const dx=target.x-w.x,dy=target.y-w.y,d=Math.hypot(dx,dy);
    if(d>.07&&w.route?.length){
      w.facing=Math.abs(dx)>Math.abs(dy)?(dx>0?"right":"left"):(dy>0?"down":"up");
      const terrain=World.terrainAt(state.world,Math.floor(w.x),Math.floor(w.y));
      const move=Math.min(d,scaled*2.3/(terrain?.moveCost||1));
      w.x+=dx/d*move;w.y+=dy/d*move;
      w.moving=true;w.walkFrame=(w.walkFrame||0)+move*4.3;
      w.atRest=false;
      return;
    }
    if(w.route?.length){w.x=target.x;w.y=target.y;w.route.shift();}
    w.atRest=true;w.moving=false;
    if(!assigned)w.morale=Math.max(0,w.morale-scaled*.009);
  }
  function automateFarmIfEnabled(){
    if(!Life.canAutomate(state,state.day*1440+state.minutes)||state.orders.length>=350)return;
    let added=0;
    for(const plot of state.plots){
      if(added>=5||state.orders.length>=350)break;
      if(!plot.tilled&&!(plot.seeded||plot.produce))continue;
      const kind=plot.produce?"carry":plot.seeded?
        (plot.growth>=1?"harvest":!plot.watered?"water":null):
        state.cropSeeds[state.selectedCrop]>0?"sow":null;
      if(!kind||state.orders.some(o=>o.x===plot.x&&o.y===plot.y&&o.type===kind))continue;
      const result=Orders.status({type:kind,x:plot.x,y:plot.y,crop:state.selectedCrop},
        plot,World.at(state.world,plot.x,plot.y),state);
      if(result.state!=="ready")continue;
      const next=Orders.add(state.orders,kind,plot.x,plot.y,
        plot,World.at(state.world,plot.x,plot.y),state);
      if(!next.order)continue;
      if(kind==="sow")next.order.crop=state.selectedCrop;
      next.order.priority=6;
      state.orders.push(next.order);added++;
    }
    if(added){recalcTasks();log("🌱 Rotina agrícola: "+added+" tarefa(s) agendada(s) automaticamente.");}
  }
  function finish(w,t){
    const p=findPlot(t.x,t.y);
    if(t.type==="craftTool"){
      if(!Logistics.complete(t))return false;
      if(!state.crafting.station||state.crafting.station.x!==t.x||state.crafting.station.y!==t.y)return false;
      const result=Crafting.craft(state,t.recipe,w,true);
      if(result.error){log("Fabricação aguardando: "+result.error);return false;}
      const item=result.item;
      if(result.material){
        Logistics.drop(state,t.x,t.y,result.material.kind,result.material.qty);
        Minerals.discover(state,result.material.kind);
      }
      showPickup(t.x,t.y,result.material?.kind||item.key,result.material?.qty||1);
      if(item.key==="hoe")recordTutorial("hoe");
      if(item.key==="wateringCan")recordTutorial("wateringCan");
      if(item.key==="axe")recordTutorial("axe");
      Life.discover(state,1);
      log(w.name+" terminou "+item.name+" na Work Station e guardou no próprio inventário.");
      return true;
    }
    if(t.type==="collectWater"){
      if(!World.waterAt(state.world,t.x,t.y))return false;
      state.water+=4;showPickup(t.x,t.y,"water",4);log(w.name+" buscou 4 baldes de água na lagoa.");return true;
    }
    if(t.type==="collectManure"){
      const animal=state.animals.find(a=>Math.floor(a.x)===t.x&&Math.floor(a.y)===t.y&&a.manure>0);
      if(!animal)return false;
      animal.manure--;state.inventory.manure++;showPickup(t.x,t.y,"manure");
      log(w.name+" recolheu esterco de "+(animal.kind==="cow"?"vaca":"animal")+".");return true;
    }
    if(t.type==="buildRocket"){
      if(!Logistics.complete(t))return false;
      const result=Space.finish(state,t);
      if(result.error)return false;
      Life.discover(state,3);
      log("🚀 "+w.name+" concluiu "+result.name+
        (result.ready?". A nave está pronta para abastecimento!":". Próxima etapa liberada."));
      notify("🚀 "+result.name+" concluído!");
      return true;
    }
    if(t.type==="buildStation"){
      if(!Logistics.complete(t)||!stationSiteValid(t.x,t.y))return false;
      state.workstations.push({x:t.x,y:t.y});
      state.crafting.station={x:t.x,y:t.y};
      state.plots=state.plots.filter(plot=>plot.x!==t.x||plot.y!==t.y);
      showPickup(t.x,t.y,"station");
      Life.discover(state,2);
      recordTutorial("workstation");
      log(w.name+" terminou a Work Station! Agora podemos fabricar ferramentas.");
      return true;
    }
    if(t.type==="buildHome"){
      if(!Logistics.complete(t)||!homeSiteValid(t.x,t.y))return false;
      state.homes.push({x:t.x,y:t.y,residentId:null,legacy:false});
      for(const [hx,hy] of homeTiles(t.x,t.y)){
        state.plots=state.plots.filter(plot=>plot.x!==hx||plot.y!==hy);
      }
      assignHomes();
      showPickup(t.x,t.y,"home");
      recordTutorial("home");
      Life.discover(state,2);
      log(w.name+" concluiu uma cabana. "+housingVacancy()+" vaga(s) livres.");return true;
    }
    if(t.type==="buildWell"){
      if(!Logistics.complete(t)||!wellSiteValid(t.x,t.y))return false;
      state.wells.push({x:t.x,y:t.y});
      state.plots=state.plots.filter(p=>p.x!==t.x||p.y!==t.y);
      showPickup(t.x,t.y,"water",1);
      Life.discover(state,1);
      log(w.name+" construiu um poço. A água agora será armazenada lentamente.");
      return true;
    }
    if(t.type==="buildChest"){
      if(!Logistics.complete(t)||!chestSiteValid(t.x,t.y))return false;
      state.chests.push({x:t.x,y:t.y,items:{}});
      state.plots=state.plots.filter(plot=>plot.x!==t.x||plot.y!==t.y);
      showPickup(t.x,t.y,"chest");
      Life.discover(state,1);
      log(w.name+" terminou o baú. A equipe agora pode guardar materiais.");
      return true;
    }
    if(!p)return false;
    let complete=true;
    switch(t.type){
      case "clear":{
        const obj=World.at(state.world,p.x,p.y);
        if(obj){
          if(Crafting.blocked(state,"clear",obj,w))return false;
          const kind=obj.kind, result=World.clear(state.world,p.x,p.y);
          if(result.blocked)return false;
          const types={tree:"wood",stump:"wood",log:"wood",boulder:"stone",pebble:"gravel",
            mushroom:"mushroom",flowers:"flower",herbs:"herbs",grass:"grass",thicket:"wood",twig:"twigs"};
          const amount=obj.mineral?Math.max(1,Number(obj.amount)||3):
            ({tree:3,stump:2,log:2,boulder:3,twig:1}[kind]||1);
          const resource=obj.mineral||types[kind]||"grass";
          Logistics.drop(state,t.x,t.y,resource,amount);
          if(Minerals.discover(state,resource)){
            log("⛏️ Novo material descoberto: "+Minerals.RESOURCES[resource].name+".");
            notify("⛏️ "+Minerals.RESOURCES[resource].name+" descoberto!");
            Life.discover(state,2);
          }
          showPickup(t.x,t.y,resource,amount);
          if(kind==="tree")recordTutorial("tree");
          // Grama alta tem chance de soltar uma semente. Não existe semente infinita.
          if(kind==="grass"){
            recordTutorial("grass");
            // Primeira semente da missão não depende da sorte.
            const firstSeedTutorial=Missions.current(state)?.key==="seed"&&state.seeds===0;
            if(firstSeedTutorial||Math.random()<.25){
              const region=World.terrainAt(state.world,t.x,t.y)?.id||"g";
              // A primeira semente do jogador sempre é batata, própria do vale inicial.
              const variety=state.tutorial?.active&&!state.tutorial.stats?.seed?
                "potato":Crops.pickWild(Math.random,region);
              if(state.seeds===0)state.selectedCrop=variety;
              state.cropSeeds[variety]++;
              state.seeds++;showPickup(t.x,t.y,"seed");
              log(w.name+" encontrou uma semente de "+Crops.get(variety).name+" na grama!");
              recordTutorial("seed");
            }
          }
          if(result.resource)log(w.name+" coletou "+result.resource+".");
          p.dirty=result.remaining;
          if(result.remaining)complete=false; // Continuar a mesma ordem até retirar o toco.
        }else p.dirty=false;
        // Limpar o terreno produz recursos naturais, nunca moedas.
        break;
      }
      case "till":if(Crafting.blocked(state,"till",null,w))return false;
        p.tilled=true;recordTutorial("till");break;
      case "fertilize":
        if(!w.carryingManure&&state.inventory.manure<=0)return false;
        if(w.carryingManure)w.carryingManure=false;else state.inventory.manure--;
        p.fertilized=true;break;
      case "sow":{
        const variety=Crops.get(t.crop)?t.crop:Crops.get(state.selectedCrop)?state.selectedCrop:"carrot";
        if(state.seeds<=0||!(state.cropSeeds[variety]>0))return false;
        state.cropSeeds[variety]--;state.seeds--;p.crop=variety;
        p.seeded=true;p.produce=false;p.growth=0;
        recordTutorial("sow");break;
      }
      case "water":
        if(Crafting.blocked(state,"water",null,w))return false;
        if(!w.carryingWater&&state.water<=0)return false;
        if(w.carryingWater)w.carryingWater=false;else state.water--;
        p.watered=true;recordTutorial("water");break;
      case "harvest":Life.discover(state,2);showPickup(t.x,t.y,"crop");state.firstHarvest=true;p.produce=true;p.seeded=false;p.watered=false;p.growth=0;recordTutorial("harvest");break;
      case "carry":{
        const variety=Crops.get(p.crop)?p.crop:"carrot";
        const crop=Crops.get(variety),amount=crop.food,seedReturn=crop.seedYield||1;
        p.produce=false;p.fertilized=false;
        Food.add(state,variety,amount);state.cropProduce[variety]+=amount;showPickup(t.x,t.y,"food",amount);
        // Somente a colheita transportada ao estoque devolve sementes.
        // Nenhuma semente aparece ao semear ou colher no terreno.
        state.cropSeeds[variety]+=seedReturn;state.seeds+=seedReturn;
        showPickup(t.x,t.y,"seed",seedReturn);
        log(w.name+" guardou "+crop.name+" (+"+amount+" comida, +"+seedReturn+" sementes).");
        recordTutorial("carry");break;
      }
    }
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
      const futurePad=state.rocket?.site||state.orders.find(o=>o.type==="buildRocket");
      if(futurePad)for(const tile of Space.footprint(futurePad.x,futurePad.y))
        houseCells.push({...tile,selected:true});
      for(const home of state.homes.filter(h=>!h.legacy))for(const [x,y] of homeTiles(home.x,home.y))houseCells.push({x,y,selected:true});
      for(const order of state.orders.filter(o=>o.type==="buildHome"))for(const [x,y] of homeTiles(order.x,order.y))houseCells.push({x,y,selected:true});
      for(const animal of state.animals)animal.age=(Number(animal.age)||0)+1;
      const newborns=Life.animalBirths(state);
      if(newborns)log("🐄 Nasceu um filhote na fazenda! A reprodução consumiu 2 comidas.");
      const births=World.regrow(state.world,state.day,W,H,[...state.plots,...houseCells]);
      if(births>0)log("A natureza renovou "+births+" pequenos elementos do vale.");
      if(state.mode==="survival"){
        log("Um novo dia começou. Dia "+state.day+".");
        // Avisos de estoque baixo
        const hungryCount = state.workers.filter(w=>w.hungerState==="hungry" || w.hungerState==="starving").length;
        if(state.food===0){
          log("⚠ ALERTA: Sem comida no estoque! "+hungryCount+" colono(s) precisam comer.");
        }else if(state.food < state.workers.length * 2){
          log("⚠ Estoque baixo: "+state.food+" comida para "+state.workers.length+" colonos ("+hungryCount+" com fome).");
        }
      }else log("Um novo dia começou na fazenda tranquila. Dia "+state.day+".");
    }
    for(const animal of state.animals){
      if(animal.wild)continue;
      animal.timer=(animal.timer||0)+scaled;
      while(animal.timer>=120){
        animal.timer-=120;
        animal.manure=Math.min(3,(animal.manure||0)+1);
      }
    }
    // Animação com caminhada contínua, sem saltos tile a tile.
    Exploration.step(state.animals,state.world,scaled,
      (x,y)=>Boolean(World.at(state.world,x,y))||
        state.homes.some(home=>homeTiles(home.x,home.y).some(([hx,hy])=>hx===x&&hy===y)));
    for(const p of state.plots)if(p.seeded&&p.watered&&p.growth<1){
      const fertility=World.terrainAt(state.world,p.x,p.y).fertility;
      p.growth=Math.min(1,p.growth+
        scaled/Life.cropDuration(p.crop||"potato")*fertility*Life.growthMultiplier(state,p.crop));
    }
    const lifeEvents=Life.advance(state,scaled*1.25);
    for(const event of lifeEvents)log("🌿 "+event);
    const survivalEvents=Survival.advance(state,scaled*1.25);
    for(const event of survivalEvents){
      if(event.type==="warning")log("⚠ "+event.worker.name+" precisa de comida em breve. Saciedade: "+Math.round(event.worker.satiety)+"%");
      else if(event.type==="hungry")log("⚠ "+event.worker.name+" está com fome. Saciedade: "+Math.round(event.worker.satiety)+"%");
      else if(event.type==="starving")log("💀 "+event.worker.name+" está em inanição! Precisa comer urgentemente.");
      else if(event.type==="fed")log(event.worker.name+" se alimentou e está satisfeito.");
      else if(event.type==="weak")log("⚠ "+event.worker.name+" está fraco por falta de comida. Saúde: "+Math.round(event.worker.health)+"%");
      else if(event.type==="critical")log("⚠ "+event.worker.name+" corre risco fatal por inanição. Saúde: "+Math.round(event.worker.health)+"%");
    }
    recalcTasks();
    automateFarmIfEnabled();
    for(const w of state.workers){
      const mustSleep=Life.sleepRequired(w,state.minutes);
      if(mustSleep&&!w.resting){
        w.resting=true;w.atRest=false;
        if(w.haul)refundHaul(w);
        if(w.task){releaseSupply(w);w.task=null;w.progress=0;w.route=[];w.routeTask=null;w.workGoal=null;}
      }else if(!mustSleep&&w.resting){
        w.resting=false;w.atRest=false;w.route=[];w.routeTask=null;
      }
    }
    assignIdleWorkers();
    for(const w of state.workers){
      w.moving=false;
      if(Survival.tryEat(state,w)){
        showPickup(w.x,w.y,"food",1);
        log(w.name+" comeu uma refeição. Saciedade: "+Math.round(w.satiety)+"%");
        if(w.task){
          releaseSupply(w);
          w.task=null;w.progress=0;w.route=[];w.routeTask=null;w.workGoal=null;
          recalcTasks();
        }
        save();
        continue;
      }
      if(w.resting){processRest(w,scaled);continue;}
      if(w.haul){
        if(processHaul(w,scaled))continue;
      }
      if(!w.task){
        if(!w.neg.includes("carry")){
          const supply=pendingSupplyOrder();
          if(supply&&beginHaul(w,supply)){processHaul(w,scaled);continue;}
          if(state.chests.length&&beginHaul(w,null))processHaul(w,scaled);
        }
        continue;
      }
      const t=tasks.find(t=>t.id===w.task);
      if(!t){refundHaul(w);releaseSupply(w);w.task=null;w.progress=0;w.route=[];continue;}
      if(deliveryTypes.has(t.type)&&
         !Logistics.complete(state.orders.find(o=>o.id===t.id)||t)){
        if(w.neg.includes("carry")){
          releaseSupply(w);w.task=null;w.progress=0;w.route=[];w.routeTask=null;
          recalcTasks();continue;
        }
        const original=state.orders.find(o=>o.id===t.id);
        if(original&&beginHaul(w,original))processHaul(w,scaled);
        continue;
      }
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
          const reachable=sources.map(source=>({...source,route:routeBetween(w.x,w.y,source.x,source.y,w)}))
            .filter(source=>source.route.length>0).sort((a,b)=>a.route.length-b.route.length);
          w.supplyTarget=reachable[0]?{x:reachable[0].x,y:reachable[0].y}:null;
          w.supplyStage=stage;w.routeTask=null;w.route=[];
        }
        if(!w.supplyTarget)continue;
      }else if(w.supplyStage){w.supplyStage=null;w.supplyTarget=null;w.routeTask=null;w.route=[];}
      const goal=w.supplyTarget||t;
      const pathKey=w.task+":"+(w.supplyStage||"work")+":"+goal.x+","+goal.y;
      if(w.routeTask!==pathKey){
        w.route=routeBetween(w.x,w.y,goal.x,goal.y,w);
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
        w.carryingWater=true;showPickup(goal.x,goal.y,"water");w.supplyStage=null;w.supplyTarget=null;
        w.routeTask=null;w.route=[];w.workGoal=null;
        log(w.name+" encheu o balde na lagoa e está voltando para regar.");continue;
      }
      if(w.supplyStage==="manure"){
        const animal=state.animals.find(a=>Math.floor(a.x)===goal.x&&Math.floor(a.y)===goal.y&&a.manure>0);
        if(!animal){
          w.supplyTarget=null;w.routeTask=null;w.route=[];continue;
        }
        animal.manure--;showPickup(goal.x,goal.y,"manure");w.carryingManure=true;w.supplyStage=null;w.supplyTarget=null;
        w.routeTask=null;w.route=[];w.workGoal=null;
        log(w.name+" pegou esterco e está levando até a plantação.");continue;
      }
      w.progress+=scaled*bonus(w,t.type)/taskDuration(t);
      if(w.progress>=1){
        const order=state.orders.find(o=>o.id===t.id)||t;
        const originalObject=t.type==="clear"?World.at(state.world,t.x,t.y):null;
        const complete=finish(w,order);
        if(complete)showMapFeedback(t.x,t.y,"#ddf2a2");
        if(complete)state.orders=state.orders.filter(order=>order.id!==t.id);
        w.task=null;w.progress=0;w.route=[];w.routeTask=null;w.workGoal=null;
        if(complete){
          const result=Contracts.record(state,order,{kind:originalObject?.kind});
          if(result?.completed){
            log("✦ Mutirão concluído: "+result.plan.title+". Moral +"+result.reward+".");
            notify("✦ Mutirão concluído! Moral da equipe +"+result.reward+".");
          }
          if(result?.progressed)save();
        }
        recalcTasks();
      }
    }

    progressAccumulator+=scaled;
    if(progressAccumulator>=.8){
      progressAccumulator=0;
      const events=Progression.advance(state);
      if(events.length){
        for(const event of events)log(event.text);
        const chapter=events.find(event=>event.type==="chapter");
        if(chapter)notify(chapter.text);
        else if(events.some(event=>event.type==="discovery"))
          notify(events.find(event=>event.type==="discovery").text);
        // Não salvar em cada frame; conquistas relevantes são persistidas imediatamente.
        save();
      }
    }
    if(state.mode==="survival"){
      const deadWorkers=Survival.removeDeadWorkers(state);
      for(const dead of deadWorkers){
        state.deaths.push({name:dead.name,day:state.day,cause:"inanição"});
        state.deaths=state.deaths.slice(-100);
        log("☠ "+dead.name+" faleceu por inanição. A colônia perde um membro.");
      }
      if(deadWorkers.length){
        recalcTasks();
        assignIdleWorkers();
        save();
      }
      if(state.workers.length===0&&deadWorkers.length){
        log("☠ Todos os colonos pereceram. A colônia falhou.");
        gameOver();
      }
    }
  }
  // Chuva pixelada renderizada apenas na janela visível e sem novos assets.
  function drawClimate(bounds){
    if(Life.weather(state.day,state.world?.seed||1)!=="chuva")return;
    const time=animationsEnabled()?performance.now()/36:0;
    const left=bounds.x0*TILE,top=bounds.y0*TILE;
    const width=(bounds.x1-bounds.x0+1)*TILE,height=(bounds.y1-bounds.y0+1)*TILE;
    ctx.save();ctx.strokeStyle="rgba(164,211,235,.48)";ctx.lineWidth=1.3;
    ctx.beginPath();
    for(let i=0;i<100;i++){
      const x=left+(((i*173+time*.35)%width)+width)%width;
      const y=top+(((i*107+time*1.8)%height)+height)%height;
      ctx.moveTo(x,y);ctx.lineTo(x-3,y+9);
    }
    ctx.stroke();ctx.restore();
  }
  function valid(img){return img&&img.complete&&img.naturalWidth>0;}
  const validImage=valid;
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
      previewValid:buildHover?Boolean(getBuildEdit(buildHover.x,buildHover.y,eraseBuild).house):false,
      previewErase:eraseBuild
    });
    // Cabanas 2x2 são estruturas independentes, concluídas pelos trabalhadores.
    for(const home of state.homes.filter(h=>!h.legacy&&inView(h.x,h.y,4))){
      const x=home.x*TILE,y=home.y*TILE;
      // A casa habitada usa o mesmo construtor de sprites do menu inicial.
      const position=window.TillfolkHouse.positionForFootprint(x,y,2*TILE,2*TILE,1);
      window.TillfolkHouse.draw(ctx,{
        roof:sprite.roof,walls:sprite.walls,door:sprite.door
      },position.x,position.y,{scale:1});
      if(home.residentId==null)write("LIVRE",x+TILE,y-21,"#e5f7ae",9);
    }
    // Poços usam a sprite de estrutura existente no jogo, sem nova arte.
    if(valid(sprite.well))
      for(const well of state.wells||[])if(inView(well.x,well.y,2))
        ctx.drawImage(sprite.well,well.x*TILE-2,well.y*TILE-8,TILE+4,TILE+8);
    // Baús do pacote premium Sprout Lands, sem sprites improvisados.
    if(valid(chestImage)){
      for(const chest of state.chests||[])if(inView(chest.x,chest.y,2)){
        ctx.imageSmoothingEnabled=false;
        ctx.drawImage(chestImage,0,0,16,16,chest.x*TILE,chest.y*TILE-4,TILE,TILE);
      }
    }
    // Bancadas do atlas premium, colocadas somente após o colono concluir a obra.
    for(const ws of state.workstations||[]){
      if(!inView(ws.x,ws.y,2))continue;
      const x=ws.x*TILE,y=ws.y*TILE;
      if(valid(sprite.workstation))ctx.drawImage(sprite.workstation,x-4,y-20,40,49);
      else{ctx.fillStyle="#96724c";ctx.fillRect(x+3,y+7,26,13);}
    }
    if(state.rocket?.site&&inView(state.rocket.site.x,state.rocket.site.y,8))
      Space.draw(ctx,state.rocket,TILE,performance.now());
    // A vegetação e os colonos são desenhados juntos, ordenados pelos pés.
    for(const p of state.plots){
      if(!inView(p.x,p.y,1)||!p.tilled&&!p.seeded&&!p.produce&&!p.dirty&&!p.fertilized)continue;
      const x=p.x*TILE,y=p.y*TILE;
      // Solo natural não recebe quadrado verde: a ordem aparece só como
      // contorno temporário. O cultivo real permanece visível após a tarefa.
      if(p.tilled||p.seeded||p.produce){
        // Não cobrir a textura original com um bloco liso.
        part(sprite.dirt,0,80,16,16,x,y,TILE,TILE);
      }
      if(p.watered&&(p.tilled||p.seeded)){
        // Cor de terra encharcada no canteiro inteiro, mais reflexos discretos.
        ctx.fillStyle="rgba(40,66,80,.42)";
        ctx.fillRect(x+1,y+1,TILE-2,TILE-2);
        ctx.fillStyle="#3c5b62";
        ctx.fillRect(x+5,y+8,8,2);ctx.fillRect(x+18,y+22,9,2);
        ctx.fillStyle="#80b9b6";
        ctx.fillRect(x+7,y+8,4,1);ctx.fillRect(x+22,y+22,4,1);
      }
      if(p.fertilized){ctx.fillStyle="#6c7652";ctx.fillRect(x+4,y+8,3,3);ctx.fillRect(x+25,y+22,2,2);}
      if(p.seeded){
        if(p.growth<.10){
          // Mostrar a semente no centro logo após a ordem de plantio.
          ctx.fillStyle="#563925";ctx.fillRect(x+12,y+12,9,7);
          ctx.fillStyle="#d8bd78";ctx.fillRect(x+15,y+13,4,4);
          ctx.fillStyle="#f5dd99";ctx.fillRect(x+16,y+13,2,2);
        }else if(!Crops.draw(ctx,p.crop||"carrot",p.growth,x,y,TILE)){
          const stage=Math.max(1,Math.min(4,Math.ceil(p.growth*4)));
          part(sprite.crops,stage*16,0,16,16,x+1,y-13,30,30);
        }
      }
      if(p.produce&&!Crops.draw(ctx,p.crop||"carrot",1,x,y,TILE,true))
        part(sprite.crops,48,16,16,16,x+1,y-13,30,30);
      if(p.dirty&&!World.at(state.world,p.x,p.y))part(sprite.rocks,0,16,16,16,x,y,32,32);
    }
    // Blueprint azul após o solo atual: a forma planejada nunca fica encoberta
    // pela terra arada e some automaticamente quando a tarefa termina.
    const Blueprint=window.TillfolkBlueprints;
    const fieldPlans=new Map();
    for(const order of state.orders){
      if(order.type==="buildStation"&&inView(order.x,order.y,2)){
        const x=order.x*TILE,y=order.y*TILE;
        if(valid(sprite.workstation)){
          const sw=Math.min(32,sprite.workstation.naturalWidth);
          const sh=Math.min(32,sprite.workstation.naturalHeight);
          Blueprint.part(ctx,sprite.workstation,0,0,sw,sh,x-4,y-20,40,49,true,.55);
        }
        ctx.fillStyle="#56aee280";ctx.fillRect(x+2,y+2,TILE-4,TILE-4);
        ctx.strokeStyle="#a0e5ff";ctx.lineWidth=2;ctx.strokeRect(x+2,y+2,TILE-4,TILE-4);
      }else if(order.type==="buildRocket"&&inView(order.x,order.y,6)){
        Space.draw(ctx,{site:{x:order.x,y:order.y},
          stage:Math.min(Space.STAGES.length,order.stage+1)},TILE,performance.now(),true,true);
      }else if(order.type==="buildWell"&&inView(order.x,order.y,2)){
        if(valid(sprite.well))Blueprint.part(ctx,sprite.well,0,0,sprite.well.naturalWidth,
          sprite.well.naturalHeight,order.x*TILE-2,order.y*TILE-8,TILE+4,TILE+8,true,.7);
        Blueprint.frame(ctx,order.x*TILE,order.y*TILE,TILE,TILE,true);
      }else if(order.type==="buildChest"&&inView(order.x,order.y,2)){
        if(valid(chestImage))Blueprint.part(ctx,chestImage,0,0,16,16,
          order.x*TILE,order.y*TILE-4,TILE,TILE,true,.7);
        Blueprint.frame(ctx,order.x*TILE,order.y*TILE,TILE,TILE,true);
      }else if(order.type==="buildHome"&&inView(order.x,order.y,4))
        Blueprint.home(ctx,sprite,order.x,order.y,TILE,true);
      else if((order.type==="till"||order.type==="sow")&&inView(order.x,order.y,1)){
        const id=keyOf(order.x,order.y);
        const current=fieldPlans.get(id);
        fieldPlans.set(id,{x:order.x,y:order.y,grown:order.type==="sow"||Boolean(current?.grown)});
      }
    }
    for(const plan of fieldPlans.values()){
      const soil=findPlot(plan.x,plan.y);
      if(soil&&!soil.seeded&&!soil.produce)
        Blueprint.field(ctx,sprite,plan.x,plan.y,TILE,true,plan.grown||soil.tilled);
    }
    // Marcadores discretos: ordens prontas (creme) ou aguardando (marrom).
    const markers={clear:"L",till:"A",fertilize:"F",sow:"S",water:"R",harvest:"C",carry:"T",collectWater:"💧",collectManure:"E",buildHome:"⌂",buildStation:"W"};
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
    // Drops não somem após o efeito visual; ficam no solo até uma entrega real.
    const layers=[
      ...(state.groundItems||[]).filter(d=>inView(d.x,d.y,2))
        .map(drop=>({type:"drop",drop,depth:(drop.y+.7)*TILE})),
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
      if(type==="drop"){
        const d=item.drop,xx=d.x*TILE,yy=d.y*TILE;
        const mapped={twigs:"twig",wood:"log",stone:"pebble",
          grass:"grass",flower:"flowers",herbs:"herbs",mushroom:"mushroom"};
        if(mapped[d.kind])World.drawObject(ctx,{x:d.x,y:d.y,kind:mapped[d.kind],variant:0},sprite,TILE,part);
        else write(pickupTypes[d.kind]?.icon||"📦",xx+16,yy+17,"#fff4c8",17);
        ctx.fillStyle="#1c382ce9";ctx.fillRect(xx+19,yy+19,Math.max(12,7+String(d.qty).length*8),12);
        ctx.fillStyle="#ffedb8";ctx.textAlign="left";ctx.font="bold 10px system-ui";
        ctx.fillText(String(d.qty),xx+21,yy+28);
      }else if(type==="nature"){
        World.drawObject(ctx,item.object,sprite,TILE,part);
      }else if(type==="animal"){
        const a=item.animal,x=a.x*TILE,y=a.y*TILE;
        // A fauna e as vacas domesticadas usam arte final transparente.
        const clip=Exploration.spriteFrame(a,performance.now(),
          animationsEnabled()&&simSpeed>0);
        const picture=sprite[clip.key];
        const src=valid(picture)?Exploration.frameRect(clip,picture):null;
        if(src){
          const left=Math.round(x-clip.drawW/2);
          const top=Math.round(y-clip.drawH+6-(clip.lift||0));
          ctx.save();
          ctx.fillStyle="rgba(24,48,36,.19)";
          ctx.beginPath();
          ctx.ellipse(Math.round(x),Math.round(y+4),
            Math.max(5,Math.round(clip.drawW*.31)),3,0,0,Math.PI*2);
          ctx.fill();
          ctx.restore();
          if(clip.flip){
            ctx.save();
            ctx.translate(left+clip.drawW,0);
            ctx.scale(-1,1);
            part(picture,src.sx,src.sy,src.sw,src.sh,0,top,clip.drawW,clip.drawH);
            ctx.restore();
          }else part(picture,src.sx,src.sy,src.sw,src.sh,
            left,top,clip.drawW,clip.drawH);
        }else if(!a.wild){
          part(sprite.cow,0,0,32,32,x-20,y-32,40,38);
        }
        if(!a.wild&&a.manure>0)
          write("💩 "+a.manure,x+5,y-33,"#f3dcb0",10);
      }else{
        const w=item.worker,px=w.x*TILE,py=w.y*TILE;
        if(w.carryingWater)write("💧",px+18,py-32,"#b6f3fe",13);
        if(w.carryingManure)write("💩",px+18,py-32,"#eac7a4",13);
        if((w.haul?.cargo||0)>0)write(pickupTypes[w.haul.kind]?.icon||"📦",px+17,py-31,"#f4eac1",12);
        ctx.fillStyle="#223c3180";ctx.beginPath();ctx.ellipse(px,py-2,11,4,0,0,Math.PI*2);ctx.fill();
        const active=tasks.find(t=>t.id===w.task);
        const working=Boolean(active&&!w.moving&&w.progress>0);
        // A troca dos atlas não deve inverter a direção do personagem.
        // Parado = quadro fixo; andando = caminhada; trabalhando = ação.
        if(working&&!handPickup(active)&&active.type!=="water"&&valid(sprite.actions)){
          const image=getWorkerSprite(w,true);
          const actionGroup=actionRow[active.type]??0;
          const actionDirection=actionRowFor[w.facing]??0;
          const frame=simSpeed===0||!animationsEnabled()?0:Math.floor(performance.now()/250)%2;
          part(image,frame*48,(actionGroup+actionDirection)*48,48,48,px-34,py-51,68,68);
        }else{
          const image=getWorkerSprite(w);
          const direction=walkingRowFor[w.facing]??0;
          const row=direction+(w.moving?4:0);
          const frame=w.moving&&animationsEnabled()?Math.floor(w.walkFrame||0)%8:0;
          // Coleta manual: o colono dá pulinhos rápidos ao pegar do chão, sem usar o machado.
          const hopping=working&&handPickup(active)&&animationsEnabled();
          const jump=hopping?Math.abs(Math.sin(performance.now()/130))*7:0;
          part(image,frame*48+11,row*48+12,26,24,px-20,py-34-jump,40,40);
        }
        if(!valid(sprite.premium)&&!valid(sprite.worker)){
          ctx.fillStyle=w.color;ctx.fillRect(px-10,py-30,20,27);
        }
        // A irrigação usa as gotas verdes do atlas local; não mostra pedras como água.
        if(working&&active.type==="water"&&valid(sprite.wateringFx)){
          const fxFrame=simSpeed===0||!animationsEnabled()?0:Math.floor(performance.now()/150)%9;
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
    World.drawAmbient(ctx,state.world,animationsEnabled()?performance.now():0,TILE);
    // Iluminação somente no mundo; HUD, menus, missão e prévias continuam legíveis.
    Night.paint(ctx,state.minutes,visibleBounds,TILE,state.workers,state.homes,state.workstations);
    drawClimate(visibleBounds);
    drawTutorialSpeech(visibleBounds);
    // Prévia ANTES de construir: azul transparente para posição válida,
    // vermelho transparente se a regra de terreno/ocupação impedir a obra.
    if(playing&&selectedTool==="construir"&&buildHover&&!panPointer&&!areaSelection){
      const {x,y}=buildHover;
      if(x>=0&&y>=0&&x<W&&y<H){
        const valid=Boolean(getBuildEdit(x,y,eraseBuild).house);
        if(buildLayer==="home")Blueprint.home(ctx,sprite,x,y,TILE,valid);
        else if(buildLayer==="rocket")Space.draw(ctx,{site:{x,y},
          stage:Math.min(Space.STAGES.length,state.rocket.stage+1)},TILE,
          performance.now(),true,valid);
        else if(buildLayer==="well"){
          if(validImage(sprite.well))Blueprint.part(ctx,sprite.well,0,0,
            sprite.well.naturalWidth,sprite.well.naturalHeight,
            x*TILE-2,y*TILE-8,TILE+4,TILE+8,valid,.70);
          Blueprint.frame(ctx,x*TILE,y*TILE,TILE,TILE,valid);
        }
        else if(buildLayer==="chest"){
          if(validImage(chestImage))Blueprint.part(ctx,chestImage,0,0,16,16,
            x*TILE,y*TILE-4,TILE,TILE,valid,.72);
          Blueprint.frame(ctx,x*TILE,y*TILE,TILE,TILE,valid);
        }
        else if(buildLayer==="field")Blueprint.field(ctx,sprite,x,y,TILE,valid,true);
        else if(buildLayer==="station"){
          if(validImage(sprite.workstation)){
            const img=sprite.workstation;
            Blueprint.part(ctx,img,0,0,img.naturalWidth,img.naturalHeight,
              x*TILE-4,y*TILE-20,40,49,valid,.7);
          }
          ctx.fillStyle=valid?"#56aee844":"#e97f7544";
          ctx.fillRect(x*TILE+2,y*TILE+2,TILE-4,TILE-4);
          ctx.strokeStyle=valid?"#acebff":"#ffac9e";ctx.lineWidth=2;
          ctx.strokeRect(x*TILE+2,y*TILE+2,TILE-4,TILE-4);
        }
      }
    }
    // Só o objeto alvo de uma tentativa inválida fica vermelho.
    if(blockedAttempt&&performance.now()<blockedAttempt.until&&inView(blockedAttempt.x,blockedAttempt.y,1)){
      const px=blockedAttempt.x*TILE,py=blockedAttempt.y*TILE;
      ctx.fillStyle="#da353550";ctx.fillRect(px+1,py+1,TILE-2,TILE-2);
      ctx.strokeStyle="#ff6f62";ctx.lineWidth=3;ctx.strokeRect(px+2,py+2,TILE-4,TILE-4);
      write("!",px+TILE/2,py-4,"#ffb6a8",17);
    }
    // Prévia de semente seguindo o cursor, usando o ícone real do cultivo selecionado.
    if(playing&&hoveredTile&&!areaSelection&&(selectedTool==="sow"||
       selectedTool==="universal"&&nextUniversalOrder(hoveredTile.x,hoveredTile.y)==="sow")){
      const {x,y}=hoveredTile,p=findPlot(x,y);
      if(p){
        const canPlant=p.tilled&&!p.seeded&&state.cropSeeds[state.selectedCrop]>0&&!p.dirty;
        Blueprint.field(ctx,sprite,x,y,TILE,canPlant,true);
        const icon=Crops.imageFor(state.selectedCrop,"icon");
        if(icon?.complete&&icon.naturalWidth>=16)
          Blueprint.part(ctx,icon,0,0,16,16,x*TILE+8,y*TILE+5,16,16,canPlant,.8);
      }
    }
    // Ordem sob o cursor: destaque de tile, não adiciona tarefas automaticamente.
    if(playing&&hoveredTile&&selectedTool!=="construir"&&!panPointer){
      const {x,y}=hoveredTile,validTile=x>=0&&x<W&&y>=0&&y<H;
      if(validTile){
        const px=x*TILE,py=y*TILE;
        const type=selectedTool==="universal"?nextUniversalOrder(x,y):selectedTool;
        const restriction=type&&Crafting.blocked(state,type,World.at(state.world,x,y));
        const canOrder=!restriction&&Boolean(findPlot(x,y)||selectedTool==="collectWater"||selectedTool==="remover");
        ctx.fillStyle=canOrder?"#f8ec9440":"#ed424264";
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
      const blueArea=selectedTool==="construir"&&buildLayer==="field";
      ctx.fillStyle=selectionPointer?.cancel?"#ee95804d":blueArea?"#48b7ff48":"#e6f7ad3d";
      ctx.fillRect(x0*TILE,y0*TILE,(x1-x0+1)*TILE,(y1-y0+1)*TILE);
      ctx.lineWidth=2;ctx.strokeStyle=selectionPointer?.cancel?"#ffb19c":blueArea?"#a5e5ff":"#f9ed9b";
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
    // Drop estilo farming: cai e quica TRÊS vezes, com altura decrescente.
    // Desenha o mesmo sprite usado pelo objeto no mapa, não uma folha genérica.
    for(let i=pickupEffects.length-1;i>=0;i--){
      const p=pickupEffects[i],elapsed=(now-p.start)/2000;
      if(elapsed>=1){pickupEffects.splice(i,1);continue;}
      const bounceEdges=[0,.33,.61,.82];
      const bounceHeights=[30,17,8];
      let height=0;
      for(let k=0;k<3;k++){
        if(elapsed>=bounceEdges[k]&&elapsed<bounceEdges[k+1]){
          const phase=(elapsed-bounceEdges[k])/(bounceEdges[k+1]-bounceEdges[k]);
          height=bounceHeights[k]*Math.sin(Math.PI*phase);
          break;
        }
      }
      const landingX=(p.x+.5)*TILE,landingY=(p.y+.5)*TILE;
      ctx.save();
      ctx.globalAlpha=elapsed>.87?Math.max(0,(1-elapsed)/.13):1;
      // Sombra fixa no terreno deixa os três impactos bem claros.
      ctx.fillStyle="#1c362a66";ctx.beginPath();
      ctx.ellipse(landingX,landingY-1,10,3,0,0,Math.PI*2);ctx.fill();
      ctx.translate(0,-height);
      let rendered=false;
      const naturalKinds={twigs:"twig",wood:"log",stone:"pebble",
        mushroom:"mushroom",grass:"grass",herbs:"herbs",flower:"flowers"};
      const kind=naturalKinds[p.key];
      if(kind){
        World.drawObject(ctx,{x:p.x,y:p.y,kind,variant:0},sprite,TILE,part);
        rendered=true;
      }else if(p.key==="chest"&&valid(chestImage)){
        part(chestImage,0,0,16,16,p.x*TILE,p.y*TILE-4,TILE,TILE);
        rendered=true;
      }else if(p.key==="station"&&valid(sprite.workstation)){
        ctx.drawImage(sprite.workstation,p.x*TILE-4,p.y*TILE-20,40,49);rendered=true;
      }else if(p.key==="home"){
        const roof=sprite.roof;
        if(valid(roof)){part(roof,16,0,16,16,p.x*TILE,p.y*TILE-12,32,32);rendered=true;}
      }else if(Crafting.itemFrame(p.key)){
        const frame=Crafting.itemFrame(p.key);
        if(valid(workshopAtlas)){part(workshopAtlas,frame.x,frame.y,frame.w,frame.h,
          p.x*TILE+4,p.y*TILE+1,24,24);rendered=true;}
      }else if(["seed","crop","food"].includes(p.key)){
        const icon=Crops.imageFor(p.crop||state.selectedCrop,"icon");
        if(valid(icon)){part(icon,0,0,16,16,p.x*TILE+5,p.y*TILE,23,23);rendered=true;}
      }
      if(!rendered)write(p.icon,landingX,landingY-12,"#fff4cc",18);
      ctx.restore();
      if(elapsed>.84)write("+"+p.quantity,landingX,landingY-38,"#fff2a9",11);
    }
  }
  // Colônias têm conversas breves e intervaladas, não tutoriais repetidos sem parar.
  // O balão aparece próximo de um trabalhador visível e não cobre sua placa de nome.
  function drawTutorialSpeech(visibleBounds){
    if(!playing||document.querySelector("dialog[open]"))return;
    const quest=Missions.current(state),workers=state.workers;
    if(!quest||!workers?.length)return;
    const now=performance.now();
    const step=state.tutorial.step;
    if(speechScene.step!==step){
      speechScene.step=step;speechScene.sequence=0;speechScene.text="";
      speechScene.workerId=null;speechScene.until=0;speechScene.next=now+800;
    }
    if(now>=speechScene.next){
      const visible=workers.filter(w=>Number.isFinite(w.x)&&Number.isFinite(w.y)&&
        w.x>=visibleBounds.x0+1&&w.x<=visibleBounds.x1-1&&
        w.y>=visibleBounds.y0+3&&w.y<=visibleBounds.y1-1);
      if(!visible.length){
        speechScene.text="";speechScene.until=0;speechScene.next=now+4000;
        return;
      }
      // Checar se o jogador já marcou o serviço. Nunca criar tarefas pelo diálogo.
      const desired=quest.key==="workstation"?"buildStation":
        ["hoe","wateringCan","axe"].includes(quest.key)?null:
        ["grass","seed","tree"].includes(quest.key)?"clear":
        ({till:"till",sow:"sow",water:"water",
          harvest:"harvest",carry:"carry",home:"buildHome",plan:"buildHome"})[quest.key];
      const relevantOrders=state.orders.filter(order=>order.type===desired);
      const assigned=visible.filter(w=>relevantOrders.some(order=>order.id===w.task));
      const hasWork=relevantOrders.length>0||
        (["plan","home"].includes(quest.key)&&state.orders.some(order=>["till","sow","buildHome"].includes(order.type)));
      const mode=speechScene.sequence===0?"intro":hasWork?"working":"waiting";
      // Alternar falantes de maneira estável. Se um estiver trabalhando, pode responder.
      const speaker=assigned.length&&mode==="working"?
        assigned[speechScene.sequence%assigned.length]:
        visible[speechScene.sequence%Math.min(visible.length,2)];
      speechScene.workerId=speaker.id;
      speechScene.text=Missions.speech(state,speaker,mode,Math.floor(speechScene.sequence/2));
      speechScene.sequence++;
      speechScene.until=now+6500;
      speechScene.next=now+16500;
    }
    if(now>=speechScene.until||!speechScene.text)return;
    const worker=workers.find(w=>w.id===speechScene.workerId);
    if(!worker||!Number.isFinite(worker.x)||!Number.isFinite(worker.y))return;
    // Não desenhar balões cortados quando o trabalhador está fora da câmera.
    if(worker.x<visibleBounds.x0||worker.x>visibleBounds.x1||
      worker.y<visibleBounds.y0+2||worker.y>visibleBounds.y1)return;
    ctx.save();
    ctx.font="bold 10px system-ui,sans-serif";
    const width=248,artSize=38,inner=width-22-artSize-6,words=speechScene.text.split(/\s+/);
    const lines=[];let line="";
    for(const word of words){
      const proposal=line?line+" "+word:word;
      if(line&&ctx.measureText(proposal).width>inner){
        lines.push(line);line=word;
      }else line=proposal;
    }
    if(line)lines.push(line);
    const display=lines.slice(0,5),height=Math.max(54,16+display.length*15);
    const px=Math.round(worker.x*TILE),py=Math.round(worker.y*TILE);
    const left=Math.max(5,Math.min(W*TILE-width-5,px-width/2));
    // Placas de nome ocupam aproximadamente py-67: preservar espaço entre elas e o balão.
    const top=Math.max(5,py-111-height);
    const alpha=Math.min(1,(speechScene.until-now)/400);
    ctx.globalAlpha=alpha;
    ctx.fillStyle="#fff1d4";ctx.strokeStyle="#395945";ctx.lineWidth=2.5;
    ctx.beginPath();ctx.roundRect(left,top,width,height,8);ctx.fill();ctx.stroke();
    const tailX=Math.max(left+15,Math.min(left+width-15,px));
    ctx.beginPath();ctx.moveTo(tailX-7,top+height-1);
    ctx.lineTo(tailX,top+height+8);ctx.lineTo(tailX+7,top+height-1);
    ctx.closePath();ctx.fill();ctx.stroke();
    Missions.drawTarget(ctx,quest,left+8,top+Math.round((height-artSize)/2),artSize);
    ctx.strokeStyle="#789b73";ctx.lineWidth=1;
    ctx.strokeRect(left+8.5,top+Math.round((height-artSize)/2)+.5,artSize-1,artSize-1);
    ctx.fillStyle="#273b2c";ctx.textAlign="left";
    display.forEach((message,index)=>ctx.fillText(message,left+artSize+18,top+20+index*15));
    ctx.restore();
  }
  function renderColonyPanel(){
    if(!state)return;
    const life=Life.normalize(state);
    const climate=Life.weather(state.day,state.world?.seed||1);
    Council.render(state,$("#council-notice"),$("#council-panel"),Life,playing);
    const environment=$("#colony-life-environment");
    if(environment)environment.textContent="🌿 "+Life.season(state.day)+" · "+
      Life.weatherLabels[climate]+" · Dia "+state.day;
    const button=$("#colony-auto-farm");
    if(button){button.setAttribute("aria-pressed",String(life.autoFarm));
      button.textContent=life.autoFarm?"🌱 Automação: ativada":"🌱 Automação: desligada";}
    const level=life.researchLevel,required=Life.cost(state);
    const gate=Life.researchLock(state);
    const research=$("#colony-research-status");
    if(research)research.textContent="Nível "+level+"/4 · "+life.researchPoints+
      " pontos de conhecimento · Próxima melhoria: "+
      (Life.TECH[level]||"Todas concluídas")+" ("+required+" pontos)"+
      (gate?" · 🔒 "+gate:"");
    const upgrade=$("#colony-research-upgrade");
    if(upgrade){upgrade.disabled=level>=4||life.researchPoints<required||Boolean(gate);
      upgrade.title=gate||"Pesquisar a próxima melhoria";}
    const workers=$("#colony-life-workers");
    // Não reconstruir <select> enquanto o jogador escolhe um turno no mobile.
    if(workers&&!workers.contains(document.activeElement))workers.innerHTML=state.workers.map(w=>
      '<div class="colony-life-worker"><strong>'+escapeHtml(w.name)+'</strong>'+
      '<small>'+(w.resting?"💤 Descansando":w.energy<25?"⚠️ Exausto":"Disponível")+'</small>'+
      '<span class="colony-worker-needs"><span>⚡ Energia '+Math.round(w.energy||0)+'%</span>'+
      '<span>♥ Moral '+Math.round(w.morale||0)+'%</span></span>'+
      '<meter min="0" max="100" value="'+Math.round(w.energy||0)+'" aria-label="Energia"></meter>'+
      '<label class="colony-shift-label">Horário de trabalho <select data-colony-shift="'+w.id+'" aria-label="Turno de '+escapeHtml(w.name)+'">'+
      '<option value="day" '+(w.shift==="day"||!w.shift?"selected":"")+'>☀️ Diurno · dormir 21h–6h</option>'+
      '<option value="night" '+(w.shift==="night"?"selected":"")+'>🌙 Noturno · dormir 8h–16h</option>'+
      '<option value="flex" '+(w.shift==="flex"?"selected":"")+'>⚡ Flexível · dormir por cansaço</option>'+
      '</select></label></div>').join("");
  }
  function renderProgressionPanel(){
    if(!state)return;
    const journey=Progression.status(state),overview=$("#progression-overview"),chapters=$("#progression-chapters");
    if(!overview||!chapters)return;
    const current=journey.current;
    overview.innerHTML='<div class="progression-overview"><div class="progression-overview-head">'+
      '<strong>'+(journey.allDone?'🏆 Jornada principal concluída':
        current.icon+' '+escapeHtml(current.title))+'</strong>'+
      '<span>'+journey.total+'/'+journey.maximum+' conquistas</span></div>'+
      '<progress max="'+journey.maximum+'" value="'+journey.total+'" aria-label="Conquistas da colônia"></progress>'+
      '<small>🗺️ '+journey.discovered+'/5 continentes explorados · '+
      (journey.allDone?'Continue desenvolvendo sua colônia livremente.':
        'Próximo objetivo: '+escapeHtml(
          current.objectives.find(o=>!o.done)?.title||'Concluir o capítulo'))+
      '</small></div>';
    chapters.innerHTML=journey.chapters.map(chapter=>
      '<section class="progression-chapter" data-current="'+(chapter.index===current.index&&!journey.allDone)+'" data-done="'+chapter.complete+'">'+
      '<div class="progression-chapter-header"><div class="progression-chapter-heading">'+
      '<strong>'+chapter.icon+' Capítulo '+(chapter.index+1)+' · '+escapeHtml(chapter.title)+'</strong>'+
      '<small>'+escapeHtml(chapter.description)+'</small></div>'+
      '<span class="progression-chapter-count">'+chapter.done+'/'+chapter.total+'</span></div>'+
      '<progress max="'+chapter.total+'" value="'+chapter.done+'" aria-label="Progresso do capítulo '+(chapter.index+1)+'"></progress>'+
      '<ul class="progression-tasks">'+chapter.objectives.map(goal=>
        '<li data-done="'+goal.done+'"><span class="progression-marker">'+(goal.done?'✓':'○')+'</span>'+
        '<div><strong>'+escapeHtml(goal.title)+'</strong><small>'+
        (goal.done?'Concluído!':escapeHtml(goal.hint))+
        ' · +'+goal.reward+' conhecimento</small></div></li>').join('')+'</ul>'+
      '<div class="progression-prize">✦ '+escapeHtml(chapter.unlock)+'</div></section>'
    ).join('');
    renderSpaceProgram();
    const continents=$("#progression-continents");
    if(continents)continents.innerHTML=Object.entries(Progression.BIOMES).map(([id,area])=>{
      const visited=state.progression?.discovered?.[id],protection=Exploration.PROTECTION[id],
        gear=Exploration.GEAR[protection.gear];
      return '<div class="progression-continent" data-discovered="'+Boolean(visited)+'">'+
        '<span class="progression-continent-icon">'+area.icon+'</span><div>'+
        '<strong>'+escapeHtml(area.name)+'</strong>'+
        '<small>'+(visited?'✓ '+escapeHtml(visited.colonist||'Explorador')+
          ' · Dia '+Math.max(1,Number(visited.day)||1):
          '🔒 Necessário: '+gear.icon+' '+escapeHtml(gear.name))+
        '</small></div></div>';
    }).join('');
  }
  function renderSpaceProgram(){
    if(!state)return;
    const rocket=Space.normalize(state),status=$("#space-mission-status"),
      stages=$("#space-mission-stages");
    if(!status||!stages)return;
    const requirement=Space.unlock(state);
    const release=Space.ready(state),pending=state.orders.find(o=>o.type==="buildRocket");
    status.textContent=rocket.launched?
      "✓ Foguete lançado no dia "+rocket.launchDay+" · Tripulantes: "+rocket.crew.join(", "):
      (rocket.stage<Space.STAGES.length?
        "Etapa "+(rocket.stage+1)+"/4 · "+(requirement||
          (pending?"Projeto ativo: os colonos estão entregando materiais.":Space.STAGES[rocket.stage].description)):
        (release||"✓ Nave concluída! Equipe e suprimentos prontos. Autorize a partida."));
    stages.innerHTML=Space.STAGES.map((part,i)=>{
      const finished=i<rocket.stage,active=i===rocket.stage&&!rocket.launched;
      const cost=Crafting.formatCost(part.cost);
      const delivery=active&&pending?
        " · Entregue: "+Object.entries(part.cost).map(([kind,num])=>
          Math.min(num,pending.delivered?.[kind]||0)+"/"+num+" "+kind).join(", "):"";
      return '<div class="space-mission-step" data-finished="'+finished+
        '" data-active="'+active+'"><span class="space-mission-step-icon">'+part.icon+
        '</span><div><strong>'+(finished?'✓ ':'')+(i+1)+'. '+escapeHtml(part.name)+
        '</strong><small>'+escapeHtml(part.description)+
        ' · '+escapeHtml(cost+delivery)+'</small></div></div>';
    }).join('');
    const launchButton=$("#space-mission-launch");
    launchButton.hidden=rocket.launched||rocket.stage<Space.STAGES.length;
    launchButton.disabled=Boolean(release);
    launchButton.title=release||"Autorizar partida de quatro tripulantes";
    const buildButton=$("#space-mission-build");
    buildButton.hidden=rocket.launched||rocket.stage>=Space.STAGES.length;
    buildButton.textContent=rocket.site?"🧱 Planejar próxima etapa":"🧱 Escolher local da plataforma";
  }
  function openRocketConstruction(){
    if(!state||!playing)return;
    const problem=Space.unlock(state);
    if(problem){notify(problem);return;}
    if($("#progression-dialog").open)$("#progression-dialog").close();
    setTool("construir");
    $('[data-build-layer="rocket"]').click();
    const rocket=Space.normalize(state);
    if(!rocket.site){
      notify("🚀 Escolha uma área livre 3×3 na ilha central para a plataforma.");
    }else if(rocket.stage<Space.STAGES.length){
      const place=rocket.site;
      if(!state.orders.some(o=>o.type==="buildRocket"))
        paintHouse(place.x,place.y,false);
      focusCameraAt(place.x+1.5,place.y+1.5);
    }
    updateBuildPanel();
  }
  function performRocketLaunch(){
    if(!state||!playing)return;
    const result=Space.launch(state);
    if(result.error){notify("🚀 "+result.error);refresh();return;}
    const progressEvents=Progression.advance(state);
    for(const item of progressEvents)log(item.text);
    assignHomes();recalcTasks();
    simSpeed=0;updateSpeed();
    log("🚀 O foguete decolou! "+result.crew.join(", ")+" partiram no dia "+result.day+".");
    if($("#progression-dialog").open)$("#progression-dialog").close();
    if($("#colony-life-dialog").open)$("#colony-life-dialog").close();
    const victory=$("#rocket-victory-dialog");
    $("#rocket-victory-copy").textContent="No dia "+result.day+
      ", o foguete Última Esperança deixou o planeta superpovoado. A equipe agora busca um novo mundo.";
    $("#rocket-victory-crew").textContent="Tripulação: "+result.crew.join(" · ");
    refresh();save();victory.showModal();
  }
  $("#space-mission-build").addEventListener("click",openRocketConstruction);
  $("#space-mission-focus").addEventListener("click",()=>{
    const rocket=Space.normalize(state);
    if(!rocket.site){openRocketConstruction();return;}
    $("#progression-dialog").close();
    focusCameraAt(rocket.site.x+1.5,rocket.site.y+1.5);
    notify("⌖ Plataforma do foguete localizada.");
  });
  $("#space-mission-launch").addEventListener("click",performRocketLaunch);
  $("#rocket-build-next").addEventListener("click",openRocketConstruction);
  $("#rocket-build-launch").addEventListener("click",performRocketLaunch);
  const rocketVictory=$("#rocket-victory-dialog");
  rocketVictory.addEventListener("cancel",event=>event.preventDefault());
  $("#rocket-victory-continue").addEventListener("click",()=>{
    rocketVictory.close();
    simSpeed=1;updateSpeed();refresh();save();
    notify("A base terrestre segue ativa. A missão foi concluída!");
  });
  $("#rocket-victory-menu").addEventListener("click",()=>{
    rocketVictory.close();save();$("#game-return-title").click();
  });
    function openProgressionDialog(){
    if(!playing||!state)return;
    renderProgressionPanel();
    if(!$("#progression-dialog").open)$("#progression-dialog").showModal();
  }
  $("#progression-open").addEventListener("click",openProgressionDialog);
  $("#progression-focus-open").addEventListener("click",openProgressionDialog);
  $("#colony-contracts").addEventListener("click",event=>{
    if(!playing||!state)return;
    const choice=event.target.closest("[data-contract-choice]");
    if(choice){
      const response=Contracts.select(state,choice.dataset.contractChoice);
      if(!response.ok){notify(response.reason);return;}
      log("✦ Mutirão escolhido: "+response.plan.title+".");
      notify("✦ Novo mutirão: "+response.plan.title);
      Contracts.render(state,$("#colony-contracts"),playing);save();return;
    }
    const action=event.target.closest("[data-contract-action]");
    if(action){
      const plan=Contracts.current(state);
      if(!plan)return;
      document.querySelector('.tool[data-tool="'+plan.action+'"]')?.click();
      notify(plan.action==="construir"?"Escolha o projeto em Objetos.":"Clique no alvo apropriado com Universal.");
    }
  });
  $("#council-notice").addEventListener("click",()=>$("#colony-life-open").click());
  $("#council-panel").addEventListener("click",event=>{
    const selected=event.target.closest("button[data-council-choice]");
    if(!playing||!state||!selected||selected.disabled)return;
    const result=Council.decide(state,selected.dataset.councilChoice);
    if(!result.ok){notify(result.reason);return;}
    log("🗣️ Conselho do Vale: "+result.option.title+" · "+result.cost+" alimento(s).");
    notify("Decisão registrada. Próximo conselho no dia "+result.nextDay+".");
    refresh();save();
  });
  $("#colony-life-open").addEventListener("click",()=>{
    if(!playing||!state)return;
    renderColonyPanel();
    const dialog=$("#colony-life-dialog");
    if(!dialog.open)dialog.showModal();
  });
  $("#colony-life-workers").addEventListener("change",event=>{
    const selector=event.target.closest("select[data-colony-shift]");
    if(!selector||!state)return;
    const worker=state.workers.find(w=>String(w.id)===selector.dataset.colonyShift);
    if(!worker||!["day","night","flex"].includes(selector.value))return;
    worker.shift=selector.value;
    worker.resting=false;worker.atRest=false;
    log("🛏️ Turno de "+worker.name+" alterado para "+
      (selector.value==="night"?"noturno":selector.value==="flex"?"flexível":"diurno")+".");
    notify("Novo turno de "+worker.name+" salvo.");
    save();
  });
  $("#colony-auto-farm").addEventListener("click",()=>{
    if(!state)return;
    const life=Life.normalize(state);
    life.autoFarm=!life.autoFarm;
    notify(life.autoFarm?"🌱 Rotina agrícola ativada.":"Rotina agrícola desligada.");
    renderColonyPanel();save();
  });
  $("#colony-research-upgrade").addEventListener("click",()=>{
    if(!state)return;
    const result=Life.research(state);
    if(result.error){notify(result.error);return;}
    log("🔬 Pesquisa concluída: "+result.name+".");
    notify("🔬 "+result.name+" desbloqueada!");
    renderColonyPanel();refresh();save();
  });
  function refresh(){
    if(!state)return;
    renderPickupHistory();
    if(playing)Missions.render(state);else $("#mission-card").hidden=true;
    Contracts.render(state,$("#colony-contracts"),playing);
    Council.render(state,$("#council-notice"),$("#council-panel"),Life,playing);
    const set=(id,value)=>{$(id).textContent=value;};
    set("#day",String(state.day).padStart(2,"0"));
    const m=Math.floor(state.minutes);set("#clock",String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0"));
    const phase=Night.phase(state.minutes),label=$("#day-night-phase");
    if(label){label.textContent=Night.labels[phase];label.dataset.phase=phase;}
    const climate=Life.weather(state.day,state.world?.seed||1);
    const colonyToggle=$("#colony-life-open");
    if(colonyToggle)colonyToggle.title=Life.season(state.day)+" · "+
      Life.weatherLabels[climate]+" · Sono, pesquisa e automação";
    if($("#colony-life-dialog")?.open)renderColonyPanel();
    const journey=Progression.status(state);
    const focus=$("#progression-focus");
    if(focus){
      // O tutorial orienta o início. A jornada assume depois, sem duplicar HUDs.
      const tutorialRunning=state.tutorial?.active===true&&!state.tutorial?.finished;
      focus.hidden=tutorialRunning||journey.allDone;
      if(!focus.hidden){
        $("#progression-focus-chapter").textContent=journey.current.icon+
          " Capítulo "+(journey.current.index+1)+"/"+journey.chapters.length+" · "+
          journey.current.title;
        const next=journey.current.objectives.find(objective=>!objective.done);
        $("#progression-focus-goal").textContent=next?next.title:"Próxima conquista";
      }
    }
    const minerPanel=$("#mineral-progression-list");
    if(minerPanel)minerPanel.innerHTML=Minerals.progress(state).map(zone=>
      '<div class="mineral-zone" data-discovered="'+zone.found+'"><span>'+
      zone.icon+' '+escapeHtml(zone.name)+'</span><strong>'+
      (zone.found?'✓ '+escapeHtml(zone.label):'🔒 '+escapeHtml(zone.label))+
      '</strong><small>'+(zone.tier?'Picareta nível '+zone.tier:'Coleta manual')+
      ' · Depósitos: '+zone.oreAvailable+'</small></div>').join("");
    const count=$("#progression-hud-count");
    if(count)count.textContent=journey.total+"/"+journey.maximum;
    if(buildLayer==="rocket"&&selectedTool==="construir")updateBuildPanel();
    const progressionButton=$("#progression-open");
    if(progressionButton)progressionButton.title="Jornada: "+journey.current.title+
      " · "+journey.total+" de "+journey.maximum+" conquistas";
    if($("#progression-dialog")?.open)renderProgressionPanel();
    for(const key of ["seeds","water","food"])set("#"+key,state[key]);
    set("#worker-count",state.workers.length);set("#task-count",tasks.length);
    const manureOrderButton=$('[data-order-type="collectManure"]');
    if(manureOrderButton)manureOrderButton.hidden=!state.animals.some(a=>!a.wild);
    const wildCounter=$("#wildlife-count");
    if(wildCounter)wildCounter.textContent=String(state.animals.filter(a=>a.wild).length);
    if($("#homes-count"))$("#homes-count").textContent=state.homes.length+"/"+state.workers.length;
    set("#hud-workers",state.workers.length);set("#hud-tasks",tasks.length);
    $("#order-count").textContent=String(tasks.length);
    if($("#selected-crop-label"))$("#selected-crop-label").textContent=(Crops.get(state.selectedCrop)?.name||"Cenoura")+" · "+(state.cropSeeds[state.selectedCrop]||0)+" sementes";
    const stock=state.inventory||{};
    const inventoryItems=[
      ["twigs","🌿","Gravetos"],["gravel","🪨","Cascalho"],
      ["wood","🪵","Madeira"],["stone","🪨","Pedra"],
      ["bronze","🥉","Bronze"],["iron","⚙️","Ferro"],["gold","🟨","Ouro"],
      ["diamond","💎","Diamante"],["bauxite","🔶","Bauxita"],
      ["aluminumAlloy","🔩","Liga de Al."],["goldCircuit","🔌","Circuitos"],
      ["mushroom","🍄","Cogumelos"],["flower","🌸","Flores"],
      ["herbs","🌿","Ervas"],["grass","🌾","Fibras"],["manure","💩","Esterco"]
    ];
    $("#inventory").innerHTML=inventoryItems.map(([kind,icon,label])=>
      '<div class="resource-slot" title="'+label+': '+Logistics.available(state,kind)+' (no chão, baús ou estoque)" aria-label="'+label+': '+Logistics.available(state,kind)+'">'+
      '<span class="resource-art" aria-hidden="true">'+icon+'</span>'+
      '<span class="resource-amount">'+Logistics.available(state,kind)+'</span>'+
      '<small>'+label+'</small></div>').join("")+
      '<div class="resource-slot housing" aria-label="Moradias: '+state.homes.length+' de '+state.workers.length+'">'+
      '<span class="resource-art" aria-hidden="true">⌂</span><span class="resource-amount">'+state.homes.length+'/'+state.workers.length+'</span><small>Casas</small></div>';
    set("#farm-title",state.farmName||"Minha Fazenda");
    set("#mode-label",(state.mode==="relaxed"?"FAZENDA TRANQUILA":"SOBREVIVÊNCIA")+" · DIA "+state.day);
    $("#status").textContent=simSpeed===0?"Ⅱ Simulação pausada":"● Fazenda em funcionamento";

    // S3: o prognóstico usa o consumo individual esperado, não um custo diário fictício.
    if(state.mode==="survival"){
      const stats=Survival.getStats(state);
      ["survival-population","survival-food","survival-days","survival-consumption","survival-alert"]
        .forEach(id=>$("#"+id).hidden=false);
      set("#survival-population-count",stats.population);
      set("#survival-food-count",stats.food);
      set("#survival-consumption-count",stats.consumptionPerDay.toFixed(1));
      set("#survival-days-count",stats.daysRemaining===null?"—":stats.daysRemaining.toFixed(1));
      const alertEl=$("#survival-alert");
      alertEl.className="metric survival-metric alert "+stats.alert;
      set("#survival-alert-text",stats.alertText);
    }else{
      ["survival-population","survival-food","survival-days","survival-consumption","survival-alert"]
        .forEach(id=>$("#"+id).hidden=true);
    }
    $("#workers").innerHTML=state.workers.map(w=>{
      const t=tasks.find(t=>t.id===w.task);
      const title=w.resting?"💤 Descansando":w.supplyStage==="water"?"Buscando água na lagoa":
        w.carryingWater?"Levando água ao canteiro":
        w.supplyStage==="manure"?"Buscando esterco na vaca":
        w.carryingManure?"Levando esterco ao canteiro":
        t?labels[t.type]+" em ("+(t.x+1)+", "+(t.y+1)+")":idleReason(w);
      const positive=w.skills.length?w.skills.map(s=>'<span class="tag">✦ '+labels[s]+'</span>').join(""):'<span class="tag">Generalista</span>';
      const neg=w.neg.map(s=>'<span class="tag negative">✕ '+labels[s]+'</span>').join("");
      const gear=Object.entries(Exploration.GEAR)
        .filter(([id])=>w.inventory?.tools?.[id])
        .map(([,item])=>'<span class="tag" title="Proteção: '+escapeHtml(item.name)+'">'+item.icon+' '+escapeHtml(item.name)+'</span>').join("");
      const factor=w.skills.length?"+"+Math.round((specialtyMultiplier(w,w.skills[0])-1)*100)+"%":"sem bônus";
      // S1+S2: Indicadores de saciedade e saúde
      const satiety = Number.isFinite(w.satiety) ? Math.round(w.satiety) : 100;
      const hungerState = Survival.hungerState(satiety);
      const hungerIcon = hungerState==="starving"?"💀":hungerState==="hungry"?"⚠":"🍽️";
      const hungerColor = hungerState==="starving"?"#f4b0a7":hungerState==="hungry"?"#f4d18b":"#b6de81";
      const satietyBar = '<div class="worker-bar hunger-bar" role="progressbar" aria-label="Saciedade de '+escapeHtml(w.name)+': '+satiety+'%" aria-valuenow="'+satiety+'" aria-valuemin="0" aria-valuemax="100" style="background:'+hungerColor+'"><i style="width:'+satiety+'%"></i></div>';
      const health = Number.isFinite(w.health) ? Math.round(w.health) : 100;
      const healthColor = health <= 20 ? "#f4b0a7" : health <= 50 ? "#f4d18b" : "#b6de81";
      const healthBar = '<div class="worker-bar health-bar" role="progressbar" aria-label="Saúde de '+escapeHtml(w.name)+': '+health+'%" aria-valuenow="'+health+'" aria-valuemin="0" aria-valuemax="100" style="background:'+healthColor+'"><i style="width:'+health+'%"></i></div>';
      const healthLabel = '<div class="worker-health" style="color:'+healthColor+'" title="Saúde: '+health+'%">❤ '+health+'%</div>';
      return '<div class="worker" data-worker-state="'+(w.moving?"moving":t?"working":"idle")+'"><div class="worker-head"><canvas class="portrait worker-avatar" data-worker-avatar="'+w.id+'" width="40" height="42"></canvas><div class="worker-identity"><div class="worker-name">'+escapeHtml(w.name)+'</div><div class="worker-job">'+escapeHtml(title)+'</div><span class="worker-status">'+(w.moving?"➤ Caminhando":t?"● Em atividade":tasks.length?"⏳ Aguardando ordens compatíveis":"● Disponível")+'</span></div></div><div class="tags">'+positive+neg+gear+'</div><div class="worker-hunger" style="color:'+hungerColor+'" title="Saciedade: '+satiety+'%">'+hungerIcon+' '+satiety+'%</div>'+satietyBar+healthLabel+healthBar+'<div class="worker-role">Especialização: '+factor+'</div>'+
        '<div class="worker-role">⚡ Energia '+Math.round(w.energy||0)+'% · ♥ Moral '+Math.round(w.morale||0)+'%</div></div>';
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
      const delivered=Logistics.costFor(t);
      const materialStatus=Object.keys(delivered).length?
        " · Entregue: "+Object.entries(delivered).map(([kind,qty])=>
          (t.delivered?.[kind]||0)+"/"+qty+" "+kind).join(", "):"";
      const statusDetail=(reason|| (w?escapeHtml(w.name)+" · trabalhando":"Aguardando atribuição"))+materialStatus;
      const progress=w?Math.min(100,Math.max(0,Math.round(w.progress*100))):0;
      return '<div class="task order-task '+(reason?"order-blocked":"")+'" data-order-state="'+status+'">'+
        '<div class="order-task-main"><div class="order-task-title">'+
        '<span class="order-symbol" aria-hidden="true">'+icons[t.type]+'</span>'+
        '<strong>'+labels[t.type]+'</strong><span class="order-state">'+statusText+'</span></div>'+
        '<small>Terreno '+(t.x+1)+', '+(t.y+1)+' · '+escapeHtml(statusDetail)+'</small>'+
        (w?'<div class="order-progress" role="progressbar" aria-label="Progresso da tarefa" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+progress+'"><i style="width:'+progress+'%"></i></div>':'')+
        '</div><div class="order-task-controls">'+
        (["buildHome","buildStation","buildChest","buildWell"].includes(t.type)?
          '<button class="order-priority-edit" data-order-priority="'+t.id+'" data-delta="-1" aria-label="Diminuir prioridade da construção">−</button>'+
          '<b title="Prioridade da construção, de 1 a 9">P'+(t.priority??5)+'</b>'+
          '<button class="order-priority-edit" data-order-priority="'+t.id+'" data-delta="1" aria-label="Aumentar prioridade da construção">+</button>':
          '<b>P'+state.priorities[t.type]+'</b>')+
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
    if(!Food.spend(state,price)){notify("Comida insuficiente para a troca.");return;}
    state.workers.push({id:state.nextWorkerId++,name:c.name,skills:[...c.skills],neg:[...c.neg],color:c.color,appearance:c.appearance??0,personalPriority:{},inventory:{tools:{},items:{}},x:state.spawn.x,y:state.spawn.y,task:null,progress:0,facing:"down",moving:false,walkFrame:0,satiety:100,health:100,hungerState:"fed",starvationMinutes:0,lastMealDay:state.day,energy:100,morale:75});
    // Reaproveita ferramentas legadas que não puderam ser realocadas no load.
    // Não cria nem destrói equipamento: transfere apenas a quem pode usá-lo.
    Crafting.reconcileEquipment(state);
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
    const deposit=World.at(state.world,p.x,p.y);
    const oreName=deposit?.mineral?Minerals.RESOURCES[deposit.mineral]?.name:"";
    $("#tile-tooltip").textContent="Terreno "+(p.x+1)+", "+(p.y+1)+
      ((p.seeded||p.produce)?" · "+(Crops.get(p.crop||"carrot")?.name||"Cultivo"):"")+
      " · "+World.terrainAt(state.world,p.x,p.y).name+
      (oreName?" · Depósito: "+oreName+" (picareta "+Minerals.oreTier(deposit)+")":"")+
      (Exploration.requirement(state.world,p.x,p.y).gear?
        " · EPI: "+Exploration.GEAR[Exploration.requirement(state.world,p.x,p.y).gear].name:
        " · Área segura")+
      " · "+(p.produce?"Colheita pronta":p.seeded?"Crescimento "+Math.floor(p.growth*100)+"%":p.tilled?"Solo arado":"Solo natural")+
      " · Ordens: "+(planned.length?planned.map(o=>labels[o.type]).join(" → "):"nenhuma");
  }
  function removeOrders(ids){
    if(!ids.length)return;
    const cancelled=new Set(ids);
    const toRefund=state.orders.filter(o=>cancelled.has(o.id));
    for(const order of toRefund)Logistics.refund(state,order);
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
       occupiedByHome(x,y)||occupiedByStation(x,y)||occupiedByRocket(x,y)||
       window.TillfolkHouseBuilder.occupied(state.house,x,y))return null;
    if(World.at(state.world,x,y)||plot.dirty)return "clear";
    if(plot.tilled&&!(state.cropSeeds[state.selectedCrop]>0)){
      const available=Object.keys(state.cropSeeds).find(id=>state.cropSeeds[id]>0&&Crops.get(id));
      if(available)state.selectedCrop=available;
    }
    const terrain=World.terrainAt?.(state.world,x,y);
    if(terrain&&!terrain.farmable)return null;
    if(plot.produce)return "carry";
    if(plot.seeded)return plot.growth>=1?"harvest":!plot.watered?"water":null;
    if(plot.tilled)return "sow";
    return "till";
  }
  function queueAt(type,x,y){
    const toolProblem=Crafting.blocked(state,type,World.at(state.world,x,y));
    if(toolProblem){markBlocked(x,y,toolProblem);return {error:toolProblem};}
    if(window.TillfolkHouseBuilder.occupied(state.house,x,y)||occupiedByHome(x,y)||occupiedByStation(x,y)||occupiedByStation(x,y)||
       (World.waterAt(state.world,x,y)&&type!=="collectWater"))return {error:"Terreno indisponível"};
    if(type==="buildStation"&&!stationSiteValid(x,y))return {error:"Oficina exige terreno livre."};
    if(type==="buildHome"&&!homeSiteValid(x,y))return {error:"Casa precisa de área 2×2 livre"};
    if(type==="collectManure"&&!state.animals.some(a=>Math.floor(a.x)===x&&Math.floor(a.y)===y))
      return {error:"Selecione um animal com esterco"};
    const plot=findPlot(x,y);
    const result=Orders.add(state.orders,type,x,y,plot,World.at(state.world,x,y),state);
    if(result.error)return result;
    if(type==="sow")result.order.crop=state.selectedCrop;
    if(type==="buildHome"||type==="buildStation")result.order.priority=state.buildPriority;
    if(type==="buildHome"||type==="buildStation")result.order.priority=state.buildPriority;
    state.orders.push(result.order);
    if(type==="buildHome")recordTutorial("plan");
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
      for(const order of state.orders)if(ids.has(order.id))
        Logistics.refund(state,order);
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
  function markBlocked(x,y,reason){
    blockedAttempt={x,y,reason,until:performance.now()+2600};
    const tip=$("#tile-tooltip");tip.textContent="⛔ "+reason;tip.classList.add("locked");tip.hidden=false;
    showMapFeedback(x,y,"#ff625a");notify(reason);
  }
  function placeOrder(type,x,y){
    const toolProblem=Crafting.blocked(state,type,World.at(state.world,x,y));
    if(toolProblem){markBlocked(x,y,toolProblem);return;}
    if(occupiedByRocket(x,y)&&type!=="buildRocket"){
      markBlocked(x,y,"Terreno reservado para o foguete.");return;
    }
    if(window.TillfolkHouseBuilder.occupied(state.house,x,y)||occupiedByHome(x,y)||
       (World.waterAt(state.world,x,y)&&type!=="collectWater")){
      notify("Terreno indisponível para ordens.");return;
    }
    if(type==="buildStation"&&!stationSiteValid(x,y)){notify("Oficina exige terreno livre.");return;}
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
    if(type==="buildHome")recordTutorial("plan");
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
    if(occupiedByStation(x,y)||occupiedByHome(x,y)||occupiedByRocket(x,y)||
       World.waterAt(state.world,x,y)||World.at(state.world,x,y))return true;
    if(state.workers.some(w=>Math.max(Math.abs(Math.floor(w.x)-x),Math.abs(Math.floor(w.y)-y))<=1))return true;
    return state.plots.some(p=>p.x===x&&p.y===y&&(p.selected||p.tilled||p.seeded||p.produce));
  }
  function canPlanField(x,y){
    if(x<1||y<1||x>=W-1||y>=H-1)return {error:"Deixe uma margem livre no mapa."};
    const p=findPlot(x,y);
    if(!p||!World.terrainAt(state.world,x,y).farmable)return {error:"Este terreno não aceita plantação."};
    if(World.waterAt(state.world,x,y)||World.at(state.world,x,y)||p.dirty||
       occupiedByHome(x,y)||occupiedByStation(x,y)||window.TillfolkHouseBuilder.occupied(state.house,x,y))
      return {error:"Limpe obstáculos antes de planejar o canteiro."};
    if(p.seeded||p.produce)return {error:"Este canteiro já está cultivado."};
    if(state.orders.some(o=>o.type==="buildHome"&&homeTiles(o.x,o.y).some(([hx,hy])=>hx===x&&hy===y)))
      return {error:"Há uma cabana planejada nesse terreno."};
    return {house:true};
  }
  function getBuildEdit(x,y,erase){
    if(!Number.isInteger(x)||!Number.isInteger(y)||x<1||y<1||x>=W-1||y>=H-1)
      return {error:"Escolha uma área dentro do vale."};
    if(buildLayer==="field")return canPlanField(x,y);
    if(buildLayer==="rocket"){
      const problem=Space.canOrder(state,x,y,state.rocket.stage);
      return problem?{error:problem}:{house:true};
    }
    if(buildLayer==="well")return wellSiteValid(x,y)?{house:true}:{error:"Poço: pesquisa nível 2 e terreno livre."};
    if(buildLayer==="chest")return chestSiteValid(x,y)?{house:true}:{error:"Baú precisa de solo livre."};
    if(buildLayer==="station")return stationSiteValid(x,y)?{house:true}:{error:"Oficina exige chão firme livre."};
    if(buildLayer==="station")return stationSiteValid(x,y)?
      {house:true}:{error:"Work Station precisa de um terreno livre."};
    if(buildLayer==="home")return homeSiteValid(x,y)?
      {house:true}:{error:"A cabana exige 2×2 livres e terreno firme."};
    if(!World.terrainAt(state.world,x,y).buildable)
      return {error:"Este bioma não permite construir nesta área."};
    if(!erase&&(state.inventory?.wood||0)<1)return {error:"Madeira insuficiente! Use os trabalhadores para recolher madeira."};
    return window.TillfolkHouseBuilder.edit(state.house,buildLayer,x,y,erase,isBuildCellBusy);
  }
  function pushBuildHistory(){
    houseHistory.push(JSON.stringify({
      house:state.house,plots:state.plots,wood:state.inventory.wood,orders:state.orders
    }));
    if(houseHistory.length>30)houseHistory.shift();
  }
  // Cada canteiro é uma solicitação EXPLÍCITA do jogador para arar e semear.
  // As ordens seguem a fila existente, inclusive a espera por sementes.
  // Nenhuma irrigação/colheita futura é criada automaticamente.
  function queueFieldBlueprint(x,y){
    const check=canPlanField(x,y);
    if(!check.house)return {count:0,error:check.error};
    const p=findPlot(x,y);
    let count=0;
    for(const type of p.tilled?["sow"]:["till","sow"]){
      if(state.orders.some(o=>o.type===type&&o.x===x&&o.y===y))continue;
      const result=Orders.add(state.orders,type,x,y,p,World.at(state.world,x,y),state);
      if(result.order){
        if(type==="sow")result.order.crop=state.selectedCrop;
        state.orders.push(result.order);count++;
      }
    }
    if(count)recordTutorial("plan");
    return {count,error:count?null:"Canteiro já está planejado."};
  }
  function applyBuildingArea(from,to,cancel=false){
    const x0=Math.max(1,Math.min(from.x,to.x)),x1=Math.min(W-2,Math.max(from.x,to.x));
    const y0=Math.max(1,Math.min(from.y,to.y)),y1=Math.min(H-2,Math.max(from.y,to.y));
    const area=(x1-x0+1)*(y1-y0+1);
    if(area>120){$("#build-status").textContent="Selecione no máximo 120 canteiros por vez.";return;}
    let total=0;
    if(!cancel)pushBuildHistory();
    const ids=[];
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
      if(cancel){
        for(const o of state.orders)
          if(o.x===x&&o.y===y&&["till","sow"].includes(o.type))ids.push(o.id);
      }else total+=queueFieldBlueprint(x,y).count;
    }
    if(cancel&&ids.length){removeOrders([...new Set(ids)]);total=ids.length;}
    else if(total){recalcTasks();refresh();save();}
    else if(!cancel)houseHistory.pop();
    buildHover=null;
    $("#build-status").textContent=total?
      (cancel?total+" ordens de canteiro canceladas.":total+" ordens de canteiro planejadas."):
      "Nenhum canteiro válido nesta área.";
  }
  function updateBuildPanel(){
    if(!state)return;
    $("#build-stock").textContent=String(Logistics.available(state,"wood"));
    const p=$("#build-priority-value");if(p)p.textContent=state.buildPriority;
    const sticks=$("#build-twigs");if(sticks)sticks.textContent=String(Logistics.available(state,"twigs"));
    if($("#build-homes-count"))$("#build-homes-count").textContent=String(state.homes.length);
    const rocket=Space.normalize(state),spaceControls=$("#rocket-build-controls");
    if(spaceControls){
      spaceControls.hidden=buildLayer!=="rocket";
      if(buildLayer==="rocket"){
        const stage=Space.STAGES[rocket.stage],pending=state.orders.some(o=>o.type==="buildRocket");
        $("#rocket-build-phase").textContent=rocket.launched?"🚀 Foguete lançado":
          stage?"🚀 Etapa "+(rocket.stage+1)+"/4 · "+stage.name:"🚀 Pronto para abastecer";
        $("#rocket-build-materials").textContent=stage?
          "Entregas físicas: "+Crafting.formatCost(stage.cost)+
          (Space.unlock(state)?" · "+Space.unlock(state):""):
          "Partida: "+Space.LAUNCH.food+" alimentos, "+Space.LAUNCH.water+" água e cinco colonos.";
        $("#rocket-build-next").hidden=!rocket.site||rocket.stage>=4||pending||rocket.launched;
        $("#rocket-build-launch").hidden=rocket.stage<4||rocket.launched;
        $("#rocket-build-launch").title=Space.ready(state)||"Iniciar a evacuação.";
      }
    }
    document.querySelectorAll("[data-build-layer]").forEach(btn=>{
      const on=btn.dataset.buildLayer===buildLayer;
      btn.classList.toggle("chosen",on);btn.setAttribute("aria-pressed",String(on));
    });
    // Exibir somente os objetos completos no painel.
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
    if(buildLayer==="field"){
      if(erase){
        const ids=state.orders.filter(o=>o.x===x&&o.y===y&&["till","sow"].includes(o.type)).map(o=>o.id);
        if(ids.length)removeOrders(ids);
        $("#build-status").textContent=ids.length?"Canteiro cancelado.":"Nenhuma ordem de canteiro neste terreno.";
        return;
      }
      pushBuildHistory();
      const queued=queueFieldBlueprint(x,y);
      if(!queued.count){houseHistory.pop();$("#build-status").textContent=queued.error;return;}
      recalcTasks();refresh();save();buildHover=null;
      $("#build-status").textContent="🌱 Canteiro planejado: "+queued.count+" ordem(ns) de arar e semear. Regar e colher continuam manuais.";
      return;
    }
    if(buildLayer==="rocket"){
      if(erase){$("#build-status").textContent="Para cancelar a obra, use o botão direito na plataforma.";return;}
      const test=Orders.add(state.orders,"buildRocket",x,y,findPlot(x,y),
        World.at(state.world,x,y),state);
      if(!test.order){$("#build-status").textContent=test.error;return;}
      test.order.priority=state.buildPriority;
      state.orders.push(test.order);
      recalcTasks();refresh();save();buildHover=null;
      $("#build-status").textContent="🚀 Etapa planejada: "+Space.STAGES[test.order.stage].name+
        ". Os materiais devem chegar fisicamente ao canteiro.";
      return;
    }
    if(buildLayer==="well"){
      const test=Orders.add(state.orders,"buildWell",x,y,findPlot(x,y),World.at(state.world,x,y),state);
      if(!test.order){$("#build-status").textContent=test.error;return;}
      test.order.priority=state.buildPriority;pushBuildHistory();
      state.orders.push(test.order);recalcTasks();refresh();save();
      $("#build-status").textContent="🚰 Poço planejado: entrega de 4 madeiras e 3 pedras.";
      return;
    }
    if(buildLayer==="chest"){
      const test=Orders.add(state.orders,"buildChest",x,y,findPlot(x,y),World.at(state.world,x,y),state);
      if(!test.order){$("#build-status").textContent=test.error;return;}
      test.order.priority=state.buildPriority;pushBuildHistory();
      state.orders.push(test.order);recalcTasks();refresh();save();
      $("#build-status").textContent="🧰 Baú planejado: materiais precisam chegar fisicamente até aqui.";
      return;
    }
    if(buildLayer==="station"){
      const test=Orders.add(state.orders,"buildStation",x,y,findPlot(x,y),World.at(state.world,x,y),state);
      if(!test.order){$("#build-status").textContent=test.error;return;}
      pushBuildHistory();
      test.order.priority=state.buildPriority;
      state.orders.push(test.order);
      recalcTasks();refresh();save();buildHover=null;
      $("#build-status").textContent="🛠️ Work Station planejada: aguardando 10 gravetos.";
      return;
    }
    if(buildLayer==="home"){
      const test=Orders.add(state.orders,"buildHome",x,y,findPlot(x,y),
        World.at(state.world,x,y),state);
      if(!test.order){$("#build-status").textContent=test.error;return;}
      pushBuildHistory();
      test.order.priority=state.buildPriority;
      state.orders.push(test.order);
      recordTutorial("plan");
      recalcTasks();refresh();save();
      buildHover=null;
      $("#build-status").textContent="🏠 Cabana 2×2 planejada: aguardando equipe e 8 madeiras.";
      return;
    }
  }
  document.querySelectorAll("[data-build-layer]").forEach(btn=>btn.addEventListener("click",()=>{
    buildLayer=btn.dataset.buildLayer;
    eraseBuild=false;buildHover=null;updateBuildPanel();
    $("#build-status").textContent=buildLayer==="home"?
      "Cabana: prévia azul 2×2. Clique para atribuir à equipe; botão direito cancela.":
      buildLayer==="station"?
        "Work Station: junte 10 gravetos e planeje a bancada no chão livre. Clique direito cancela.":
      buildLayer==="chest"?
        "Baú: coloque uma blueprint e espere a equipe levar os recursos ao destino.":
      buildLayer==="well"?
        "Poço: pesquisa nível 2, 4 madeiras e 3 pedras; a água é produzida automaticamente.":
      buildLayer==="rocket"?
        (Space.unlock(state)||"Foguete: escolha uma área 3×3 na ilha central. Materiais serão transportados até a obra."):
        "Camada: "+btn.textContent.trim()+". Clique para construir ou use o botão direito para apagar.";
  }));
  function openWorkerInventory(worker){
    Crafting.normalizeWorker(worker);
    const dialog=$("#worker-inventory-dialog");
    $("#worker-inventory-title").textContent="Inventário · "+worker.name;
    const tools=Crafting.RECIPES.filter(recipe=>worker.inventory.tools[recipe.key]);
    $("#worker-inventory-tools").innerHTML=tools.length?
      tools.map(recipe=>'<div class="worker-tool-card"><span>'+recipe.icon+'</span><strong>'+
        escapeHtml(recipe.name)+'</strong></div>').join(""):
      '<p>Nenhuma ferramenta. Fabrique equipamentos na Work Station para este colono.</p>';
    const items=Object.entries(worker.inventory.items).filter(([,amount])=>amount>0);
    if(worker.inventory.carrying?.qty)items.unshift(["Em transporte: "+worker.inventory.carrying.kind,worker.inventory.carrying.qty]);
    $("#worker-inventory-items").innerHTML=items.length?
      items.map(([key,amount])=>'<span>'+escapeHtml(pickupTypes[key]?.name||key)+': '+amount+'</span>').join(""):
      '<p>Sem coletas registradas.</p>';
    if(!dialog.open)dialog.showModal();
  }
  $("#worker-inventory-close").addEventListener("click",()=>$("#worker-inventory-dialog").close());
  canvas.addEventListener("contextmenu",event=>{
    if(!playing)return;
    event.preventDefault(); // Não abrir o menu do navegador sobre o jogo.
    if(suppressRightContext){suppressRightContext=false;return;}
    const {x,y}=buildCellFromEvent(event);
    if(x<0||y<0||x>=W||y>=H)return;
    const worker=state.workers.find(w=>Math.hypot(w.x-(x+.5),w.y-(y+.5))<=.85);
    if(worker){openWorkerInventory(worker);return;}
    if(selectedTool==="construir"){
      if(buildLayer==="field"||buildLayer==="home"||buildLayer==="station"||
         buildLayer==="rocket"){
        const ids=state.orders.filter(o=>buildLayer==="field"?
          o.x===x&&o.y===y&&["till","sow"].includes(o.type):
          buildLayer==="station"?o.type==="buildStation"&&o.x===x&&o.y===y:
          buildLayer==="rocket"?o.type==="buildRocket"&&o.x===x&&o.y===y:
          buildLayer==="chest"?o.type==="buildChest"&&o.x===x&&o.y===y:
          buildLayer==="well"?o.type==="buildWell"&&o.x===x&&o.y===y:
          o.type==="buildHome"&&homeTiles(o.x,o.y).some(([hx,hy])=>hx===x&&hy===y))
          .map(o=>o.id);
        if(ids.length){removeOrders(ids);$("#build-status").textContent="Blueprint cancelado.";}
        else {$("#build-status").textContent="Seleção cancelada.";setTool("universal");}
        return;
      }
      paintHouse(x,y,true);return;
    }
    // Clique direito sempre cancela as ordens do terreno, não importa a
    // ferramenta selecionada. Cultivo concluído e árvores nunca são apagados.
    const ids=state.orders.filter(o=>o.x===x&&o.y===y).map(o=>o.id);
    if(ids.length){
      removeOrders(ids);notify(ids.length+" ordem(ns) cancelada(s) com botão direito.");
    }else{
      setTool("universal");
      $("#tile-tooltip").hidden=true;
      notify("Seleção cancelada · modo Universal.");
    }
  });
  canvas.addEventListener("pointerleave",()=>{
    buildHover=null;hoveredTile=null;
    if($("#tile-tooltip").classList.contains("locked")){$("#tile-tooltip").hidden=true;$("#tile-tooltip").classList.remove("locked");}
  });
  document.addEventListener("keydown",event=>{
    if(!playing||event.target.closest("input,textarea,select,[contenteditable]")||document.querySelector("dialog[open]"))return;
    const k=event.key.toLowerCase();
    if(k==="b"){setTool(selectedTool==="construir"?"universal":"construir");return;}
    if(selectedTool!=="construir")return;
    if(k==="escape"){setTool("universal");return;}
  });
  // Clique individual ou arraste para selecionar um retângulo de tarefas.
  // Shift+arrastar ou botão central sempre move a câmera.
  // No celular, ativar Área faz o dedo selecionar; desativar volta ao pan.
  function canSelectArea(){
    return (selectedTool==="construir"&&buildLayer==="field")||
      selectedTool==="universal"||selectedTool==="remover"||Orders.TYPES.includes(selectedTool);
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
    if(playing&&!panPointer&&event.pointerType!=="touch"){
      hoveredTile=buildCellFromEvent(event);
      const {x,y}=hoveredTile,object=x>=0&&y>=0&&x<W&&y<H?World.at(state.world,x,y):null;
      const attempted=blockedAttempt&&blockedAttempt.x===x&&blockedAttempt.y===y&&
        performance.now()<blockedAttempt.until;
      const type=selectedTool==="universal"?nextUniversalOrder(x,y):selectedTool;
      const needed=attempted?blockedAttempt.reason:
        type&&type!=="inspecionar"?Crafting.blocked(state,type,object):null;
      const tip=$("#tile-tooltip");
      if(needed){
        const typeNames={boulder:object?.mineral?
          (Minerals.RESOURCES[object.mineral]?.name||"Minério"):"Pedra grande",
          tree:"Árvore",stump:"Toco",log:"Tronco",thicket:"Arbusto"};
        // O solo livre nao possui objeto: bloqueios de enxada/regador ainda sao validos.
        // Nunca acessar .kind sem conferir, ou cada pointermove quebra o mapa.
        const targetName=object?.kind?(typeNames[object.kind]||"Recurso"):"Terreno";
        tip.textContent="⛔ "+targetName+" · "+needed+".";
        tip.classList.add("locked");tip.hidden=false;
      }else if(tip.classList.contains("locked")){
        tip.hidden=true;tip.classList.remove("locked");
      }
    }
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
        if(selectedTool==="construir"&&buildLayer==="field")
          applyBuildingArea(selection.from,selection.to,selectionPointer.cancel);
        else applyToArea(selection.from,selection.to,selectionPointer.cancel);
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
    const clickType=selectedTool==="universal"?nextUniversalOrder(x,y):selectedTool;
    const restriction=clickType&&Crafting.blocked(state,clickType,World.at(state.world,x,y));
    if(restriction){markBlocked(x,y,restriction);return;}
    if(state.wells.some(w=>w.x===x&&w.y===y)){
      notify("🚰 Poço: "+Math.floor(state.water||0)+" unidades de água disponíveis.");
      return;
    }
    const clickedChest=state.chests.find(c=>c.x===x&&c.y===y);
    if(clickedChest){
      const items=Object.entries(clickedChest.items).filter(([,qty])=>qty>0);
      const tip=$("#tile-tooltip");
      tip.classList.remove("locked");tip.hidden=false;
      tip.textContent="🧰 Baú ("+(x+1)+","+(y+1)+"): "+
        (items.length?items.map(([kind,qty])=>qty+" "+kind).join(" · "):"vazio — equipe vai guardar as coletas");
      return;
    }
    if(occupiedByStation(x,y)){openWorkshop();return;}
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
  // A mesma tecla do HUD alterna Objetos; nenhum painel exige botão Fechar.
  document.querySelectorAll("[data-tool]").forEach(b=>b.addEventListener("click",()=>{
    const next=b.dataset.tool;
    setTool(next==="construir"&&selectedTool==="construir"?"universal":next);
  }));
  $("#orders-btn").addEventListener("click",()=>{
    if(!playing)return;
    const open=$("#orders-panel").hidden;
    // Objetos e Ordens são mutuamente exclusivos.
    if(!$("#construction-panel").hidden)setTool("universal");
    $("#orders-panel").hidden=!open;
    $("#orders-btn").setAttribute("aria-expanded",String(open));
  });
  function dismissActionPanels(){
    const orders=$("#orders-panel"),objects=$("#construction-panel");
    if(!orders.hidden){
      orders.hidden=true;
      $("#orders-btn").setAttribute("aria-expanded","false");
    }
    if(!objects.hidden)setTool("universal");
  }
  // A ação do canvas é processada primeiro: só depois a sobreposição fecha,
  // preservando o posicionamento de uma Work Station e as ordens emitidas.
  document.addEventListener("click",event=>{
    if(!playing)return;
    const target=event.target;
    if(!(target instanceof Element))return;
    if(target.closest("#construction-panel,#orders-panel,#orders-btn,[data-tool='construir']"))return;
    if(target.closest(".canvas-scroll,.tooltray,.hud-panels,.hud-selection,.speed-wrap,#mission-card")){
      dismissActionPanels();
    }
  });
  document.addEventListener("contextmenu",event=>{
    if(!playing)return;
    if(event.target instanceof Element&&event.target.closest(".canvas-scroll"))dismissActionPanels();
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
    const priority=event.target.closest("[data-order-priority]");
    if(priority){
      const order=state.orders.find(o=>o.id===priority.dataset.orderPriority);
      if(!order)return;
      order.priority=Math.max(1,Math.min(9,(order.priority??5)+Number(priority.dataset.delta)));
      recalcTasks();refresh();save();return;
    }
    const btn=event.target.closest("[data-cancel-order]");
    if(btn){removeOrders([btn.dataset.cancelOrder]);notify("Ordem cancelada.");}
  });
  document.querySelectorAll("[data-speed]").forEach(b=>b.addEventListener("click",()=>{simSpeed=Number(b.dataset.speed);updateSpeed();refresh();save();}));
  $("#priorities").addEventListener("click",e=>{
    const btn=e.target.closest("[data-priority]");if(!btn||!state)return;
    const type=btn.dataset.priority;
    state.priorities[type]=Math.max(1,Math.min(9,state.priorities[type]+Number(btn.dataset.delta)));
    $("#priority-"+type).textContent=state.priorities[type];save();
  });
  $("#candidates").addEventListener("click",e=>{const b=e.target.closest("[data-hire]");if(b)hire(Number(b.dataset.hire));});
  $("#hire-btn").addEventListener("click",()=>{if(!playing)return;renderCandidates();$("#hire-dialog").showModal();});
  function cropTile(crop,extra,action,disabled=false,chosen=false){
    return '<button type="button" data-'+action+'="'+crop.id+'" '+(disabled?'disabled':'')+
      ' aria-pressed="'+Boolean(chosen)+'" title="'+escapeHtml(crop.name)+'">'+
      '<canvas data-crop-icon="'+crop.id+'" width="40" height="40" aria-hidden="true"></canvas>'+
      '<span><strong>'+escapeHtml(crop.name)+'</strong><small>'+extra+'</small></span></button>';
  }
  function cropCycleLabel(crop){
    const duration=Life.cropDuration(crop.id);
    return duration<=150?"ciclo rápido":duration<=235?"ciclo médio":"ciclo longo";
  }
  function renderCropStock(){
    const grid=$("#crop-stock-grid");
    if(!grid||!state)return;
    const current=Crops.get(state.selectedCrop);
    const label=$("#crop-choice-current");
    if(label)label.textContent="Plantio selecionado: "+(current?.name||"Batata")+
      " · "+(state.cropSeeds[state.selectedCrop]||0)+" sementes disponíveis";
    const outlook=$("#food-outlook");
    if(outlook){
      const stats=Survival.getStats(state);
      const growing=state.plots.filter(plot=>plot.seeded&&plot.growth<1).length;
      const ripe=state.plots.filter(plot=>plot.seeded&&plot.growth>=1||plot.produce).length;
      if(state.mode==="survival"){
        const days=stats.daysRemaining===null?"—":stats.daysRemaining.toFixed(1);
        outlook.dataset.risk=stats.alert;
        outlook.textContent=(stats.alert==="critical"?"⚠️ Estoque crítico":stats.alert==="warning"?"⚠️ Planeje novas colheitas":"🥕 Abastecimento")+
          " · "+state.food+" alimentos · cerca de "+days+" dia(s) de consumo normal."+
          " Canteiros: "+growing+" crescendo, "+ripe+" prontos ou aguardando transporte."+
          " Safras futuras não entram nesta reserva até serem levadas ao estoque.";
      }else{
        outlook.dataset.risk="ok";
        outlook.textContent="🌱 Fazenda tranquila · "+state.food+" alimentos disponíveis."+
          " Canteiros: "+growing+" crescendo, "+ripe+" prontos ou aguardando transporte.";
      }
    }
    const help=$("#crop-choice-hint");
    if(help)help.textContent=state.seeds>0?
      "Selecione uma cultura com sementes. Universal e Semear usarão essa escolha nas próximas ordens. Ordens já criadas não mudam.":
      "Sem sementes: limpe a grama alta para encontrá-las. A primeira semente do tutorial é garantida.";
    grid.innerHTML=Crops.ALL.map(crop=>{
      const stock=state.cropSeeds[crop.id]||0;
      const details=stock+" sementes · "+Food.available(state,crop.id)+" alimentos disponíveis · "+
        (state.cropProduce[crop.id]||0)+" colhidos no histórico"+
        " · +" +crop.food+" comida / +"+crop.seedYield+" sementes por safra"+
        " · "+cropCycleLabel(crop)+" · Melhor: "+crop.favoredSeason;
      return cropTile(crop,details,"select-crop",stock<=0,state.selectedCrop===crop.id);
    }).join("");
    Crops.drawIcons(grid);
  }
  // O inventário vira também seletor real da próxima semente usada no mapa.
  // Uma ordem já designada conserva sua cultura; saves antigos seguem válidos.
  $("#crop-stock-grid")?.addEventListener("click",event=>{
    const button=event.target.closest("[data-select-crop]");
    if(!button||button.disabled||!state)return;
    const crop=Crops.get(button.dataset.selectCrop);
    if(!crop||(state.cropSeeds[crop.id]||0)<1)return;
    state.selectedCrop=crop.id;
    renderCropStock();refresh();save();
    notify("🌱 Próximo plantio: "+crop.name+". Selecione Universal ou Semear no mapa.");
  });
  // A oficina reutiliza o atlas Sprout Lands. A remoção da janela de
  // seleção de culturas não deve afetar o desenho das ferramentas.
  const workshopAtlas=new Image();
  workshopAtlas.src=Crafting.ITEMS_SPRITE;
  workshopAtlas.addEventListener("load",()=>{
    if(state&&$("#workshop-dialog")?.open)paintWorkshopTools();
  });
  function paintWorkshopTools(){
    document.querySelectorAll("canvas.workstation-tool-sprite").forEach(canvas=>{
      const ctx=canvas.getContext("2d");
      if(!ctx)return;
      ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,canvas.width,canvas.height);
      const item=canvas.closest("[data-craft-tool]")?.dataset.craftTool;
      const frame=Crafting.itemFrame(item);
      if(frame&&valid(workshopAtlas)){
        ctx.drawImage(workshopAtlas,frame.x,frame.y,frame.w,frame.h,3,3,42,42);
        canvas.setAttribute("aria-label","Sprite de "+(Crafting.recipe(item)?.name||"ferramenta"));
      }else if(!frame){
        ctx.fillStyle="#d7e2b0";ctx.font="bold 20px system-ui";
        ctx.textAlign="center";ctx.textBaseline="middle";
        ctx.fillText(Crafting.recipe(item)?.icon||"⚒",24,25);
        canvas.setAttribute("aria-label","Ícone provisório: "+(Crafting.recipe(item)?.name||"ferramenta"));
      }
    });
  }
  function renderWorkshop(){
    const ready=Boolean(state.crafting?.station);
    $("#workshop-status").textContent=ready?
      "Work Station pronta! Faça ferramentas e transforme colheitas em sementes.":
      "A Work Station ainda não está pronta. Colete 10 gravetos e use Objetos → Work Station.";
    $("#workshop-tools").innerHTML=Crafting.RECIPES.map((recipe,index)=>{
      const material=recipe.type==="material";
      const eligible=material?[]:state.workers.filter(w=>Crafting.canEquip(w,recipe.key));
      const holders=material?0:eligible.filter(w=>Crafting.has(state,recipe.key,w)).length;
      const made=!material&&eligible.length>0&&holders===eligible.length;
      const nobodyEligible=!material&&eligible.length===0;
      const pending=state.orders.some(o=>o.type==="craftTool"&&o.recipe===recipe.key);
      const lacking=Crafting.missing(state,recipe.cost).length>0;
      const locked=Crafting.locked(state,recipe.key);
      const label=nobodyEligible?"🚫 Nenhum colono pode usar":made?"✓ Todos habilitados equipados":pending?"⏳ Fabricando":locked?
        "🔒 "+locked:Crafting.formatCost(recipe.cost);
      return '<button type="button" data-craft-tool="'+recipe.key+'" '+
        ((!ready||made||nobodyEligible||pending||lacking||locked)?'disabled':'')+'>'+
        '<canvas class="workstation-tool-sprite" data-tool-index="'+index+'" width="48" height="48" role="img" aria-label="Ilustração de '+recipe.name+'"></canvas>'+
        '<span class="workstation-tool-text"><strong>'+recipe.icon+' '+recipe.name+'</strong>'+
        '<small>'+recipe.help+'</small><small>'+label+'</small>'+
        (material?'<small>Produção: '+recipe.output.qty+' '+escapeHtml(
          Minerals.RESOURCES[recipe.output.kind]?.name||recipe.output.kind)+
          ' · vai ao chão da oficina</small>':
          '<small>Equipados: '+holders+' / '+eligible.length+' habilitados</small>')+
        (Crafting.itemFrame(recipe.key)?'':'<small class="workstation-art-note">Ícone provisório · sem sprite identificado</small>')+
        '</span></button>';
    }).join("")+
      '<button type="button" data-craft-chest '+(!ready?'disabled':'')+'>'+
      '<img class="workstation-tool-sprite" src="'+Logistics.CHEST_SPRITE+'" alt="Baú original Sprout Lands">'+
      '<span class="workstation-tool-text"><strong>🧰 Baú de armazenamento</strong>'+
      '<small>Guardar gravetos, madeira, fibras e outros recursos.</small>'+
      '<small>'+Crafting.formatCost(Logistics.COSTS.buildChest)+'</small>'+
      '<small>Planejar construção no mapa com entrega física dos materiais</small></span></button>';
    paintWorkshopTools();
    const grid=$("#workshop-recipes");
    grid.innerHTML=Crops.ALL.map(crop=>cropTile(crop,
      Food.available(state,crop.id)+" disponíveis · 2 alimentos → 3 sementes",
      "craft-crop",!ready||Food.available(state,crop.id)<2)).join("");
    Crops.drawIcons(grid);
  }
  function openWorkshop(){
    if(!playing||$("#workshop-dialog").open)return;
    renderWorkshop();
    $("#workshop-dialog").showModal();
  }
  $("#open-workshop").addEventListener("click",openWorkshop);
  $("#workshop-tools").addEventListener("click",event=>{
    const chest=event.target.closest("[data-craft-chest]");
    if(chest){
      if(chest.disabled||!state.crafting?.station)return;
      $("#workshop-dialog").close();
      buildLayer="chest";setTool("construir");updateBuildPanel();
      notify("🧰 Baú selecionado! Escolha a posição; a equipe levará os materiais.");
      return;
    }
    const button=event.target.closest("[data-craft-tool]");
    if(!button||button.disabled)return;
    const key=button.dataset.craftTool,item=Crafting.recipe(key),station=state.crafting.station;
    if(!station||!item||Crafting.locked(state,key)||Crafting.missing(state,item.cost).length||
      (item.type!=="material"&&!state.workers.some(w=>Crafting.canEquip(w,key)))){
      notify("Receita indisponível para os trabalhadores atuais.");return;
    }
    const id=Orders.id("craftTool",station.x,station.y,key);
    if(state.orders.some(o=>o.id===id)){notify("Esta receita já está na fila.");return;}
    state.orders.push({id,type:"craftTool",recipe:key,x:station.x,y:station.y,priority:8});
    log("Fabricação de "+item.name+" encomendada. Um colono irá à Work Station.");
    notify("🛠️ "+item.name+" na fila: um trabalhador irá até a bancada.");
    recalcTasks();renderWorkshop();refresh();save();
  });
  $("#workshop-recipes").addEventListener("click",event=>{
    const button=event.target.closest("[data-craft-crop]");
    if(!button||button.disabled)return;
    const id=button.dataset.craftCrop;
    if(!Crops.get(id)||!state.workstations?.length||!Food.spend(state,2,id))return;
    state.cropSeeds[id]+=3;state.seeds+=3;
    log("A oficina preparou 3 sementes de "+Crops.get(id).name+".");
    renderWorkshop();refresh();save();
  });

  // Tela obrigatória antes da nova partida: dois espaços de recrutamento gratuitos.
  function sharedNegativeTraits(a,b){
    return (a?.neg||[]).filter(type=>(b?.neg||[]).includes(type));
  }
  function randomStarter(excludeNames = [], excludeAppearances = [], forbiddenNeg = []){
    for(let attempt=0;attempt<200;attempt++){
      const candidate=newCandidate();
      if(!excludeNames.includes(candidate.name)&&
        !excludeAppearances.includes(candidate.appearance)&&
        !candidate.neg.some(type=>forbiddenNeg.includes(type)))return candidate;
    }
    // Se a combinação for muito rara, preservar a jogabilidade em vez de travar.
    const candidate=newCandidate();
    candidate.neg=candidate.neg.filter(type=>!forbiddenNeg.includes(type));
    for(let attempt=0;attempt<200&&(excludeNames.includes(candidate.name)||
      excludeAppearances.includes(candidate.appearance));attempt++){
      const retry=newCandidate();
      candidate.name=retry.name;candidate.appearance=retry.appearance;
    }
    return candidate;
  }
  function createStarterTeam(){
    const first=randomStarter();
    starters=[first,randomStarter([first.name],[first.appearance],first.neg)];
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
      const bonus=count?Math.round((specialtyMultiplier(person,person.skills[0])-1)*100):0;
      const profile=count===1?"Especialista":count===2?"Multitalento":count===3?"Versátil":"Generalista";
      const allowed=availableTasks.length-person.neg.length;
      const skills=person.skills.length
        ?person.skills.map(type=>{
          const seconds=Math.round(baseTime[type]/bonusForCandidate(person,type));
          const description=labels[type]+': '+seconds+' segundos por ação (sem deslocamento). Bônus de +'+bonus+'% nesta especialidade.'+
            (type==="carry"?" Capacidade de carregar "+Logistics.capacity(person)+" unidades por viagem.":"");
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
    return specialtyMultiplier(person,type);
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
    const other=starters[1-i];
    starters[i]=randomStarter([other.name],[other.appearance],other.neg);
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
    const first=randomStarter();starters=[first,randomStarter([first.name],[first.appearance],first.neg)];renderStarters();
  });
  $("#starter-confirm").addEventListener("click",()=>{
    if(starters.length!==2||starters[0].name===starters[1].name)return;
    const repeated=sharedNegativeTraits(starters[0],starters[1]);
    if(repeated.length){
      notify("Equipe inválida: os colonos iniciais não podem compartilhar restrições vermelhas.");
      return;
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
      target.innerHTML='<p class="management-explainer">Defina as atividades preferidas de cada trabalhador (1–9). As prioridades globais continuam valendo para toda a fazenda. A especialidade azul aumenta a velocidade. Mais traços vermelhos fortalecem as especializações, mas continuam proibindo as tarefas correspondentes.</p>'+
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
      const percentage=worker.skills.length?Math.round((specialtyMultiplier(worker,worker.skills[0])-1)*100):0;
      target.innerHTML='<p class="management-explainer">Especialidades azuis aumentam a velocidade; três restrições vermelhas com uma única habilidade azul conferem 3× nessa tarefa. As atividades vermelhas permanecem proibidas.</p>'+
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
  $("#tutorial-start").addEventListener("click",()=>$("#mode-dialog").showModal());
  $("#mode-dialog").addEventListener("click",event=>{
    const btn=event.target.closest("[data-game-mode]");
    if(!btn)return;
    pendingMode=btn.dataset.gameMode;
    $("#mode-dialog").close();
    createStarterTeam();
  });
  $("#continue").addEventListener("click",()=>{start(true);renderPriorityControls();});
  $("#help-btn").addEventListener("click",()=>$("#help-dialog").showModal());
  // "Como jogar" continua como guia de consulta. A conclusão só ocorre jogando.
  $("#help-close").addEventListener("click",()=>{
    $("#help-dialog").close();
    $("#help-btn").focus({preventScroll:true});
  });
  $("#mission-details-toggle").addEventListener("click",()=>{
    const card=$("#mission-card"),open=card.classList.toggle("expanded");
    $("#mission-details-toggle").setAttribute("aria-expanded",String(open));
  });
  $("#mission-locate").addEventListener("click",()=>{
    if(!playing)return;
    const step=Missions.current(state);
    if(!step)return;
    const distance=p=>(p.x-(state.spawn?.x??W/2))**2+(p.y-(state.spawn?.y??H/2))**2;
    const nearest=items=>items.sort((a,b)=>distance(a)-distance(b))[0];
    const objects=state.world.objects||[];
    const needsHomeWood=step.key==="home"&&Logistics.available(state,"wood")<HOME_WOOD_COST;
    let candidates=[];
    if(step.target==="grass")candidates=objects.filter(item=>item.kind==="grass");
    else if(step.target==="tree")candidates=objects.filter(item=>item.kind==="tree");
    else if(step.target==="home")candidates=needsHomeWood?
      objects.filter(item=>["tree","stump","log"].includes(item.kind)):
      state.plots.filter(p=>homeSiteValid(p.x,p.y));
    else if(step.target==="workstation")candidates=Logistics.available(state,"twigs")<Crafting.STATION_COST?
      objects.filter(item=>item.kind==="twig"):
      state.plots.filter(p=>stationSiteValid(p.x,p.y));
    else if(step.target==="till")candidates=state.plots.filter(p=>
      !p.tilled&&!p.seeded&&!p.dirty&&!World.at(state.world,p.x,p.y)&&
      World.terrainAt(state.world,p.x,p.y).farmable&&!occupiedByHome(p.x,p.y)&&
      tutorialTillSitePreferred(p.x,p.y));
    else if(step.target==="sow")candidates=state.plots.filter(p=>p.tilled&&!p.seeded&&!p.produce);
    else if(step.target==="water")candidates=state.plots.filter(p=>p.seeded&&!p.watered);
    else if(step.target==="harvest"){
      candidates=state.plots.filter(p=>p.seeded&&p.growth>=1);
      if(!candidates.length)candidates=state.plots.filter(p=>p.seeded&&p.watered);
    }
    else if(step.target==="carry")candidates=state.plots.filter(p=>p.produce);
    else if(step.target==="plan")candidates=state.plots.filter(p=>homeSiteValid(p.x,p.y));
    else if(["axe","hoe","wateringCan"].includes(step.target)){
      const recipe=Crafting.recipe(step.target);
      const missing=recipe?Crafting.missing(state,recipe.cost):[];
      if(!missing.length){openWorkshop();return;}
      const resource=missing[0][0];
      const kind={twigs:"twig",gravel:"pebble",grass:"grass"}[resource];
      candidates=kind?objects.filter(item=>item.kind===kind):[];
      if(!candidates.length){
        notify("Não há "+(Crafting.formatCost({[resource]:1})||resource)+
          " disponível perto da fazenda. Explore e recolha recursos.");
        return;
      }
      setTool("universal");
    }
    const target=nearest(candidates);
    if((step.target==="workstation"&&Logistics.available(state,"twigs")<Crafting.STATION_COST)||
      needsHomeWood){setTool("universal");}
    else if(step.tool==="construir"){
      setTool("construir");
      $(step.target==="workstation"?'[data-build-layer="station"]':'[data-build-layer="home"]').click();
    }else setTool(step.tool);
    if(target){
      focusCameraAt(target.x+.5,target.y+.5);
      showMapFeedback(target.x,target.y,"#ecf8a8");
      notify(step.target==="workstation"&&Logistics.available(state,"twigs")<Crafting.STATION_COST?"Graveto encontrado! Use Universal para recolhê-lo.":
        ["axe","hoe","wateringCan"].includes(step.target)?"Material encontrado! Clique com Universal para recolher.":
        step.target==="grass"?"Tufo de grama encontrado! Marque a ordem de Limpar.":
        step.target==="tree"?"Árvore encontrada! Ordene o corte com o machado equipado.":
        needsHomeWood?"Busque madeira! Derrube árvores e remova tocos até reunir 8 madeiras.":
        step.target==="home"?"Local válido! Escolha onde construir a cabana 2×2.":
        "Local sugerido destacado. Clique no terreno para dar a ordem.");
    }else{
      notify(step.target==="harvest"?"A cultura ainda está crescendo. Use 3× ou 6× para esperar.":"Não encontrei alvo pronto. Explore o mapa ou use Ordens.");
    }
  });
  const tutorialDone=$("#tutorial-done-dialog");
  tutorialDone.addEventListener("cancel",event=>event.preventDefault());
  $("#tutorial-continue-game").addEventListener("click",()=>{
    tutorialDone.close();simSpeed=tutorialSpeedBeforeFinish;updateSpeed();refresh();save();
  });
  $("#tutorial-back-menu").addEventListener("click",()=>{
    tutorialDone.close();save();$("#game-return-title").click();
  });
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
  let speedBeforeOptions=1,optionsSubdialog=null,selectedMapFromOptions=false;
  function showGameDialog(d){
    if(!playing||d.open)return;
    if(d===stockDialog)renderCropStock();
    // Subjanelas abertas pela pausa continuam pausadas. Fechá-las retorna ao menu.
    if(optionsDialog.open){optionsSubdialog=d;optionsDialog.close();}
    d.showModal();
  }
  function finishOptionsSubdialog(d){
    if(optionsSubdialog!==d)return;
    optionsSubdialog=null;
    if(d===fullMapDialog&&selectedMapFromOptions){
      selectedMapFromOptions=false;
      if(playing){simSpeed=speedBeforeOptions;updateSpeed();}
      $("#menu-btn").focus({preventScroll:true});
    }else if(playing){
      optionsDialog.showModal();
      $("#game-resume").focus({preventScroll:true});
    }
  }
  stockDialog.addEventListener("close",()=>finishOptionsSubdialog(stockDialog));
  fullMapDialog.addEventListener("close",()=>finishOptionsSubdialog(fullMapDialog));
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
    mapCtx.fillStyle="#d6ad75";
    for(const tile of state.world.crossings||[])mapCtx.fillRect(
      tile.x*tileW,tile.y*tileH,Math.max(1,tileW),Math.max(1,tileH));
    mapCtx.fillStyle="#f3ddb2";
    for(const animal of state.animals||[])if(animal.wild)
      mapCtx.fillRect(animal.x*tileW,animal.y*tileH,
        Math.max(1,tileW*1.3),Math.max(1,tileH*1.3));
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
    $("#game-resume").focus({preventScroll:true});
  });
  const optionsMain=$("#game-options-main"),settingsPanel=$("#game-settings-panel");
  const gameSettingsTrigger=$("#game-open-settings");
  function showInGameSettings(showSettings){
    optionsMain.hidden=showSettings;settingsPanel.hidden=!showSettings;
    gameSettingsTrigger.setAttribute("aria-expanded",String(showSettings));
    (showSettings?$("#game-motion"):gameSettingsTrigger).focus({preventScroll:true});
  }
  gameSettingsTrigger.addEventListener("click",()=>showInGameSettings(true));
  $("#game-settings-back").addEventListener("click",()=>showInGameSettings(false));
  optionsDialog.addEventListener("close",()=>{
    optionsMain.hidden=false;settingsPanel.hidden=true;
    gameSettingsTrigger.setAttribute("aria-expanded","false");
    if(playing&&!optionsSubdialog){simSpeed=speedBeforeOptions;updateSpeed();}
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
    if(optionsSubdialog===fullMapDialog)selectedMapFromOptions=true;
    fullMapDialog.close();focusCameraAt(x,y);paintMinimap();
  });
  $("#game-return-title").addEventListener("click",()=>{
    // Primeiro persistir com a velocidade original, depois fechar a pausa.
    if(save()!==true){notify("Não foi possível salvar. Libere espaço no navegador e tente novamente.");return;}
    optionsDialog.close();
    setSessionMode("menu");playing=false;closeDrawer();setTool("universal");
    window.TillfolkTutorialPointer?.hide();
    // O HUD da missão faz parte do jogo, nunca deve permanecer sobre o menu inicial.
    const missionCard=$("#mission-card");
    missionCard.hidden=true;
    missionCard.classList.remove("expanded");
    $("#mission-details-toggle").setAttribute("aria-expanded","false");
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
  // Abrir automaticamente a fazenda quando a última sessão estava jogando.
  // Retornar ao menu por escolha do jogador NÃO dispara retomada na próxima visita.
  if(shouldAutoResume()&&start(true))renderPriorityControls();
  let pawNextUpdate=0;
  function loop(now){
    const dt=last?Math.min((now-last)/1000,.07):0;last=now;
    if(playing){
      step(dt);uiAccumulator+=dt;saveAccumulator+=dt;
      if(uiAccumulator>.3){refresh();uiAccumulator=0;}
      if(saveAccumulator>8){save();saveAccumulator=0;}
    }
    updateCamera(now);
    draw();
    if(now>=pawNextUpdate){
      pawNextUpdate=now+130;
      window.TillfolkTutorialPointer?.guide({playing,state,
        quest:state?Missions.current(state):null,selectedTool,buildLayer,canvas,cameraZoom,
        stationSiteValid,homeSiteValid,tutorialTillSitePreferred});
    }
    if(playing&&now-lastMinimapFrame>350){paintMinimap();lastMinimapFrame=now;}
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(fitWorldCanvas);
  requestAnimationFrame(loop);
})();