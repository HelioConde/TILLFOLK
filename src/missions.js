"use strict";
// Falas naturais, variadas e situacionais. O save guarda apenas progresso, não temporizadores de diálogo.
(() => {
  const STEPS=Object.freeze([
    {key:"grass",goal:1,icon:"🌾",title:"Um cantinho para chamar de nosso",subtitle:"Limpe um tufo de grama alta",
      help:"Na barra de ferramentas, abra Ordens → Limpar e clique em um tufo de grama alta. Universal também funciona sobre o tufo. A equipe vai até lá e limpa quando terminar o caminho.",
      complete:"Aí sim! Já temos um pedacinho de chão livre.",
      dialogue:{
        intro:["Nossa, olha esse matagal! Se abrirmos um espacinho, já dá pra pensar numa horta.","Eu gostei daqui! Só falta convencer esse mato a dividir o terreno com a gente."],
        waiting:["Tá vendo os tufos mais altos? Marca um pra gente tirar dali.","Começar pequeno tá ótimo. Escolhe um tufo e deixa o resto com a gente."],
        working:["Boa, já vi onde é! Vou abrir caminho por aqui.","Opa, serviço à vista! Pelo menos esse mato vai servir pra alguma coisa."]
      },tool:"clear",target:"grass"},
    {key:"seed",goal:1,icon:"🌱",title:"A primeira sementinha",subtitle:"Encontre uma semente ao cortar grama",
      help:"Continue usando Limpar nos tufos de grama alta. Cada tufo tem 25% de chance de render uma semente; se não vier de primeira, tente outro. Confira seu estoque no botão Estoque.",
      complete:"Olha só o que apareceu! Nossa primeira semente.",
      dialogue:{
        intro:["Ei, sabia que às vezes a gente encontra sementes escondidas no capim?","Imagina: dessa grama toda pode sair a primeira plantinha do vale!"],
        waiting:["Não achamos nenhuma ainda? Tudo bem, vamos tentar mais um tufo.","Parece brincadeira procurar semente no mato... mas dá certo, viu?"],
        working:["Vai que a sorte tá nesse montinho aqui. Tô de olho!","Se aparecer uma sementinha, guardo com todo cuidado. Prometo!"]
      },tool:"clear",target:"grass"},
    {key:"till",goal:1,icon:"⛏️",title:"Mãos na terra",subtitle:"Prepare um canteiro arando a terra",
      help:"Escolha um quadrado de solo livre, sem árvore, pedra ou grama alta. Clique nele com Universal para pedir Arar, ou selecione Ordens → Arar. Aguarde o trabalhador preparar o canteiro.",
      complete:"Terra fofinha! Agora sim dá pra plantar.",
      dialogue:{
        intro:["Sabe o que eu tô imaginando? Um canteirinho bem aqui, perto da gente.","Achamos a semente. Agora falta preparar um lugar bonito pra ela crescer."],
        waiting:["Aquele chão livre ali parece bom. Que tal arar primeiro?","Pode escolher onde vai ser a horta. Eu cuido da parte de cavar!"],
        working:["Eita, esse chão tá firme! Mas já já fica bom de plantar.","Dá trabalho preparar a terra, viu? Depois vale a pena."]
      },tool:"till",target:"till"},
    {key:"sow",goal:1,icon:"🌿",title:"Uma promessa verde",subtitle:"Plante uma semente no canteiro",
      help:"Com a semente no estoque, clique no canteiro arado usando Universal, ou Ordens → Semear. Aguarde a equipe terminar. Se não houver sementes, volte a limpar grama alta.",
      complete:"Pronto, tá plantada! Agora é cuidar direitinho.",
      dialogue:{
        intro:["Olha pra esse canteiro... daqui a pouco vai estar cheio de vida.","Quem diria que a nossa primeira plantação ia começar com uma sementinha do mato?"],
        waiting:["A terra já tá pronta. Vamos colocar aquela semente pra morar aqui?","Eu já consigo imaginar as folhas nascendo. Só falta plantar!"],
        working:["Prontinho, semente. Agora vê se cresce forte, tá?","Tô cobrindo com carinho. Essa vai ser especial!"]
      },tool:"sow",target:"sow"},
    {key:"water",goal:1,icon:"💧",title:"Um gole de esperança",subtitle:"Regue sua primeira plantação",
      help:"Selecione Universal sobre o canteiro semeado ou Ordens → Regar. Sem água no estoque, quem receber a ordem tentará buscá-la na lagoa e voltar para regar. É preciso ter caminho livre até a água.",
      complete:"Água na medida! Nossa plantinha agradece.",
      dialogue:{
        intro:["Agora a parte importante: ninguém cresce sem um pouquinho de água.","Eita, a gente plantou e já tá com sede! Vamos cuidar dessa mudinha."],
        waiting:["Se mandar regar, eu dou um jeito de buscar água na lagoa.","A semente tá quietinha no chão, mas precisa de água pra despertar."],
        working:["Lá vou eu buscar água. Essa plantinha vai ficar bem cuidada!","Pronto, devagarinho pra não encharcar. Assim tá bom!"]
      },tool:"water",target:"water"},
    {key:"harvest",goal:1,icon:"🥕",title:"O fruto da paciência",subtitle:"Espere amadurecer e faça a primeira colheita",
      help:"A cultura só cresce quando está semeada e regada. Espere amadurecer; use 3× ou 6× no topo para passar o tempo mais rápido. Depois clique no canteiro maduro com Universal ou Ordens → Colher.",
      complete:"Conseguimos! Nossa primeira colheita de verdade.",
      dialogue:{
        intro:["Agora vem a parte mais difícil pra mim: esperar sem ficar olhando toda hora!","A gente fez tudo direitinho. Agora é deixar a natureza trabalhar."],
        waiting:["Ainda tá verdinha? Calma, as coisas boas levam tempo.","Se estiver demorando, dá pra acelerar o tempo ali em cima. Eu também tô ansioso!"],
        working:["Olha esse tamanho! Pode chamar de nossa primeira colheita!","Não acredito que cresceu mesmo! Bora colher com cuidado."]
      },tool:"harvest",target:"harvest"},
    {key:"carry",goal:1,icon:"📦",title:"Comida na mesa",subtitle:"Guarde a colheita no estoque",
      help:"Depois de Colher, o alimento ainda está no canteiro. Clique nele com Universal ou Ordens → Transportar. Espere a equipe guardar a produção: o estoque ganha comida e uma semente.",
      complete:"Comida guardada! Hoje ninguém dorme de barriga vazia.",
      dialogue:{
        intro:["Que orgulho! Mas não adianta colher e deixar tudo largado no chão, né?","Olha o tanto de coisa boa! Melhor guardar antes que estrague."],
        waiting:["A colheita tá esperando ali no canteiro. Vamos levar pro estoque?","Eu levo se você quiser. É só marcar o que ficou pra trás."],
        working:["Deixa que eu carrego! Só não me faz tropeçar com tudo isso.","Essa comida vai render um jantar daqueles. Tô até com fome!"]
      },tool:"carry",target:"carry"},
    {key:"plan",goal:1,icon:"🏠",title:"O vale tem futuro",subtitle:"Planeje uma cabana ou um novo canteiro",
      help:"Abra Construir. Escolha Cabana · Equipe e marque uma área livre de 2×2, ou escolha Plantação · Canteiros para planejar mais cultivo. Azul indica uma posição válida; a construção exige trabalho e recursos. Clique direito cancela o plano.",
      complete:"Olha só... já parece o começo de uma vila!",
      dialogue:{
        intro:["Pensa só: um dia esse lugar pode virar uma vilazinha cheia de gente.","Começamos com um tufo de mato. Agora já dá até pra sonhar com uma casa!"],
        waiting:["Que tal desenhar onde vai ficar a próxima cabana ou mais uma horta?","Se a gente planejar direitinho, vai sobrar espaço pra todo mundo."],
        working:["Opa, já tô vendo o lugar! Um pouquinho por dia, a vila aparece.","Adoro ver um plano tomando forma. Esse vale tem futuro, viu?"]
      },tool:"construir",target:"plan"}
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
  // O motor escolhe a situação, a pessoa e a ordem das variações.
  // Não salvar a fala: a missão continua no mesmo ponto ao recarregar sem repetir um roteiro rígido.
  function speech(state,worker,mode="intro",variation=0){
    const step=current(state);
    if(!step)return "";
    const choices=step.dialogue[mode]||step.dialogue.intro;
    const index=Math.max(0,state.workers?.indexOf(worker)??0);
    return choices[((index+Math.max(0,Math.floor(variation)))%choices.length)];
  }
  window.TillfolkMissions=Object.freeze({STEPS,create,normalize,current,record,render,speech});
})();
