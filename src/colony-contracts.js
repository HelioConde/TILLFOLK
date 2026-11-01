"use strict";
/* Mutirões opcionais pós-tutorial. Somente ordens concluídas pelo motor contam. */
((root,factory)=>{
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.TillfolkContracts=api;
})(typeof window!=="undefined"?window:null,()=>{
 const PLANS=Object.freeze([
  {id:"madeira",icon:"🪓",title:"Lenha para o abrigo",desc:"Corte duas árvores de verdade.",help:"Use Universal sobre árvores. É necessário um colono com machado que possa executar Limpar.",type:"clear",kind:"tree",goal:2,reward:10,requires:"axe",action:"universal"},
  {id:"cabana",icon:"🏡",title:"Um teto para a equipe",desc:"Conclua uma cabana e ganhe uma nova vaga.",help:"Abra Objetos → Cabana, posicione o blueprint e aguarde a entrega física de madeira.",type:"buildHome",goal:1,reward:12,requires:"axe",action:"construir"},
  {id:"plantio",icon:"🌱",title:"Reforço da horta",desc:"Plante duas sementes para a próxima safra.",help:"Colete sementes, are dois canteiros e depois use Universal para semear em cada um.",type:"sow",goal:2,reward:8,requires:"hoe",action:"universal"},
  {id:"gravetos",icon:"🌾",title:"Os primeiros materiais",desc:"Recolha três gravetos caídos no vale.",help:"Use Universal nos gravetos soltos do chão. Não precisa de ferramenta.",type:"clear",kind:"twig",goal:3,reward:7,action:"universal"},
  {id:"pedrinhas",icon:"🪨",title:"Pedras para ferramentas",desc:"Recolha duas pedras pequenas.",help:"Use Universal nas pequenas pedrinhas do mapa. Elas podem ser coletadas à mão.",type:"clear",kind:"pebble",goal:2,reward:7,action:"universal"},
  {id:"clareira",icon:"🌿",title:"Clareira da vila",desc:"Limpe três obstáculos do terreno.",help:"Use Universal em gravetos, grama alta ou pedras; conte apenas as ordens concluídas.",type:"clear",goal:3,reward:7,action:"universal"},
  {id:"canteiros",icon:"⛏️",title:"Terra preparada",desc:"Are três canteiros novos.",help:"Escolha solo livre com Universal. Quem executar precisa poder arar e possuir enxada.",type:"till",goal:3,reward:8,requires:"hoe",action:"universal"},
  {id:"irrigar",icon:"💧",title:"Dia de irrigação",desc:"Regue duas plantações.",help:"Use Universal num canteiro plantado. O colono com regador buscará água se necessário.",type:"water",goal:2,reward:8,requires:"wateringCan",action:"universal"},
  {id:"colheita",icon:"🥕",title:"Despensa reforçada",desc:"Transporte duas colheitas para o estoque.",help:"Ordene Colher numa plantação madura; depois marque Transportar no canteiro.",type:"carry",goal:2,reward:9,requires:"firstHarvest",action:"universal"},
  {id:"deposito",icon:"🧰",title:"Tudo em seu lugar",desc:"Construa um baú de verdade.",help:"Abra Objetos → Baú, posicione o projeto e espere os colonos levarem os materiais.",type:"buildChest",goal:1,reward:10,requires:"station",action:"construir"},
  {id:"poco",icon:"🚰",title:"Água para a vila",desc:"Construa um poço após pesquisar conservação.",help:"Pesquise Conservação em Colônia; depois abra Objetos → Poço e construa.",type:"buildWell",goal:1,reward:12,requires:"research2",action:"construir"}
 ]);
 const byId=Object.fromEntries(PLANS.map(p=>[p.id,p]));
 const num=(v,max=100000)=>Number.isFinite(Number(v))?Math.max(0,Math.min(max,Math.floor(Number(v)))):0;
 function normalize(state){
  if(!state||typeof state!=="object")return null;
  const old=state.contracts&&typeof state.contracts==="object"?state.contracts:{};
  const prior=old.active&&byId[old.active.id]?old.active:null;
  state.contracts={version:1,active:prior?{id:prior.id,progress:num(prior.progress,byId[prior.id].goal),startedDay:Math.max(1,num(prior.startedDay))}:null,
   completedDay:num(old.completedDay),completedTotal:num(old.completedTotal),
   lastTitle:PLANS.some(p=>p.title===old.lastTitle)?old.lastTitle:"Mutirão concluído"};
  return state.contracts;
 }
 const permitted=(s,type)=>Boolean(s.workers?.some(w=>!w.neg?.includes(type)));
 const equipped=(s,tool,type)=>Boolean(s.workers?.some(w=>w.inventory?.tools?.[tool]===true&&!w.neg?.includes(type)));
 function available(s,p){
  if(!permitted(s,p.type))return false;
  if(p.requires==="axe"&&!equipped(s,"axe","clear"))return false;
  if(p.requires==="hoe"&&!equipped(s,"hoe",p.type))return false;
  if(p.requires==="wateringCan"&&!equipped(s,"wateringCan","water"))return false;
  if(p.requires==="firstHarvest"&&!s.firstHarvest)return false;
  if(p.requires==="station"&&!s.crafting?.station)return false;
  if(p.requires==="research2"&&(s.colonyLife?.researchLevel||0)<2)return false;
  if(p.id==="cabana"&&(s.homes?.length||0)>=s.workers.length+1)return false;
  if(p.id==="deposito"&&s.chests?.length)return false;
  if(p.id==="poco"&&s.wells?.length)return false;
  return true;
 }
 function offers(s){
  const saved=normalize(s);
  if(!saved||s.gameOver||!s.workers?.length)return [];
  const pool=PLANS.filter(p=>available(s,p));
  if(!pool.length)return [];
  const rotate=(Math.max(1,num(s.day))-1+saved.completedTotal)%pool.length;
  return pool.slice(rotate).concat(pool.slice(0,rotate)).slice(0,3);
 }
 function select(s,id){
  const choices=offers(s); // offers() normaliza; obter a referência ao estado DEPOIS.
  const saved=normalize(s);
  if(!saved||s.gameOver||saved.active||saved.completedDay===num(s.day))
   return {ok:false,reason:"Já existe um mutirão ou o dia foi concluído."};
  const plan=choices.find(p=>p.id===id);
  if(!plan)return {ok:false,reason:"Escolha um dos mutirões oferecidos."};
  saved.active={id,progress:0,startedDay:Math.max(1,num(s.day))};
  return {ok:true,plan};
 }
 function record(s,order,detail={}){
  const saved=normalize(s),active=saved?.active,p=active&&byId[active.id];
  if(!p||s.gameOver||order?.type!==p.type||(p.kind&&p.kind!==detail.kind))return null;
  active.progress=Math.min(p.goal,active.progress+1);
  if(active.progress<p.goal)return {progressed:true,progress:active.progress,goal:p.goal};
  saved.active=null;saved.completedDay=num(s.day);saved.completedTotal++;saved.lastTitle=p.title;
  for(const w of s.workers||[])w.morale=Math.min(100,Math.max(0,(Number.isFinite(w.morale)?w.morale:75)+p.reward));
  return {progressed:true,completed:true,plan:p,reward:p.reward,total:saved.completedTotal};
 }
 function current(s){const data=normalize(s);return data?.active?byId[data.active.id]:null;}
 function view(s){
  const data=normalize(s);
  if(data.active)return {mode:"active",plan:byId[data.active.id],progress:data.active.progress,total:data.completedTotal};
  if(data.completedDay>0&&data.completedDay===num(s.day))return {mode:"completed",lastTitle:data.lastTitle,total:data.completedTotal};
  return {mode:"choose",options:offers(s),total:data.completedTotal};
 }
 function render(s,el,playing=true){
  if(!el)return;
  const visible=Boolean(playing&&s&&!s.gameOver&&s.workers?.length&&(!s.tutorial?.active||s.tutorial.finished));
  el.hidden=!visible;
  if(!visible){el.dataset.contractView="";return;}
  const v=view(s),key=JSON.stringify(v);
  if(el.dataset.contractView===key)return;
  el.dataset.contractView=key;
  const heading='<div class="contract-heading"><strong>✦ MUTIRÕES DO VALE</strong><small>'+v.total+' concluído(s)</small></div>';
  if(v.mode==="completed"){
   el.innerHTML=heading+'<div class="contract-done" role="status"><strong>✓ '+v.lastTitle+'</strong><small>Equipe animada! Novo mutirão no próximo dia.</small></div>';
  }else if(v.mode==="active"){
   const p=v.plan;
   el.innerHTML=heading+'<div class="contract-active"><div class="contract-main"><span aria-hidden="true">'+p.icon+'</span><div><strong>'+p.title+'</strong><small>'+p.desc+'</small></div></div>'+
    '<div class="contract-progress"><progress max="'+p.goal+'" value="'+v.progress+'" aria-label="Mutirão concluído"></progress><b>'+v.progress+'/'+p.goal+'</b></div>'+
    '<p>'+p.help+'</p><button type="button" data-contract-action="'+p.action+'">⌖ Preparar ordem</button></div>';
  }else{
   el.innerHTML=heading+'<p class="contract-prompt">Escolha um objetivo curto para a equipe. Sem prazo nem tarefas automáticas.</p>'+
    '<div class="contract-choices">'+v.options.map(p=>'<button type="button" data-contract-choice="'+p.id+'" aria-label="Escolher mutirão '+p.title+'">'+
    '<span>'+p.icon+'</span><strong>'+p.title+'</strong><small>'+p.desc+'</small><em>+'+p.reward+' moral</em></button>').join("")+'</div>';
  }
 }
 return Object.freeze({PLANS,normalize,offers,select,record,current,view,render});
});
