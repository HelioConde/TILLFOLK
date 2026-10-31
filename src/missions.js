"use strict";
// Falas naturais, variadas e situacionais. O save guarda apenas progresso, não temporizadores de diálogo.
(() => {
  const STEPS=Object.freeze([
    {key:"workstation",goal:1,icon:"🛠️",title:"Nossa primeira Work Station",
      subtitle:"Junte 10 gravetos e construa a bancada",
      help:"Começamos SEM ferramentas. Limpe gravetos caídos e grama alta com a mão. Com 10 gravetos no estoque, abra Objetos → Work Station, escolha um lugar livre e espere a equipe montar a estação. Clique nela para fabricar ferramentas.",
      complete:"Agora temos uma bancada! É daqui que vão sair nossas ferramentas.",
      dialogue:{
        intro:["Antes de tudo, precisamos de um lugar pra fazer ferramentas. Olha quantos galhos caídos por aí!","A gente não tem nem machado ainda. Que tal juntar gravetos e montar nossa bancada?"],
        waiting:["Falta um bocado de graveto, mas dá pra juntar com as mãos.","Marca os gravetos espalhados. Depois a gente escolhe um cantinho pra bancada."],
        working:["Tô trazendo mais uns galhos! Essa bancada vai ficar boa.","Já dá pra imaginar nossas ferramentas aqui. Só falta terminar a montagem."]
      },tool:"construir",target:"workstation"},
    {key:"hoe",goal:1,icon:"🌱",title:"A primeira enxada",
  subtitle:"Fabrique uma enxada na Work Station",
  help:"Junte 4 gravetos e 2 fibras recolhendo capim. Clique na Work Station ou em Fabricar ferramentas e escolha Enxada. Assim a equipe poderá arar a primeira horta.",
  complete:"Com essa enxada, finalmente podemos começar a plantação!",
  dialogue:{
    intro:["Primeiro precisamos plantar. Bora fabricar uma enxada!","Antes do machado, vamos preparar uma horta pra ter o que comer."],
    waiting:["A bancada já está pronta. Faltam gravetos ou fibras pra enxada?","Separamos os materiais e fazemos a enxada. O resto vem depois!"],
    working:["Já imagino nosso primeiro canteiro aqui perto.","Uma enxada muda tudo: agora dá pra preparar a terra."]
  },tool:"construir",target:"hoe"},
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
    {key:"wateringCan",goal:1,icon:"💧",title:"Um regador para a horta",
  subtitle:"Fabrique um regador na Work Station",
  help:"Depois de semear, volte à Work Station e fabrique o regador com 4 gravetos e 2 fibras. Assim a equipe poderá buscar água e regar o canteiro.",
  complete:"Regador prontinho! Nossa plantinha já pode receber água.",
  dialogue:{
    intro:["A terra tá plantada, mas precisamos de um regador.","Agora a planta precisa beber água. Bora fazer um regador!"],
    waiting:["É só juntar 4 gravetos e 2 fibras para o regador.","A receita do regador está na bancada. Vamos conferir?"],
    working:["Tá quase! Depois disso a gente rega tudo.","Agora sim, vamos cuidar dessa mudinha!"]
  },tool:"construir",target:"wateringCan"},
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
    {key:"axe",goal:1,icon:"🪓",title:"Prepare a saída do vale",
      subtitle:"Fabrique um machado na Work Station",
      help:"Abra a Work Station depois de colher sua primeira plantação. Separe 8 gravetos e 3 fibras de grama, escolha Machado e espere o colono terminar a fabricação. Equipe quem for limpar o tronco da saída leste.",
      complete:"Finalmente um machado! Agora podemos cortar madeira de verdade.",
      dialogue:{
        intro:["Nossa primeira colheita já está guardada! Que tal preparar um machado pra abrir caminho?","Já temos comida! Agora a gente pode fabricar um machado e explorar além do vale."],
        waiting:["A receita do machado tá na bancada. Confere os gravetos e as fibras.","Se estiver faltando material, ainda tem mato pra limpar por aí."],
        working:["Pronto, vou separar os materiais. Cuidado com a lâmina!","Com o machado feito, nosso trabalho vai render muito mais."]
      },tool:"construir",target:"axe"},
    {key:"exit",goal:1,icon:"🪵",title:"Abra a passagem",subtitle:"Corte o tronco caído na saída leste",
      help:"Use Mostrar no mapa para encontrar o corredor a leste. Com um machado comum no inventário de um trabalhador, escolha Limpar e marque o tronco caído. Aguarde a equipe abrir a passagem.",
      complete:"Passagem aberta! Você concluiu o tutorial e pode explorar o vale!",
      dialogue:{
        intro:["Olha aquele tronco atravessado. Com o machado novo, já dá pra abrir caminho!","A montanha fecha o vale inteiro, mas tem uma passagem a leste. Vamos lá?"],
        waiting:["O tronco está bloqueando a saída. Marca ele pra gente cortar!","Vai ser bom conhecer o que existe do outro lado. Vamos abrir caminho?"],
        working:["Cuidado com as lascas! Mais um pouquinho e a passagem abre.","Já estou trabalhando nesse tronco. Dá até pra enxergar o outro lado!"]
      },tool:"clear",target:"exit"}
  ]);

  const artNames=Object.freeze({
    workstation:"Work Station",hoe:"Enxada",wateringCan:"Regador",shovel:"Pá",pickaxe:"Picareta",axe:"Machado",exit:"Tronco caído na passagem",
    grass:"Tufo de grama alta",seed:"Grama alta: pode soltar sementes",
    till:"Terra arada",sow:"Semente plantada",water:"Planta regada",
    harvest:"Plantação madura",carry:"Colheita",plan:"Cabana"
  });
  const atlasPaths={ground:"terrain/grass.png",forage:"environment/forageables.png",
    dirt:"terrain/tilled-dirt.png",crops:"farming/crops.png",
    roof:"structures/wood-roof.png",walls:"structures/wood-walls.png",door:"structures/wood-door.png",
    station:"structures/work-station.png",items:"items/tools-materials.png"};
  const atlas={};
  function atlasImage(id){
    if(typeof Image!=="function")return null;
    if(!atlas[id]){
      const image=new Image();atlas[id]=image;
      image.addEventListener("load",()=>{
        const canvas=typeof document!=="undefined"?document.querySelector("#mission-objective-sprite"):null;
        if(canvas?.dataset.key)paintTarget(canvas,canvas.dataset.key);
      });
      image.src=(id==="station"?window.TillfolkCrafting?.STATION_SPRITE:
        id==="items"?window.TillfolkCrafting?.ITEMS_SPRITE:null)||
        "./public/assets/sprout-lands/"+atlasPaths[id];
    }
    return atlas[id];
  }
  function stamp(ctx,id,sx,sy,sw,sh,x,y,w,h){
    const img=atlasImage(id);
    if(!img?.complete||!img.naturalWidth||sx+sw>img.naturalWidth||sy+sh>img.naturalHeight)return false;
    ctx.drawImage(img,sx,sy,sw,sh,Math.round(x),Math.round(y),Math.round(w),Math.round(h));
    return true;
  }
  function drawTarget(ctx,step,x=0,y=0,size=48){
    const key=typeof step==="string"?step:step?.key;
    if(!ctx||!artNames[key])return;
    ctx.save();ctx.imageSmoothingEnabled=false;
    ctx.fillStyle="#6d9853";ctx.fillRect(x,y,size,size);
    stamp(ctx,"ground",0,80,16,16,x,y,size,size);
    const soil=()=>stamp(ctx,"dirt",0,80,16,16,x+2,y+2,size-4,size-4);
    const crop=(sx,sy=0)=>stamp(ctx,"crops",sx,sy,16,16,x+size*.15,y+size*.09,size*.7,size*.77);
    if(key==="workstation"){
      const image=atlasImage("station");
      if(image?.complete&&image.naturalWidth)
        ctx.drawImage(image,0,0,image.naturalWidth,image.naturalHeight,x+size*.1,y+size*.1,size*.8,size*.8);
      else soil();
    }else if(["hoe","axe","shovel","pickaxe","wateringCan"].includes(key)){
      const frame=window.TillfolkCrafting?.itemFrame(key);
      if(frame){
        // A missão e a Work Station usam os MESMOS pixels da spritesheet premium.
        stamp(ctx,"items",frame.x,frame.y,frame.w,frame.h,
          x+size*.12,y+size*.12,size*.76,size*.76);
      }else{
        // Sem frame identificado no pack, manter apenas um ícone provisório.
        const icon={shovel:"🪏",pickaxe:"⛏️"}[key]||"❔";
        ctx.font=Math.round(size*.59)+"px system-ui,sans-serif";
        ctx.textAlign="center";ctx.textBaseline="middle";
        ctx.fillText(icon,x+size*.5,y+size*.52);
      }
    }else if(key==="grass"||key==="seed"){
      // O mesmo frame que o cenário usa em wild-world.js para grass.
      stamp(ctx,"forage",0,32,16,16,x+size*.1,y+size*.08,size*.8,size*.8);
      if(key==="seed"){
        ctx.fillStyle="#603b20";ctx.fillRect(x+size*.7,y+size*.71,size*.12,size*.12);
        ctx.fillStyle="#edcc78";ctx.fillRect(x+size*.73,y+size*.73,size*.07,size*.07);
      }
    }else if(key==="exit"){
      stamp(ctx,"forage",0,80,32,16,x+size*.02,y+size*.3,size*.96,size*.5);
    }else if(key==="till")soil();
    else if(key==="sow"){
      soil();ctx.fillStyle="#563925";ctx.fillRect(x+size*.39,y+size*.4,size*.23,size*.2);
      ctx.fillStyle="#d8bd78";ctx.fillRect(x+size*.46,y+size*.44,size*.1,size*.1);
    }else if(key==="water"){
      soil();crop(16);ctx.fillStyle="#9fddf0";
      ctx.fillRect(x+size*.73,y+size*.17,size*.08,size*.18);
    }else if(key==="harvest"){soil();crop(64);}
    else if(key==="carry"){soil();crop(48,16);}
    else if(key==="plan"){
      const roof=atlasImage("roof"),walls=atlasImage("walls"),door=atlasImage("door");
      if(window.TillfolkHouse?.draw&&[roof,walls,door].every(i=>i?.complete&&i.naturalWidth)){
        ctx.save();ctx.translate(x+size*.07,y+size*.08);ctx.scale(size/120,size/120);
        window.TillfolkHouse.draw(ctx,{roof,walls,door},0,-27,{scale:1});ctx.restore();
      }else soil();
    }
    ctx.restore();
  }
  function paintTarget(canvas,key){
    const ctx=canvas.getContext("2d");if(!ctx)return;
    canvas.dataset.key=key;canvas.setAttribute("aria-label","Sprite: "+artNames[key]);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    drawTarget(ctx,key,0,0,canvas.width);
  }
  function ensureTargetUI(){
    let canvas=document.querySelector("#mission-objective-sprite");
    if(canvas)return canvas;
    const title=document.querySelector("#mission-title"),goal=document.querySelector("#mission-goal");
    if(!title||!goal)return null;
    const row=document.createElement("div");
    row.className="mission-target-row";
    row.style.cssText="display:flex;align-items:center;gap:10px;margin:9px 0 10px;min-width:0";
    canvas=document.createElement("canvas");canvas.id="mission-objective-sprite";
    canvas.width=48;canvas.height=48;canvas.setAttribute("role","img");
    canvas.style.cssText="width:48px;height:48px;flex:0 0 48px;image-rendering:pixelated;border:2px solid #9fbd81;border-radius:7px;background:#486a42";
    const copy=document.createElement("div");copy.style.cssText="min-width:0;flex:1";
    const label=document.createElement("div");label.id="mission-objective-label";
    label.style.cssText="font:bold 10px system-ui;color:#c6e8a4;line-height:1.3";
    title.before(row);row.append(canvas,copy);copy.append(title,goal,label);
    title.style.marginTop="0";goal.style.marginBottom="3px";
    return canvas;
  }
  const emptyStats=()=>Object.fromEntries(STEPS.map(step=>[step.key,0]));
  function create(){return {active:true,step:0,stats:emptyStats(),finished:false,version:4};}
  function normalize(raw){
    if(!raw||typeof raw!=="object")return {active:false,step:0,stats:emptyStats(),finished:false,version:1};
    const stats=emptyStats();
    for(const key of Object.keys(stats))stats[key]=Math.max(0,Math.min(9999,Number(raw.stats?.[key])||0));
    const version=Number(raw.version)||1;
    let step=0;
    if(version>=4)step=Math.max(0,Math.min(STEPS.length,Math.floor(Number(raw.step)||0)));
    else if(raw.finished===true)step=STEPS.length;
    else {
      // Reorganizar a progressão sem obrigar novos jogadores a usar o machado antes da horta.
      // Preservar conquistas já registradas e retomar no primeiro objetivo pendente.
      const oldKeys=version>=3?
        ["workstation","axe","exit","grass","seed","till","sow","water","harvest","carry","plan"]:
        version===2?["workstation","axe","grass","seed","till","sow","water","harvest","carry","plan"]:
        ["grass","seed","till","sow","water","harvest","carry","plan"];
      for(const key of oldKeys.slice(0,Math.max(0,Number(raw.step)||0)))
        if(Object.hasOwn(stats,key))stats[key]=Math.max(1,stats[key]);
      if(stats.till||stats.sow)stats.hoe=1;
      if(stats.water)stats.wateringCan=1;
      while(step<STEPS.length&&stats[STEPS[step].key]>=STEPS[step].goal)step++;
    }
    return {active:raw.active===true,step,stats,finished:raw.finished===true||step>=STEPS.length,version:4};
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
      document.querySelector("#mission-title").textContent=step.title;
      document.querySelector("#mission-goal").textContent=step.subtitle;
      document.querySelector("#mission-help").textContent=step.help;
      document.querySelector("#mission-progress").max=step.goal;
      document.querySelector("#mission-progress").setAttribute("aria-label",step.subtitle);
    }
    const preview=ensureTargetUI();
    if(preview)paintTarget(preview,step.key);
    const label=document.querySelector("#mission-objective-label");
    if(label)label.textContent=step.key==="workstation"?
      "Gravetos: "+Math.min(10,state.inventory?.twigs||0)+" / 10 · depois monte a bancada":
      "Procure: "+artNames[step.key];
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
  window.TillfolkMissions=Object.freeze({STEPS,artNames,drawTarget,create,normalize,current,record,render,speech});
})();
