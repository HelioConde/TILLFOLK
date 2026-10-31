"use strict";
/* Prólogo finito de sobrevivência. Nenhuma missão cria ordens automaticamente.
   Contadores registram ações CONCLUÍDAS, inclusive se foram antecipadas. */
(() => {
  const VERSION=1;
  const RECIPES=Object.freeze({
    axe:{label:"Machado de pedra",icon:"🪓",cost:{twigs:2,stone:2},help:"Corta árvores, troncos e arbustos lenhosos."},
    pickaxe:{label:"Picareta de pedra",icon:"⛏️",cost:{twigs:2,stone:2},help:"Extrai pedras de rochas grandes."},
    hoe:{label:"Enxada",icon:"🌱",cost:{twigs:2,stone:1},help:"Prepara o solo para plantar."},
    shovel:{label:"Pá",icon:"🛠️",cost:{twigs:2,stone:1},help:"Prepara a fundação de novas casas."},
    bucket:{label:"Balde rústico",icon:"🪣",cost:{wood:2,stone:1},help:"Permite buscar água na lagoa e regar."}
  });
  const METRICS=["twig","pebble","grass","seed","wood","till","sow","water","harvest","carry","buildHome","collectWater"];
  const CHAPTERS=Object.freeze([
    {icon:"🌿",title:"O vale começa nas suas mãos",short:"Recolha gravetos e pedras soltas.",detail:"Sua equipe chegou sem ferramentas. Escolha Universal ou Ordens → Limpar e marque gravetos e pedrinhas próximos da clareira. Essas coletas são feitas com as mãos. Espere o trabalhador terminar a ordem.",goals:[["twig",3,"Gravetos"],["pebble",2,"Pedras soltas"]]},
    {icon:"🪓",title:"Uma oficina improvisada",short:"Fabrique um machado e uma picareta.",detail:"Abra Oficina, use seus gravetos e pedras para fabricar um machado de pedra e uma picareta. São ferramentas compartilhadas pela equipe: não precisam ser compradas para cada personagem.",goals:[["tool:axe",1,"Machado"],["tool:pickaxe",1,"Picareta"]]},
    {icon:"🌾",title:"O segredo da grama alta",short:"Limpe 3 tufos de grama e encontre 1 semente.",detail:"Cada tufo de grama alta cortado tem 25% de chance de soltar uma semente. Não é garantido a cada tentativa: marque mais tufos se necessário. Ao colher sementes, elas entram no estoque, mas os trabalhadores só plantam mediante sua ordem.",goals:[["grass",3,"Tufos limpos"],["seed",1,"Sementes encontradas"]]},
    {icon:"🛠️",title:"Ferramentas para cultivar",short:"Crie uma enxada e uma pá.",detail:"Use Oficina para fabricar uma enxada para arar o solo e uma pá para abrir fundações. Pedras grandes exigem picareta; árvores exigem machado. Gravetos e pedras soltas continuam coletáveis à mão.",goals:[["tool:hoe",1,"Enxada"],["tool:shovel",1,"Pá"]]},
    {icon:"🪵",title:"Madeira para o futuro",short:"Conquiste 8 madeiras na floresta.",detail:"Marque Limpar em árvores e troncos. O machado é necessário; uma árvore pode deixar um toco, e o trabalhador continua até removê-lo. A madeira também servirá para ferramentas e cabanas.",goals:[["wood",8,"Madeiras coletadas"]]},
    {icon:"⛏️",title:"O primeiro canteiro",short:"Are um terreno cultivável.",detail:"Clique em solo de pradaria com Universal ou Ordens → Arar. A enxada é obrigatória. Arar não planta nem rega automaticamente: você comanda cada etapa da agricultura.",goals:[["till",1,"Terrenos arados"]]},
    {icon:"🌱",title:"O começo da plantação",short:"Plante uma semente na terra arada.",detail:"Selecione o canteiro arado e dê a ordem Semear. A semente veio dos tufos de grama; sem semente disponível, a ordem pode aguardar até que você encontre outra.",goals:[["sow",1,"Canteiros semeados"]]},
    {icon:"💧",title:"Da lagoa ao canteiro",short:"Fabrique um balde e regue uma planta.",detail:"O balde rústico usa madeira e pedra. Dê a ordem Regar numa plantação. Se não houver água no estoque, um trabalhador apto irá até a lagoa e voltará com água, sem criar uma nova ordem agrícola.",goals:[["tool:bucket",1,"Balde"],["water",1,"Planta regada"]]},
    {icon:"🥕",title:"A primeira colheita",short:"Colha e guarde os alimentos.",detail:"Uma cultura semeada e regada cresce com o tempo. Quando amadurecer, marque Colher; depois, dê a ordem Transportar para levá-la ao estoque. A plantação não avança de etapa sozinha.",goals:[["harvest",1,"Colheitas feitas"],["carry",1,"Colheitas guardadas"]]},
    {icon:"🏠",title:"Um lar para recomeçar",short:"Construa sua primeira cabana.",detail:"Escolha Ordens → Construir casa num terreno 2×2 livre. A equipe precisa de madeira e da pá. Mais tarde, para contratar o terceiro ajudante, serão necessárias três casas: duas para quem já mora aqui e uma vaga livre.",goals:[["buildHome",1,"Cabanas concluídas"]]}
  ]);
  const initial=()=>({version:VERSION,stage:0,done:false,stats:Object.fromEntries(METRICS.map(k=>[k,0]))});
  const saneCount=n=>Number.isFinite(n)?Math.max(0,Math.min(1000000,Math.floor(n))):0;
  function normalize(state){
    if(!state.inventory)state.inventory={};
    state.inventory.twigs=saneCount(state.inventory.twigs);
    state.inventory.stone=saneCount(state.inventory.stone);
    if(!state.tools||typeof state.tools!=="object")state.tools={};
    for(const id of Object.keys(RECIPES))state.tools[id]=Math.max(0,Math.min(50,saneCount(state.tools[id])));
    if(!state.prologue||typeof state.prologue!=="object")state.prologue=initial();
    const p=state.prologue;
    p.stats=p.stats&&typeof p.stats==="object"?p.stats:{};
    for(const k of METRICS)p.stats[k]=saneCount(p.stats[k]);
    p.stage=Math.max(0,Math.min(CHAPTERS.length,saneCount(p.stage)));
    p.version=VERSION;p.done=p.stage>=CHAPTERS.length;
    advance(state);
    return p;
  }
  function measure(state,key){
    if(key.startsWith("tool:"))return saneCount(state.tools[key.slice(5)]);
    return state.prologue.stats[key]||0;
  }
  function advance(state){
    const p=state.prologue;
    while(p.stage<CHAPTERS.length&&CHAPTERS[p.stage].goals.every(([k,n])=>measure(state,k)>=n))p.stage++;
    p.done=p.stage>=CHAPTERS.length;
  }
  function event(state,type,quantity=1){
    normalize(state);
    if(!METRICS.includes(type)||!Number.isFinite(quantity)||quantity<=0)return false;
    const previous=state.prologue.stage;
    state.prologue.stats[type]+=Math.floor(quantity);
    advance(state);
    return previous!==state.prologue.stage;
  }
  function toolForOrder(type,object){
    if(type==="clear"){
      const kind=object?.kind;
      if(["tree","stump","log","thicket"].includes(kind))return ["axe"];
      if(kind==="boulder")return ["pickaxe"];
      return [];
    }
    if(type==="till")return ["hoe"];
    if(type==="buildHome")return ["shovel","axe"];
    if(type==="collectWater"||type==="water")return ["bucket"];
    return [];
  }
  function toolBlocker(state,type,object){
    const missing=toolForOrder(type,object).find(id=>!state?.tools?.[id]);
    return missing?"Falta "+RECIPES[missing].label.toLowerCase()+". Abra a Oficina.":null;
  }
  function craft(state,id){
    normalize(state);
    const recipe=RECIPES[id];
    if(!recipe)return {ok:false,message:"Ferramenta desconhecida."};
    if(state.tools[id])return {ok:false,message:"Esta ferramenta já foi fabricada."};
    for(const [resource,amount] of Object.entries(recipe.cost)){
      if((state.inventory[resource]||0)<amount)
        return {ok:false,message:"Faltam "+(amount-(state.inventory[resource]||0))+
          " "+({twigs:"gravetos",stone:"pedras",wood:"madeiras"}[resource]||resource)+"."};
    }
    for(const [resource,amount] of Object.entries(recipe.cost))state.inventory[resource]-=amount;
    state.tools[id]=1;
    advance(state);
    return {ok:true,message:recipe.label+" fabricado(a)! Agora sua equipe pode utilizá-lo(a)."};
  }
  function snapshot(state){
    normalize(state);
    const p=state.prologue,mission=CHAPTERS[p.stage]||null;
    return {stage:p.stage,total:CHAPTERS.length,done:p.done,mission,
      progress:mission?mission.goals.map(([k,max,label])=>({key:k,max,label,value:Math.min(max,measure(state,k))})):[]};
  }
  window.TillfolkPrologue=Object.freeze({VERSION,RECIPES,CHAPTERS,initial,normalize,event,craft,snapshot,toolForOrder,toolBlocker});
})();
