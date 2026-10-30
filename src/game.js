"use strict";
(() => {
  const TILE = 32, W = 28, H = 18, SAVE_KEY = "tillfolk-v01";
  const canvas = document.querySelector("#world"), ctx = canvas.getContext("2d");
  const $ = (s) => document.querySelector(s);
  ctx.imageSmoothingEnabled = false;
  const A = "./public/assets/sprout-lands/";
  const spriteUrls = {
    grass:A+"terrain/grass.png", dirt:A+"terrain/tilled-dirt.png",
    crops:A+"farming/crops.png", trees:A+"environment/trees-and-bushes.png",
    worker:A+"characters/worker-basic.png", premium:A+"characters/worker-variants.png",
    well:A+"structures/water-well.png", fences:A+"structures/fences.png",
    rocks:A+"environment/forageables.png"
  };
  const sprite = {};
  for (const [key,url] of Object.entries(spriteUrls)) {
    const img = new Image(); img.src = url; sprite[key] = img;
  }
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
      appearance:c.appearance ?? i,personalPriority:{},x:7.1+i*.8,y:11.5,task:null,progress:0
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
      state.workers.forEach(w=>{w.task=null;w.progress=0;w.personalPriority=w.personalPriority||{};w.x=Number.isFinite(w.x)?w.x:7.5;w.y=Number.isFinite(w.y)?w.y:11.5;});
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
    playing=true;$("#menu").hidden=true;$("#continue").disabled=false; refresh();save();
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
    if(available.length){w.task=available[0].id;w.progress=0;available[0].assigned=w.id;}
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
      if(!w.task)continue;
      const t=tasks.find(t=>t.id===w.task);
      if(!t){w.task=null;w.progress=0;continue;}
      const tx=t.x+.5,ty=t.y+.5,dx=tx-w.x,dy=ty-w.y,d=Math.hypot(dx,dy);
      if(d>.09){const s=Math.min(d,scaled*2.6);w.x+=dx/d*s;w.y+=dy/d*s;continue;}
      w.x=tx;w.y=ty;w.progress+=scaled*bonus(w,t.type)/baseTime[t.type];
      if(w.progress>=1){finish(w,t);w.task=null;w.progress=0;recalcTasks();}
    }
  }
  function valid(img){return img&&img.complete&&img.naturalWidth>0;}
  function part(img,sx,sy,sw,sh,x,y,w=32,h=32){
    if(valid(img))ctx.drawImage(img,sx,sy,sw,sh,x,y,w,h);
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
    // A casa e o caminho de entrada são o ponto de encontro da equipe.
    for(let y=10;y<=13;y++)for(let x=4;x<=9;x++){ctx.fillStyle="#c7ad7b";ctx.fillRect(x*TILE+3,y*TILE+3,TILE-6,TILE-6);}
    ctx.fillStyle="#765744";ctx.fillRect(3*TILE,5*TILE,5*TILE,4*TILE);
    ctx.fillStyle="#d8b78a";ctx.fillRect(3*TILE+9,5*TILE+25,5*TILE-18,4*TILE-26);
    ctx.fillStyle="#965f55";ctx.beginPath();ctx.moveTo(3*TILE-10,5*TILE+29);ctx.lineTo(5.5*TILE,4*TILE);ctx.lineTo(8*TILE+10,5*TILE+29);ctx.closePath();ctx.fill();
    ctx.fillStyle="#b97e66";ctx.beginPath();ctx.moveTo(3*TILE,5*TILE+23);ctx.lineTo(5.5*TILE,4*TILE+11);ctx.lineTo(8*TILE,5*TILE+23);ctx.closePath();ctx.fill();
    ctx.fillStyle="#533e36";ctx.fillRect(5*TILE,7*TILE,25,2*TILE);
    ctx.fillStyle="#f5cf8f";ctx.fillRect(4*TILE,6*TILE,24,24);
    ctx.fillStyle="#735849";ctx.fillRect(4*TILE+7,6*TILE+6,10,12);
    write("CASA",5.5*TILE,9*TILE+16,"#fff6ce",11);
    // Objetos naturais dos sprites.
    for(const [x,y] of trees){
      part(sprite.trees,144,48,48,48,x*TILE-25,y*TILE-50,78,78);
      if(!valid(sprite.trees)){ctx.fillStyle="#517e4b";ctx.beginPath();ctx.arc(x*TILE+16,y*TILE+9,19,0,Math.PI*2);ctx.fill();}
    }
    for(const [x,y] of rocks){part(sprite.rocks,16,32,16,16,x*TILE,y*TILE,32,32);}
    for(const [x,y] of decor){part(sprite.rocks,16,0,16,16,x*TILE+6,y*TILE+5,22,22);}
    part(sprite.well,0,0,32,32,20*TILE-16,6*TILE-16,64,64);
    write("POÇO",20*TILE+16,7*TILE+30,"#fff6ce",10);
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
    // Personagens animados com sprites originais.
    const tick=Math.floor(performance.now()/230)%4;
    for(const w of state.workers){
      const x=w.x*TILE,y=w.y*TILE;
      ctx.fillStyle="#2b472f90";ctx.beginPath();ctx.ellipse(x,y-2,12,5,0,0,Math.PI*2);ctx.fill();
      const t=tasks.find(t=>t.id===w.task);
      const image = valid(sprite.premium)?sprite.premium:sprite.worker;
      const appearance=Math.max(0,Math.min(5,w.appearance??0));
      part(image,tick*48,valid(sprite.premium)?appearance*192:0,48,48,x-22,y-42,44,44);
      if(!valid(image)){ctx.fillStyle=w.color;ctx.fillRect(x-9,y-24,18,22);}
      write(w.name,x,y-45,"#fff5dd",11);
      if(t&&w.progress>0){
        ctx.fillStyle="#20362a";ctx.fillRect(x-17,y-42,34,5);
        ctx.fillStyle="#edce83";ctx.fillRect(x-17,y-42,34*w.progress,5);
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
    return {name:random(names)+" "+String(Math.floor(Math.random()*90)+10),skills,neg:negative,cost:65+count*10,color:random(["#f4dfad","#badbd1","#f1c4c5","#b9cdef"]),appearance:Math.floor(Math.random()*6)};
  }
  function hire(i){
    const c=state.candidates[i];if(!c||state.coins<c.cost){notify("Moedas insuficientes.");return;}
    state.coins-=c.cost;
    state.workers.push({id:state.nextWorkerId++,name:c.name,skills:[...c.skills],neg:[...c.neg],color:c.color,appearance:c.appearance??0,personalPriority:{},x:7.5,y:11.5,task:null,progress:0});
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
  function randomStarter(excludeNames = []){
    let candidate;
    do {candidate=newCandidate();} while(excludeNames.includes(candidate.name));
    return candidate;
  }
  function createStarterTeam(){
    const first=randomStarter();
    starters=[first,randomStarter([first.name])];
    renderStarters();
    $("#starter-dialog").showModal();
  }
  function showStarterAvatar(canvasEl,person){
    const context=canvasEl.getContext("2d");
    context.imageSmoothingEnabled=false;context.clearRect(0,0,84,84);
    context.fillStyle=person.color;context.fillRect(0,0,84,84);
    const img=valid(sprite.premium)?sprite.premium:sprite.worker;
    if(valid(img)){
      const row=valid(sprite.premium)?(person.appearance??0)*192:0;
      const width=canvasEl.width,height=canvasEl.height;
      context.drawImage(img,0,row,48,48,0,0,width,height);
    } else {
      const width=canvasEl.width,height=canvasEl.height;
      context.fillStyle="#213d31";context.font="bold "+Math.floor(height*.43)+"px system-ui";context.textAlign="center";context.fillText("🐱",width/2,height*.68);
    }
  }
  function redrawStarterAvatars(){
    document.querySelectorAll(".starter-portrait").forEach((el)=>{
      const person=starters[Number(el.dataset.slot)];
      if(person)showStarterAvatar(el,person);
    });
  }
  function renderStarters(){
    $("#starter-slots").innerHTML=starters.map((person,index)=>{
      const count=person.skills.length;
      const bonus=count===1?100:count===2?60:30;
      const skills=person.skills.map(type=>'<span class="tag">✦ '+icons[type]+' '+labels[type]+'</span>').join("");
      const negatives=person.neg.length?person.neg.map(type=>'<span class="tag negative">✕ '+labels[type]+'</span>').join(""):'<span class="tag">Nenhuma restrição</span>';
      return '<article class="starter-slot" aria-label="Trabalhador inicial '+(index+1)+'">'+
        '<span class="starter-label">Personagem 0'+(index+1)+' · Titular</span>'+
        '<div class="starter-person"><canvas width="84" height="84" class="starter-portrait" data-slot="'+index+'" role="img" aria-label="Sprite do personagem '+person.name+'"></canvas>'+
        '<div><label for="starter-name-'+index+'" class="starter-label">Nome</label><input class="starter-name-input" id="starter-name-'+index+'" data-starter-name="'+index+'" maxlength="18" value="'+escapeHtml(person.name)+'" autocomplete="off" spellcheck="false"><small>'+count+' habilidade(s) · '+person.neg.length+' traço(s) negativo(s)</small></div></div>'+
        '<div class="starter-section-title">Habilidades positivas</div><div class="starter-skills">'+skills+'</div>'+
        '<div class="starter-bonus">✦ Bônus de <strong>+'+bonus+'% de velocidade</strong> nas especialidades.</div>'+
        '<div class="starter-section-title">Atividades proibidas</div><div class="starter-negatives">'+negatives+'</div>'+
        '<button class="starter-reroll" type="button" data-reroll="'+index+'">↻ Sortear outro personagem</button>'+
        '</article>';
    }).join("");
    redrawStarterAvatars();
  }
  sprite.premium.addEventListener("load",redrawStarterAvatars);
  sprite.worker.addEventListener("load",redrawStarterAvatars);
  $("#starter-slots").addEventListener("click",event=>{
    const btn=event.target.closest("[data-reroll]");if(!btn)return;
    const i=Number(btn.dataset.reroll);
    starters[i]=randomStarter(starters.filter((_,idx)=>idx!==i).map(c=>c.name));
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
    const first=randomStarter();starters=[first,randomStarter([first.name])];renderStarters();
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
  $("#menu-btn").addEventListener("click",()=>{save();playing=false;$("#menu").hidden=false;$("#continue").disabled=!localStorage.getItem(SAVE_KEY);});
  $("#continue").disabled=!localStorage.getItem(SAVE_KEY);
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
  requestAnimationFrame(loop);
})();