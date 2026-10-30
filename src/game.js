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
  let state = null, tasks = [], selectedTool = "cultivar", playing = false, simSpeed = 1, last = 0, frameAccumulator = 0, uiAccumulator = 0, saveAccumulator=0, toastTimer;
  const random = (a) => a[Math.floor(Math.random()*a.length)];
  function makePlot(x,y,selected=false){
    return {x,y,selected,dirty:Math.random()<.13,tilled:false,fertilized:false,seeded:false,watered:false,growth:0,produce:false};
  }
  function reset(){
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
    state = {day:1,minutes:8*60,coins:220,seeds:18,water:30,food:8,
      plots, workers:[{id:1,name:"Jo",skills:[],neg:[],color:"#f4e4ac",x:7.5,y:11.5,task:null,progress:0}],
      candidates:structuredClone(initialCandidates),nextWorkerId:2,priorities:{...startPriorities},
      journal:["O vale está pronto. Marque terrenos e forme sua equipe!"]};
    tasks=[]; simSpeed=1; updateSpeed();
  }
  function readSave(){
    try {
      const s=JSON.parse(localStorage.getItem(SAVE_KEY));
      if(!s||!Array.isArray(s.plots)||!Array.isArray(s.workers))return false;
      state=s;
      state.priorities={...startPriorities,...s.priorities};
      state.workers.forEach(w=>{w.task=null;w.progress=0;w.x=Number.isFinite(w.x)?w.x:7.5;w.y=Number.isFinite(w.y)?w.y:11.5;});
      state.candidates=Array.isArray(s.candidates)?s.candidates:structuredClone(initialCandidates);
      state.journal=Array.isArray(s.journal)?s.journal:[];
      tasks=[];simSpeed=1;updateSpeed();return true;
    }catch {return false;}
  }
  function save(){if(!state||!playing)return;try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));}catch(e){console.warn("Não foi possível salvar:",e);}}
  function log(text){state.journal.unshift(text);state.journal.length=Math.min(5,state.journal.length);}
  function notify(text){const t=$("#toast");t.textContent=text;t.classList.add("visible");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("visible"),3000);}
  function start(continueSaved=false){
    if(!continueSaved||!readSave())reset();
    playing=true;$("#menu").hidden=true;$("#continue").disabled=false; refresh();
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
    available.sort((a,b)=> (state.priorities[b.type]-state.priorities[a.type])||
      (bonus(w,b.type)-bonus(w,a.type))||
      (Math.abs(w.x-(a.x+.5))+Math.abs(w.y-(a.y+.5)) - Math.abs(w.x-(b.x+.5))-Math.abs(w.y-(b.y+.5))));
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
    if(state.minutes>=1440){state.minutes-=1440;state.day++;state.food=Math.max(0,state.food-state.workers.length);log("Um novo dia começou. A equipe consumiu alimentos.");if(state.food===0)log("Atenção: sem comida para a equipe!");}
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
      part(sprite.worker,tick*48,0,48,48,x-19,y-38,38,38);
      if(!valid(sprite.worker)){ctx.fillStyle=w.color;ctx.fillRect(x-9,y-24,18,22);}
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
    $("#status").textContent=simSpeed===0?"Ⅱ Simulação pausada":"● Fazenda em funcionamento";
    $("#workers").innerHTML=state.workers.map(w=>{
      const t=tasks.find(t=>t.id===w.task);
      const title=t?labels[t.type]+" em ("+(t.x+1)+", "+(t.y+1)+")":"Aguardando tarefa";
      const positive=w.skills.length?w.skills.map(s=>'<span class="tag">✦ '+labels[s]+'</span>').join(""):'<span class="tag">Generalista</span>';
      const neg=w.neg.map(s=>'<span class="tag negative">✕ '+labels[s]+'</span>').join("");
      const factor=w.skills.length===1?"+100%":w.skills.length===2?"+60%":w.skills.length===3?"+30%":"sem bônus";
      return '<div class="worker"><div class="worker-head"><div class="portrait" style="background:'+w.color+';display:grid;place-items:center;font-size:23px">🐱</div><div><div class="worker-name">'+w.name+'</div><div class="worker-job">'+title+'</div></div></div><div class="tags">'+positive+neg+'</div><div class="worker-bar"><i style="width:'+(w.progress*100)+'%"></i></div><div class="worker-role">Especialização: '+factor+'</div></div>';
    }).join("");
    const list=tasks.slice().sort((a,b)=>state.priorities[b.type]-state.priorities[a.type]);
    $("#tasks").innerHTML=list.length?list.slice(0,8).map(t=>{
      const w=state.workers.find(w=>w.id===t.assigned);
      return '<div class="task"><div>'+icons[t.type]+' '+labels[t.type]+'<small>Terreno '+(t.x+1)+', '+(t.y+1)+'</small></div><b>'+(w?w.name:"Aguardando")+' · P'+state.priorities[t.type]+'</b></div>';
    }).join("")+(list.length>8?'<div class="empty">+ '+(list.length-8)+' outras tarefas na fila</div>':""):'<div class="empty">Fila vazia. Marque mais terrenos para cultivar.</div>';
    $("#journal").innerHTML=state.journal.map(s=>'<div class="log">✧ '+s+'</div>').join("");
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
    return {name:random(names)+" "+String(Math.floor(Math.random()*90)+10),skills,neg:negative,cost:65+count*10,color:random(["#f4dfad","#badbd1","#f1c4c5","#b9cdef"])};
  }
  function hire(i){
    const c=state.candidates[i];if(!c||state.coins<c.cost){notify("Moedas insuficientes.");return;}
    state.coins-=c.cost;
    state.workers.push({id:state.nextWorkerId++,name:c.name,skills:[...c.skills],neg:[...c.neg],color:c.color,x:7.5,y:11.5,task:null,progress:0});
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
  $("#new-game").addEventListener("click",()=>{start(false);renderPriorityControls();});
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