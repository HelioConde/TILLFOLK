"use strict";
// Missões narrativas: estado integrado ao save local, sem backend ou tarefas automáticas.
(() => {
  const STEPS=Object.freeze([
    {key:"grass",goal:1,icon:"🌾",title:"O vale está vivo",subtitle:"Colete 1 tufo de grama alta",
      help:"Ache um tufo de grama alta no mapa. Escolha Ordens → Limpar (ou Universal sobre a grama) e clique no terreno. Espere um colono terminar o serviço; arrastar também funciona.",
      speech:["Esse mato todo pode virar recurso! Me manda limpar um tufo de grama.","A gente só trabalha depois de receber uma ordem. Clique na grama!"],tool:"clear",target:"grass"},
    {key:"seed",goal:1,icon:"🌱",title:"Uma surpresa entre as folhas",subtitle:"Encontre 1 semente na grama",
      help:"Cada tufo de grama alta limpo tem 25% de chance de soltar uma semente. Não achou na primeira tentativa? Marque outros tufos com Limpar. Veja as sementes em Estoque.",
      speech:["Achei fibras! Mas a gente precisa de uma semente para plantar.","Nem toda grama solta semente. Vamos tentar mais um tufo!"],tool:"clear",target:"grass"},
    {key:"till",goal:1,icon:"⛏️",title:"A terra precisa respirar",subtitle:"Are 1 canteiro em solo livre",
      help:"Selecione Universal e clique em um quadrado de grama baixa, sem objetos: a primeira ordem será Arar. Ou abra Ordens → Arar. Espere o trabalhador terminar; a ordem fica visível no mapa.",
      speech:["Terra dura não segura plantação. Primeiro a gente ara!","Escolha um canto sem árvore ou pedra para preparar o canteiro."],tool:"till",target:"till"},
    {key:"sow",goal:1,icon:"🌿",title:"O primeiro plantio",subtitle:"Semeie 1 canteiro arado",
      help:"Clique com Universal sobre a terra já arada: a próxima ordem será Semear. Também vale Ordens → Semear. É preciso ter pelo menos 1 semente no estoque; o trabalho leva algum tempo.",
      speech:["Terra pronta e semente guardada: agora vai nascer comida!","Clica no canteiro arado. A equipe cuida do plantio."],tool:"sow",target:"sow"},
    {key:"water",goal:1,icon:"💧",title:"Água para o amanhã",subtitle:"Regue 1 plantação",
      help:"Clique com Universal sobre o canteiro plantado, ou use Ordens → Regar. Se faltar água no estoque, o trabalhador buscará água na lagoa antes de regar, desde que o caminho esteja livre.",
      speech:["Planta também sente sede! Pode mandar regar esse canteiro?","Se o balde estiver vazio, eu vou até a lagoa buscar água."],tool:"water",target:"water"},
    {key:"harvest",goal:1,icon:"🥕",title:"Paciência que vira alimento",subtitle:"Colha 1 cultura madura",
      help:"Espere a cultura amadurecer: o crescimento exige tempo de jogo e solo regado. Você pode acelerar em 3× ou 6× na barra superior. Quando estiver madura, escolha Colher ou use Universal no canteiro.",
      speech:["Agora é dar tempo ao tempo. Crescer não é instantâneo!","Quando a plantação amadurecer, manda colher. Pode acelerar o relógio."],tool:"harvest",target:"harvest"},
    {key:"carry",goal:1,icon:"📦",title:"Nada fica para trás",subtitle:"Transporte 1 colheita ao depósito",
      help:"Colher deixa a produção no chão. Emita outra ordem: Universal sobre o canteiro colhido ou Ordens → Transportar. Quando a equipe terminar, o alimento entra no estoque e rende uma semente.",
      speech:["A comida está colhida, mas ainda precisa chegar ao depósito!","Só depois de transportar é que a colheita vira alimento guardado."],tool:"carry",target:"carry"},
    {key:"plan",goal:1,icon:"🏠",title:"Um futuro para a colônia",subtitle:"Planeje 1 blueprint de construção",
      help:"Abra Construir → Cabana · Equipe e clique numa área livre de 2×2. A prévia azul mostra onde é possível construir; a equipe assume a ordem. Também vale planejar um canteiro em Construir → Plantação. Clique direito cancela blueprints.",
      speech:["Nossa primeira colheita merece uma casa nova por perto!","No modo Construir, a marca azul é só o plano. A equipe executa a obra."],tool:"construir",target:"plan"}
  ]);
  const emptyStats=()=>Object.fromEntries(STEPS.map(step=>[step.key,0]));
  function create(){return {active:true,step:0,stats:emptyStats(),finished:false,version:1};}
  function normalize(raw){
    if(!raw||typeof raw!=="object")return {active:false,step:0,stats:emptyStats(),finished:false,version:1};
    const stats=emptyStats();
    for(const key of Object.keys(stats))stats[key]=Math.max(0,Math.min(9999,Number(raw.stats?.[key])||0));
    const step=Math.max(0,Math.min(STEPS.length,Math.floor(Number(raw.step)||0)));
    return {active:raw.active===true,step,stats,finished:raw.finished===true||step>=STEPS.length,version:1};
  }
  function current(state){
    const progress=state?.tutorial;
    return progress?.active&&!progress.finished?STEPS[progress.step]||null:null;
  }
  function record(state,key,quantity=1){
    const progress=state?.tutorial;
    if(!progress?.active||progress.finished||!Object.hasOwn(progress.stats,key))return {advanced:false,finished:false};
    progress.stats[key]=Math.max(0,Math.min(9999,progress.stats[key]+quantity));
    const previous=progress.step;
    while(progress.step<STEPS.length&&progress.stats[STEPS[progress.step].key]>=STEPS[progress.step].goal)
      progress.step++;
    if(progress.step>=STEPS.length)progress.finished=true;
    return {advanced:previous!==progress.step,finished:previous!==progress.step&&progress.finished,
      step:progress.step};
  }
  function render(state){
    const card=document.querySelector("#mission-card");
    if(!card)return;
    const step=current(state);
    card.hidden=!step;
    if(!step)return;
    const progress=state.tutorial,shown=Number(card.dataset.missionStep);
    if(shown!==progress.step){
      card.dataset.missionStep=String(progress.step);
      card.classList.remove("expanded");
      const detailBtn=document.querySelector("#mission-details-toggle");
      detailBtn.setAttribute("aria-expanded","false");
      document.querySelector("#mission-chapter").textContent="MISSÃO "+(progress.step+1)+" / "+STEPS.length;
      document.querySelector("#mission-title").textContent=step.icon+" "+step.title;
      document.querySelector("#mission-goal").textContent=step.subtitle;
      document.querySelector("#mission-help").textContent=step.help;
      document.querySelector("#mission-progress").max=step.goal;
      document.querySelector("#mission-progress").setAttribute("aria-label",step.subtitle);
    }
    const currentCount=Math.min(step.goal,progress.stats[step.key]);
    document.querySelector("#mission-progress").value=currentCount;
    document.querySelector("#mission-count").textContent=currentCount+" / "+step.goal;
  }
  function speech(state,worker){
    const step=current(state);
    if(!step)return "";
    const index=state.workers?.indexOf(worker)??0;
    return step.speech[Math.abs(index)%step.speech.length];
  }
  window.TillfolkMissions=Object.freeze({STEPS,create,normalize,current,record,render,speech});
})();
