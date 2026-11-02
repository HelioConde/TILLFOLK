"use strict";
/* Conselho do Vale: escolha opcional de consumo de alimentos, nunca automática.
   Sem timers, aleatoriedade adicional, rede ou recursos produzidos do nada. */
((root,factory)=>{
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.TillfolkCouncil=api;
})(typeof window!=="undefined"?window:null,()=>{
 const positive=(n,max=999999)=>Number.isFinite(Number(n))?Math.max(0,Math.min(max,Math.floor(Number(n)))):0;
 const eligible=s=>Boolean(s&&!s.gameOver&&s.workers?.length&&
   (!s.tutorial?.active||s.tutorial.finished));
 const OPTIONS=Object.freeze([
  {id:"ceia",title:"🍲 Ceia compartilhada",description:"Uma refeição em grupo melhora a moral.",perWorker:2,morale:12,energy:3},
  {id:"lanche",title:"🥖 Lanche de trabalho",description:"Um lanche reforçado ajuda a enfrentar as tarefas.",perWorker:1,morale:4,energy:12},
  {id:"guardar",title:"📦 Guardar mantimentos",description:"Preserve o estoque para os dias difíceis.",perWorker:0,morale:0,energy:0}
 ]);
 function normalize(s){
  if(!s||typeof s!=="object")return null;
  const old=s.council&&typeof s.council==="object"?s.council:{};
  const day=Math.max(1,positive(s.day)||1);
  const next=positive(old.nextDay);
  s.council={version:1,nextDay:next|| (eligible(s)?day+1:0),
   meetings:positive(old.meetings),lastChoice:OPTIONS.some(o=>o.id===old.lastChoice)?old.lastChoice:null,
   lastDay:positive(old.lastDay)};
  return s.council;
 }
 function status(s){
  const data=normalize(s);
  if(!data||!eligible(s))return {mode:"hidden"};
  const day=Math.max(1,positive(s.day)||1),next=data.nextDay||day+1;
  const crew=s.workers.length,food=positive(s.food),reserve=crew;
  const options=OPTIONS.map(o=>({...o,cost:o.perWorker*crew,
   enabled:o.id==="guardar"||food>=o.perWorker*crew+reserve}));
  return {mode:day>=next?"ready":"waiting",nextDay:next,day,
   tomorrow:day+1,food,reserve,crew,options,meetings:data.meetings,
   lastChoice:data.lastChoice};
 }
 function decide(s,id){
  const view=status(s);
  if(view.mode!=="ready")return {ok:false,reason:"O próximo conselho ainda não começou."};
  const option=view.options.find(o=>o.id===id);
  if(!option)return {ok:false,reason:"Escolha inválida."};
  if(!option.enabled)return {ok:false,reason:"Comida insuficiente: preserve pelo menos uma refeição por colono."};
  const data=s.council;
  const cost=option.cost;
  // Conferir novamente o estoque: a refeição nunca pode consumir a reserva.
  if(positive(s.food)<cost+view.reserve&&cost>0)
   return {ok:false,reason:"O estoque mudou e não permite essa escolha."};
  if(cost>0){
   const ledger=typeof window!=="undefined"?window.TillfolkFoodLedger:null;
   if(ledger){if(!ledger.spend(s,cost))return {ok:false,reason:"Estoque insuficiente."};}
   else s.food=Math.max(0,Number(s.food||0)-cost);
  }
  if(cost>0)for(const w of s.workers){
   w.energy=Math.min(100,Math.max(0,(Number.isFinite(w.energy)?w.energy:75)+option.energy));
   w.morale=Math.min(100,Math.max(0,(Number.isFinite(w.morale)?w.morale:75)+option.morale));
  }
  data.meetings++;
  data.lastChoice=id;
  data.lastDay=view.day;
  data.nextDay=view.day+3;
  return {ok:true,option,cost,nextDay:data.nextDay};
 }
 function forecast(s,life){
  const tomorrow=Math.max(1,positive(s?.day)+1);
  if(!life?.weather||!life?.weatherLabels)return "Consulte o clima no painel da colônia.";
  const next=life.weather(tomorrow,s.world?.seed||1);
  const copy={chuva:"A chuva ajudará a regar a horta.",
   seca:"O calor pode atrasar o crescimento dos cultivos.",
   frio:"O frio pode reduzir o ritmo da lavoura.",
   limpo:"O céu deve ficar tranquilo para trabalhar."};
  return (life.weatherLabels[next]||"Tempo variável")+" amanhã · "+(copy[next]||"Prepare a equipe.");
 }
 function render(s,notice,panel,life,playing=true){
  const view=playing?status(s):{mode:"hidden"};
  if(notice){
   notice.hidden=view.mode!=="ready";
   if(view.mode==="ready"){
    const message="🗣️ Conselho do Vale disponível · dia "+view.day;
    if(notice.textContent!==message)notice.textContent=message;
   }
  }
  if(!panel)return;
  if(view.mode==="hidden"){panel.hidden=true;return;}
  panel.hidden=false;
  const weather=forecast(s,life);
  const key=JSON.stringify([view,weather]);
  if(panel.dataset.councilView===key)return;
  panel.dataset.councilView=key;
  const heading='<h3>🗣️ Conselho do Vale</h3><p class="council-forecast">🔎 '+weather+'</p>';
  if(view.mode==="waiting"){
   const previous=view.lastChoice?OPTIONS.find(o=>o.id===view.lastChoice)?.title:"";
   panel.innerHTML=heading+'<p>Próximo conselho: <strong>dia '+view.nextDay+
    '</strong>. '+view.meetings+' encontro(s) realizados. '+(previous?'Última decisão: '+previous+'.':'')+
    '</p><small>As decisões são opcionais e nunca interrompem seu trabalho.</small>';
   return;
  }
  panel.innerHTML=heading+
   '<p>Como cuidar da equipe hoje? Existem <strong>'+view.food+
   ' alimentos</strong> no estoque. Guarde pelo menos '+view.reserve+
   ' para os colonos.</p><div class="council-options">'+view.options.map(o=>
   '<button type="button" data-council-choice="'+o.id+'" '+(!o.enabled?'disabled ':'')+
    'aria-label="'+o.title+'"><strong>'+o.title+'</strong>'+
    '<span>'+o.description+'</span><small>'+(o.cost?'Custo: '+o.cost+' alimentos · Moral +'+o.morale+
      ' · Energia +'+o.energy:'Nenhum custo · Nenhum bônus')+
    (!o.enabled?' · Estoque insuficiente':'')+'</small></button>').join("")+'</div>';
 }
 return Object.freeze({OPTIONS,normalize,status,decide,forecast,render});
});
