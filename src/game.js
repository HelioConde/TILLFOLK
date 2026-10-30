"use strict";
(() => {
  const TILE = 32, W = 28, H = 18, SAVE_KEY = "tillfolk-v01";
  const canvas = document.querySelector("#world"), ctx = canvas.getContext("2d");
  const $ = (s) => document.querySelector(s);
  function fitWorldCanvas(){
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
  window.addEventListener("resize",fitWorldCanvas);
  if("ResizeObserver" in window){
    new ResizeObserver(fitWorldCanvas).observe(document.querySelector(".canvas-wrap"));
  }

  ctx.imageSmoothingEnabled = false;
  const A = "./public/assets/sprout-lands/";
  const spriteUrls = {
    grass:A+"terrain/grass.png", dirt:A+"terrain/tilled-dirt.png", soil:A+"terrain/soil.png",
    crops:A+"farming/crops.png", trees:A+"environment/trees-and-bushes.png",
    worker:A+"characters/worker-basic.png", premium:A+"characters/worker-variants.png",
    well:A+"structures/water-well.png", fences:A+"structures/fences.png",
    roof:A+"structures/wood-roof.png",walls:A+"structures/wood-walls.png",furniture:A+"structures/furniture.png",chest:A+"structures/chest.png",paths:A+"structures/paths.png",fenceGates:A+"structures/fence-gates.png",
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
  function getWorkerSprite(person){
    const original=valid(sprite.premium)?sprite.premium:sprite.worker;
    if(!valid(original))return original;
    const paletteId=workerAppearanceId(person);
    if(paletteId===0)return original;
    if(workerPaletted.has(paletteId))return workerPaletted.get(paletteId);
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
    workerPaletted.set(paletteId,off);
    return off;
  }
  sprite.premium.addEventListener("load",()=>{workerPaletted.clear();redrawStarterAvatars();});
  sprite.worker.addEventListener("load",()=>{workerPaletted.clear();redrawStarterAvatars();});
  const labels = {clear:"Limpar",till:"Arar",fertilize:"Fertilizar",sow:"Semear",water:"Regar",harvest:"Colher",carry:"Transportar"};
  const icons = {clear:"🪓",till:"⛏️",fertilize:"🌿",sow:"🌱",water:"💧",harvest:"🥕",carry:"📦"};
  const baseTime = {clear:120,till:90,fertilize:60,sow:60,water:90,harvest:120,carry:60};
  const startPriorities = {clear:7,till:6,fertilize:5,sow:6,water:8,harvest:9,carry:8};
  const initialCandidates = [
    {name:"Mila",skills:["water"],neg:["clear"],cost:70,color:"#fff2bd"},
    {name:"Bento",skills:["till","sow","harvest"],neg:["fertilize"],cost:80,color:"#d3d6fc"},
    {name:"Lina",skills:["carry","fertilize"],neg:[],cost:90,color:"#ffcfc5"}
  ];
  const trees = [[3,2],[22,2],[24,4],[2,13],[25,14],[22,16],[7,2],[19,13],[3,16]];
  const rocks = [[5,13],[20,11],[25,8]];
  const decor = [[10,2],[11,3],[16,3],[18,4],[2,8],[5,15],[10,15],[24,10],[18,16],[22,9]];
  const keyOf = (x,y) => x+"-"+y;
  const nearby = (x,y) => Math.abs(x-5)+Math.abs(y-8);
  const blocked = (x,y) => x<1||y<1||x>=W-1||y>=H-1||((x>=3&&x<=7)&&(y>=5&&y<=9))||trees.some(t=>t[0]===x&&t[1]===y)||rocks.some(t=>t[0]===x&&t[1]===y)||(x===20&&y===6)||(x>=4&&x<=9&&y===10);
  // Caminhos em grade impedem que colonos atravessem a casa, árvores e objetos.
  // Só a navegação usa esta malha; o cultivo continua seguindo as regras existentes.
  const directions=[[1,0],[-1,0],[0,1],[0,-1]];
  function routeBetween(fromX,fromY,toX,toY){
    const start=[Math.floor(fromX),Math.floor(fromY)],goal=[toX,toY];
    const id=(x,y)=>x+","+y, origin=id(...start), destination=id(...goal);
    if(blocked(toX,toY))return [];
    if(origin===destination)return [{x:toX+.5,y:toY+.5}];
    const queue=[start],previous=new Map([[origin,null]]);
    for(let head=0;head<queue.length&&!previous.has(destination);head++){
      const [x,y]=queue[head];
      for(const [dx,dy] of directions){
        const nx=x+dx,ny=y+dy,key=id(nx,ny);
        if(previous.has(key)||blocked(nx,ny))continue;
        previous.set(key,id(x,y));queue.push([nx,ny]);
      }
    }
    if(!previous.has(destination))return [];
    const result=[];
    for(let key=destination;key!==origin;key=previous.get(key)){
      const [x,y]=key.split(",").map(Number);result.push({x:x+.5,y:y+.5});
    }
    return result.reverse();
  }
  let state = null, tasks = [], selectedTool = "cultivar", playing = false, simSpeed = 1, last = 0, frameAccumulator = 0, uiAccumulator = 0, saveAccumulator=0, toastTimer, starters = [], pendingMode = "survival", managementTab = "priorities", managementWorker = null, speedBeforeManagement = 1;
  const random = (a) => a[Math.floor(Math.random()*a.length)];
  function makePlot(x,y,selected=false){
    return {x,y,selected,dirty:Math.random()<.13,tilled:false,fertilized:false,seeded:false,watered:false,growth:0,produce:false};
  }
  function reset(chosenStarters = [], config = {}){
    const plots = [];
    for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++)if(!blocked(x,y))plots.push(makePlot(x,y,false));
    for(let y=8;y<=10;y++)for(let x=12;x<=15;x++){
      const p=plots.find(p=>p.x===x&&p.y===y);
      if(p){p.selected=true;p.dirty=false;}
    }
    const seeded=plots.find(p=>p.x===12&&p.y===8);
    if(seeded){seeded.tilled=true;seeded.fertilized=true;seeded.seeded=true;seeded.watered=true;seeded.growth=.75;}
    const wet=plots.find(p=>p.x===13&&p.y===8);
    if(wet){wet.tilled=true;wet.fertilized=true;wet.seeded=true;wet.watered=false;wet.growth=.1;}
    const team = chosenStarters.slice(0,2).map((c,i)=>({
      id:i+1,name:c.name,skills:[...c.skills],neg:[...c.neg],color:c.color,
      appearance:c.appearance ?? i,personalPriority:{},x:7.5+i,y:11.5,task:null,progress:0,facing:"down",moving:false,walkFrame:0
    }));
    state = {day:1,minutes:8*60,coins:220,seeds:18,water:30,food:8,mode:config.mode||"survival",farmName:config.farmName||"Vale do Amanhecer",
      plots, workers:team,
      candidates:structuredClone(initialCandidates),nextWorkerId:team.length+1,priorities:{...startPriorities},
      journal:["A equipe inicial chegou ao vale: "+team.map(w=>w.name).join(" e ")+"!"]};
    tasks=[]; simSpeed=1; updateSpeed();
  }
  function readSave(){
    try {
      const s=JSON.parse(localStorage.getItem(SAVE_KEY));
      if(!s||!Array.isArray(s.plots)||!Array.isArray(s.workers))return false;
      state=s;
      state.mode=state.mode||"survival";
      state.farmName=state.farmName||"Minha Fazenda";
      state.priorities={...startPriorities,...s.priorities};
      state.workers.forEach(w=>{w.task=null;w.progress=0;w.personalPriority=w.personalPriority||{};w.x=Number.isFinite(w.x)?w.x:7.5;w.y=Number.isFinite(w.y)?w.y:11.5;w.route=[];w.routeTask=null;w.facing=w.facing||"down";w.moving=false;w.walkFrame=0;});
      state.candidates=Array.isArray(s.candidates)?s.candidates:structuredClone(initialCandidates);
      state.journal=Array.isArray(s.journal)?s.journal:[];
      tasks=[];simSpeed=1;updateSpeed();return true;
    }catch {return false;}
  }
  function save(){if(!state||!playing)return;try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));}catch(e){console.warn("Não foi possível salvar:",e);}}
  function log(text){state.journal.unshift(text);state.journal.length=Math.min(5,state.journal.length);}
  function notify(text){const t=$("#toast");t.textContent=text;t.classList.add("visible");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("visible"),3000);}
  function start(continueSaved=false, chosenStarters = [], config = {}){
    if(!continueSaved||!readSave())reset(chosenStarters,config);
    playing=true;$("#menu").hidden=true;$(".app-shell").inert=false;$("#continue").disabled=false; refresh();save();
    // Exibir a horta primeiro nos celulares, sem mudar a escala do pixel art.
    if(window.innerWidth<=610){
      const viewport=document.querySelector(".canvas-scroll");
      requestAnimationFrame(()=>{viewport.scrollLeft=Math.max(0,(viewport.scrollWidth-viewport.clientWidth)/2);});
    }
    notify("Sua fazenda está pronta. Os trabalhadores já estão a caminho!");
  }
  function getNext(p){
    if(!p.selected)return null;
    if(p.produce)return "carry";
    if(p.dirty)return "clear";
    if(!p.tilled)return "till";
    if(!p.fertilized)return "fertilize";
    if(!p.seeded)return state.seeds>0?"sow":null;
    if(!p.watered)return state.water>0?"water":null;
    if(p.growth>=1)return "harvest";
    return null;
  }
  function recalcTasks(){
    const assigned=new Map();
    state.workers.forEach(w=>{if(w.task)assigned.set(w.task,w.id);});
    tasks=state.plots.map(p=>{
      const type=getNext(p);
      return type ? {id:keyOf(p.x,p.y)+":"+type,x:p.x,y:p.y,type,assigned:assigned.get(keyOf(p.x,p.y)+":"+type)||null}:null;
    }).filter(Boolean);
    for(const w of state.workers)if(w.task&&!tasks.some(t=>t.id===w.task)){w.task=null;w.progress=0;}
  }
  function bonus(w,type){return w.skills.includes(type)?(w.skills.length===1?2:w.skills.length===2?1.6:1.3):1;}
  function assign(w){
    if(w.task)return;
    const available=tasks.filter(t=>!t.assigned&&!w.neg.includes(t.type));
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
  function finish(w,t){
    const p=state.plots.find(p=>p.x===t.x&&p.y===t.y);
    if(!p)return;
    switch(t.type){
      case "clear":p.dirty=false;state.coins+=2;break;
      case "till":p.tilled=true;break;
      case "fertilize":p.fertilized=true;break;
      case "sow":if(state.seeds<=0)return;p.seeded=true;p.growth=0;state.seeds--;break;
      case "water":if(state.water<=0)return;p.watered=true;state.water--;break;
      case "harvest":p.produce=true;p.seeded=false;p.watered=false;p.growth=0;break;
      case "carry":p.produce=false;p.fertilized=false;state.food+=3;state.coins+=15;state.seeds+=2;log(w.name+" armazenou a colheita (+3 comida, +15 moedas).");break;
    }
    if(t.type!=="carry"&&t.type!=="harvest")log(w.name+" terminou: "+labels[t.type].toLowerCase()+".");
  }
  function step(dt){
    if(!playing||simSpeed===0)return;
    const scaled=Math.min(dt,.07)*simSpeed;
    state.minutes+=scaled*1.25;
    if(state.minutes>=1440){state.minutes-=1440;state.day++;if(state.mode==="survival"){state.food=Math.max(0,state.food-state.workers.length);log("Um novo dia começou. A equipe consumiu alimentos.");if(state.food===0)log("Atenção: sem comida para a equipe!");}else{log("Um novo dia começou na fazenda tranquila.");}}
    for(const p of state.plots)if(p.seeded&&p.watered&&p.growth<1)p.growth=Math.min(1,p.growth+scaled/180);
    recalcTasks();
    for(const w of state.workers)assign(w);
    for(const w of state.workers){
      w.moving=false;
      if(!w.task)continue;
      const t=tasks.find(t=>t.id===w.task);
      if(!t){w.task=null;w.progress=0;w.route=[];continue;}
      if(w.routeTask!==w.task){
        w.route=routeBetween(w.x,w.y,t.x,t.y);
        w.routeTask=w.task;
      }
      const target=w.route?.[0]||{x:t.x+.5,y:t.y+.5};
      const dx=target.x-w.x,dy=target.y-w.y,d=Math.hypot(dx,dy);
      if(d>.055){
        if(Math.abs(dx)>Math.abs(dy))w.facing=dx>0?"right":"left";
        else w.facing=dy>0?"down":"up";
        const distance=Math.min(d,scaled*2.65);
        w.x+=dx/d*distance;w.y+=dy/d*distance;
        w.moving=true;w.walkFrame=(w.walkFrame||0)+distance*4.5;
        continue;
      }
      w.x=target.x;w.y=target.y;
      if(w.route?.length){w.route.shift();continue;}
      w.progress+=scaled*bonus(w,t.type)/baseTime[t.type];
      if(w.progress>=1){finish(w,t);w.task=null;w.progress=0;w.route=[];w.routeTask=null;recalcTasks();}
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
    ctx.clearRect(0,0,canvas.width,canvas.height);
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      const xx=x*TILE,yy=y*TILE,r=(x*17+y*13)%5;
      ctx.fillStyle=r===0?"#a6cf7a":"#abd482";ctx.fillRect(xx,yy,TILE,TILE);
      part(sprite.grass,r*16,80,16,16,xx,yy);
      if((x*31+y*17)%19===0){ctx.fillStyle="#d8e3a0";ctx.fillRect(xx+8,yy+9,2,2);ctx.fillRect(xx+11,yy+12,2,2);}
    }
    // Pátio e caminhos de terra: o jogador lê o acesso à casa, à horta e ao poço.
    const pathTiles=new Set();
    for(let y=10;y<=13;y++)for(let x=4;x<=9;x++)pathTiles.add(keyOf(x,y));
    for(let x=9;x<=19;x++)pathTiles.add(keyOf(x,12));
    for(let y=7;y<=12;y++)pathTiles.add(keyOf(19,y));
    for(const key of pathTiles){
      const [x,y]=key.split("-").map(Number);
      part(sprite.soil,0,80,16,16,x*TILE,y*TILE,TILE,TILE);
    }
    // A borda da horta delimita o espaço cultivável sem bloquear cliques.
    for(let x=11;x<=16;x++)part(sprite.fences,32,0,16,16,x*TILE,7*TILE-14,32,26);
    for(let y=8;y<=11;y++){
      part(sprite.fences,0,0,16,16,11*TILE-11,y*TILE,24,32);
      part(sprite.fences,0,0,16,16,16*TILE+13,y*TILE,24,32);
    }
    const hx=3*TILE,hy=5*TILE;
    for(let row=0;row<6;row++)for(let col=0;col<9;col++){
      part(sprite.walls,16,16,16,16,hx+col*18,hy+52+row*16,18,16);
    }
    // Peças do telhado: telhas do pacote Sprout Lands, sem triângulos de Canvas.
    for(let row=0;row<4;row++)for(let col=0;col<5;col++){
      part(sprite.roof,48+(col%4)*16,32+(row%3)*16,16,16,hx-13+col*35,hy+row*17,37,19);
    }
    for(let col=0;col<5;col++){
      part(sprite.roof,48+(col%4)*16,64,16,16,hx-13+col*35,hy+60,37,19);
    }
    part(sprite.walls,0,0,32,32,hx+10,hy+91,40,43);
    part(sprite.walls,48,0,32,32,hx+118,hy+91,40,43);
    part(sprite.walls,48,32,16,16,hx+68,hy+102,29,43);
    part(sprite.furniture,0,16,16,16,hx-11,hy+121,26,26);
    part(sprite.chest,0,0,32,32,hx+161,hy+119,30,31);
    write("CASA",hx+80,hy+153,"#fff6ce",11);
    // A vegetação e os colonos são desenhados juntos, ordenados pelos pés.
    for(const p of state.plots){
      if(!p.selected)continue;
      const x=p.x*TILE,y=p.y*TILE;
      ctx.fillStyle=p.tilled?"#b38f6c":"#99c46b";ctx.fillRect(x+1,y+1,TILE-2,TILE-2);
      if(p.tilled)part(sprite.dirt,0,80,16,16,x,y);
      if(p.fertilized){ctx.fillStyle="#6c7652";ctx.fillRect(x+4,y+8,3,3);ctx.fillRect(x+25,y+22,2,2);}
      if(p.seeded)part(sprite.crops,Math.min(4,Math.floor(p.growth*5))*16,0,16,16,x,y,32,32);
      if(p.produce)part(sprite.crops,64,16,16,16,x,y,32,32);
      if(p.dirty)part(sprite.rocks,16,0,16,16,x,y,32,32);
      if(!p.tilled){ctx.strokeStyle="#ecdf96";ctx.lineWidth=1;ctx.setLineDash([4,3]);ctx.strokeRect(x+3,y+3,26,26);ctx.setLineDash([]);}
      if(p.watered&&p.seeded){ctx.fillStyle="#6cc8e5";ctx.fillRect(x+2,y+26,4,3);}
    }
    // Profundidade natural: árvores cobrem personagens atrás delas e vice-versa.
    const layers=[
      ...trees.map(([x,y])=>({type:"tree",x,y,depth:(y+1)*TILE+7})),
      ...rocks.map(([x,y])=>({type:"rock",x,y,depth:(y+1)*TILE})),
      ...decor.map(([x,y])=>({type:"decor",x,y,depth:(y+1)*TILE})),
      {type:"well",x:20,y:6,depth:7*TILE},
      ...state.workers.map(worker=>({type:"worker",worker,depth:worker.y*TILE}))
    ].sort((a,b)=>a.depth-b.depth);
    const rowFor={down:0,up:1,left:2,right:3};
    for(const item of layers){
      const {x,y,type}=item;
      if(type==="tree"){
        part(sprite.trees,144,48,48,48,x*TILE-25,y*TILE-50,78,78);
      }else if(type==="rock"){
        part(sprite.rocks,16,32,16,16,x*TILE,y*TILE,32,32);
      }else if(type==="decor"){
        part(sprite.rocks,16,0,16,16,x*TILE+6,y*TILE+5,22,22);
      }else if(type==="well"){
        part(sprite.well,0,0,32,32,20*TILE-16,6*TILE-16,64,64);
        write("POÇO",20*TILE+16,7*TILE+30,"#fff6ce",10);
      }else{
        const w=item.worker,px=w.x*TILE,py=w.y*TILE;
        ctx.fillStyle="#223c3180";ctx.beginPath();ctx.ellipse(px,py-2,11,4,0,0,Math.PI*2);ctx.fill();
        const image=getWorkerSprite(w);
        // Atlas 48 px: linhas 0–3 = parado, linhas 4–7 = caminhada em 4 direções.
        // A sequência não anda quando o colono está trabalhando ou esperando.
        const row=(rowFor[w.facing]||0)+(w.moving?4:0);
        const frame=w.moving?Math.floor(w.walkFrame||0)%8:0;
        part(image,frame*48+11,row*48+8,26,32,px-20,py-42,40,45);
        if(!valid(sprite.premium)&&!valid(sprite.worker)){ctx.fillStyle=w.color;ctx.fillRect(px-10,py-30,20,27);}
        const active=tasks.find(t=>t.id===w.task);
        write(w.name,px,py-49,"#fff5dd",11);
        if(active&&!w.moving&&w.progress>0){
          ctx.fillStyle="#20362a";ctx.fillRect(px-17,py-45,34,5);
          ctx.fillStyle="#edce83";ctx.fillRect(px-17,py-45,34*w.progress,5);
        }
      }
    }
  }
  function refresh(){
    if(!state)return;
    const set=(id,value)=>{$(id).textContent=value;};
    set("#day",String(state.day).padStart(2,"0"));
    const m=Math.floor(state.minutes);set("#clock",String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0"));
    for(const key of ["coins","seeds","water","food"])set("#"+key,state[key]);
    set("#worker-count",state.workers.length);set("#task-count",tasks.length);
    set("#farm-title",state.farmName||"Minha Fazenda");
    set("#mode-label",(state.mode==="relaxed"?"FAZENDA TRANQUILA":"SOBREVIVÊNCIA")+" · DIA "+state.day);
    $("#status").textContent=simSpeed===0?"Ⅱ Simulação pausada":"● Fazenda em funcionamento";
    $("#workers").innerHTML=state.workers.map(w=>{
      const t=tasks.find(t=>t.id===w.task);
      const title=t?labels[t.type]+" em ("+(t.x+1)+", "+(t.y+1)+")":"Aguardando tarefa";
      const positive=w.skills.length?w.skills.map(s=>'<span class="tag">✦ '+labels[s]+'</span>').join(""):'<span class="tag">Generalista</span>';
      const neg=w.neg.map(s=>'<span class="tag negative">✕ '+labels[s]+'</span>').join("");
      const factor=w.skills.length===1?"+100%":w.skills.length===2?"+60%":w.skills.length===3?"+30%":"sem bônus";
      return '<div class="worker"><div class="worker-head"><canvas class="portrait worker-avatar" data-worker-avatar="'+w.id+'" width="40" height="42"></canvas><div><div class="worker-name">'+escapeHtml(w.name)+'</div><div class="worker-job">'+title+'</div></div></div><div class="tags">'+positive+neg+'</div><div class="worker-bar"><i style="width:'+(w.progress*100)+'%"></i></div><div class="worker-role">Especialização: '+factor+'</div></div>';
    }).join("");
    const list=tasks.slice().sort((a,b)=>state.priorities[b.type]-state.priorities[a.type]);
    $("#tasks").innerHTML=list.length?list.slice(0,8).map(t=>{
      const w=state.workers.find(w=>w.id===t.assigned);
      return '<div class="task"><div>'+icons[t.type]+' '+labels[t.type]+'<small>Terreno '+(t.x+1)+', '+(t.y+1)+'</small></div><b>'+(w?escapeHtml(w.name):"Aguardando")+' · P'+state.priorities[t.type]+'</b></div>';
    }).join("")+(list.length>8?'<div class="empty">+ '+(list.length-8)+' outras tarefas na fila</div>':""):'<div class="empty">Fila vazia. Marque mais terrenos para cultivar.</div>';
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
  function renderCandidates(){
    $("#candidates").innerHTML=state.candidates.map((c,i)=>{
      return '<div class="candidate"><div class="candidate-head"><h3>🌿 '+c.name+'</h3><b>🪙 '+c.cost+'</b></div>'+htmlTags(c)+'<button class="small-primary" data-hire="'+i+'" '+(state.coins<c.cost?"disabled":"")+'>Contratar trabalhador</button></div>';
    }).join("");
  }
  const names=["Nico","Cora","Tito","Eva","Bia","Theo","Léo","Sol","Ravi","Mel","Ivo","Lua","Dora","Zeca"];
  function newCandidate(){
    const types=Object.keys(labels),count=1+Math.floor(Math.random()*3);
    const skills=types.slice().sort(()=>Math.random()-.5).slice(0,count);
    const negative=types.filter(t=>!skills.includes(t)).sort(()=>Math.random()-.5).slice(0,Math.floor(Math.random()*4));
    return {name:random(names)+" "+String(Math.floor(Math.random()*90)+10),skills,neg:negative,cost:65+count*10,color:random(["#f4dfad","#badbd1","#f1c4c5","#b9cdef"]),appearance:Math.floor(Math.random()*workerPalettes.length)};
  }
  function hire(i){
    const c=state.candidates[i];if(!c||state.coins<c.cost){notify("Moedas insuficientes.");return;}
    state.coins-=c.cost;
    state.workers.push({id:state.nextWorkerId++,name:c.name,skills:[...c.skills],neg:[...c.neg],color:c.color,appearance:c.appearance??0,personalPriority:{},x:7.5,y:11.5,task:null,progress:0,facing:"down",moving:false,walkFrame:0});
    state.candidates[i]=newCandidate();
    log(c.name+" entrou para a equipe.");
    renderCandidates();refresh();save();notify(c.name+" contratado(a)!");$("#hire-dialog").close();
  }
  function findPlot(x,y){return state.plots.find(p=>p.x===x&&p.y===y);}
  function inspect(p){
    const task=getNext(p);
    $("#tile-tooltip").hidden=false;
    $("#tile-tooltip").textContent="Terreno "+(p.x+1)+", "+(p.y+1)+" · "+(p.selected?"Cultivo ativo":"Disponível")+
      " · "+(p.produce?"Colheita no chão":p.seeded?"Crescimento "+Math.floor(p.growth*100)+"%":p.tilled?"Solo arado":"Solo natural")+
      (task?" · Próxima tarefa: "+labels[task]:"");
  }
  canvas.addEventListener("click",event=>{
    if(!playing||!state)return;
    const rect=canvas.getBoundingClientRect(),x=Math.floor((event.clientX-rect.left)/rect.width*W),y=Math.floor((event.clientY-rect.top)/rect.height*H);
    const p=findPlot(x,y);
    if(!p){notify("Este espaço está ocupado ou fora da área cultivável.");return;}
    if(selectedTool==="inspecionar"){inspect(p);return;}
    p.selected=(selectedTool==="cultivar");
    $("#tile-tooltip").hidden=true;
    if(!p.selected)for(const w of state.workers)if(w.task&&w.task.startsWith(keyOf(x,y)+":")){w.task=null;w.progress=0;}
    recalcTasks();refresh();save();
  });
  document.querySelectorAll("[data-tool]").forEach(b=>b.addEventListener("click",()=>{
    selectedTool=b.dataset.tool;
    document.querySelectorAll("[data-tool]").forEach(x=>{const on=x===b;x.classList.toggle("active",on);x.setAttribute("aria-pressed",String(on));});
    $("#tile-tooltip").hidden=true;
  }));
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
    starters=[first,randomStarter([first.name],[first.appearance])];
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
    const tasks=Object.keys(labels);
    $("#starter-slots").innerHTML=starters.map((person,index)=>{
      const count=person.skills.length,bonus=count===1?100:count===2?60:count===3?30:0;
      const kind=count===1?"Especialista":count===2?"Multitalento":count===3?"Versátil":"Generalista";
      const positive=person.skills.length?person.skills.map(type=>
        '<div class="recruit-trait positive"><span class="recruit-trait-icon">'+icons[type]+'</span><div><strong>'+labels[type]+'</strong><small>'+activityDetails[type]+'</small></div><b>+'+bonus+'%</b></div>'
      ).join(""):'<p class="recruit-empty">Nenhuma especialidade: executa todas as tarefas permitidas na velocidade normal.</p>';
      const negative=person.neg.length?person.neg.map(type=>
        '<div class="recruit-trait forbidden"><span class="recruit-trait-icon">✕</span><div><strong>Não pode '+labels[type].toLowerCase()+'</strong><small>'+activityDetails[type]+'</small></div></div>'
      ).join(""):'<p class="recruit-empty positive-note">✓ Sem restrições. Pode realizar todas as atividades da fazenda.</p>';
      const permitted=tasks.length-person.neg.length;
      const workTable=tasks.map(type=>{
        const forbidden=person.neg.includes(type);
        const duration=forbidden?'Proibido':Math.round(baseTime[type]/bonusForCandidate(person,type))+'s';
        const active=person.skills.includes(type);
        return '<div class="recruit-work-row '+(forbidden?'work-forbidden':active?'work-bonus':'')+'"><span>'+icons[type]+' '+labels[type]+'</span><b>'+duration+'</b></div>';
      }).join("");
      return '<article class="starter-slot" aria-label="Trabalhador inicial '+(index+1)+'">'+
        '<div class="starter-card-top"><span>PERSONAGEM 0'+(index+1)+'</span><span class="starter-kind">'+kind+'</span></div>'+
        '<div class="starter-stage"><div class="starter-stage-top">✦ NOVO TRABALHADOR <span>DISPONÍVEL</span></div>'+
        '<canvas width="200" height="152" class="starter-portrait" data-slot="'+index+'" role="img" aria-label="Sprite ampliado de '+escapeHtml(person.name)+'"></canvas>'+
        '<span class="starter-stage-bottom">✦ PRONTO PARA TRABALHAR ✦</span></div>'+
        '<div class="starter-person"><div class="starter-name-wrap"><label for="starter-name-'+index+'">NOME DO PERSONAGEM <span>✎ EDITÁVEL</span></label>'+
        '<input class="starter-name-input" id="starter-name-'+index+'" data-starter-name="'+index+'" maxlength="18" value="'+escapeHtml(person.name)+'" autocomplete="off" spellcheck="false">'+
        '<small>'+count+' especialidade'+(count===1?'':'s')+' · '+person.neg.length+' restrição'+(person.neg.length===1?'':'ões')+'</small></div></div>'+
        '<div class="recruit-summary"><div><span>BÔNUS DE TRABALHO</span><strong>+'+bonus+'%</strong></div><div><span>TAREFAS PERMITIDAS</span><strong>'+permitted+' / '+tasks.length+'</strong></div></div>'+
        '<div class="starter-info-scroll">'+
        '<div class="starter-section-title">✦ HABILIDADES POSITIVAS</div>'+
        '<div class="starter-skills">'+positive+'</div>'+
        '<div class="starter-section-title">✕ TRAÇOS NEGATIVOS</div>'+
        '<div class="starter-negatives">'+negative+'</div>'+
        '<details class="starter-activity-details"><summary>◷ Comparar tempo em todas as atividades</summary>'+
        '<p>Tempo em velocidade 1×, sem contar deslocamento. Uma tarefa proibida não poderá ser executada por este trabalhador.</p>'+
        '<div class="recruit-work-grid">'+workTable+'</div></details>'+
        '</div>'+
        '<button class="starter-reroll" type="button" data-reroll="'+index+'">↻ Sortear outro personagem</button>'+
        '</article>';
    }).join("");
    redrawStarterAvatars();
  }
  function bonusForCandidate(person,type){
    if(!person.skills.includes(type))return 1;
    return person.skills.length===1?2:person.skills.length===2?1.6:1.3;
  }
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
  $("#menu-btn").addEventListener("click",()=>{save();playing=false;$(".app-shell").inert=true;$("#menu").hidden=false;$("#continue").disabled=!localStorage.getItem(SAVE_KEY);$("#new-game").focus({preventScroll:true});});
  $("#continue").disabled=!localStorage.getItem(SAVE_KEY);
  $("#focus-game").addEventListener("click",()=>{const focused=document.body.classList.toggle("focus-game");$("#focus-game").setAttribute("aria-pressed",String(focused));$("#focus-game").textContent=focused?"▤ Mostrar gestão":"▣ Tela de jogo";});
  $(".app-shell").inert=!$("#menu").hidden;
  reset();renderPriorityControls();recalcTasks();refresh();
  function loop(now){
    const dt=last?Math.min((now-last)/1000,.07):0;last=now;
    if(playing){
      step(dt);uiAccumulator+=dt;saveAccumulator+=dt;
      if(uiAccumulator>.3){refresh();uiAccumulator=0;}
      if(saveAccumulator>8){save();saveAccumulator=0;}
    }
    draw();requestAnimationFrame(loop);
  }
  requestAnimationFrame(fitWorldCanvas);
  requestAnimationFrame(loop);
})();