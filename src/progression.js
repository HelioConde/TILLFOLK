"use strict";
/* Jornada da colônia: progressão baseada no mundo de verdade, sem cliques
 * artificiais, moeda, servidor ou tarefas automáticas obrigatórias. */
((root,factory)=>{
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.TillfolkProgression=api;
})(typeof window!=="undefined"?window:null,()=>{
  const BIOMES=Object.freeze({
    f:{name:"Bosque",icon:"🌲"},s:{name:"Deserto",icon:"🏜️"},
    i:{name:"Terras geladas",icon:"❄️"},w:{name:"Pântano",icon:"🐸"},
    p:{name:"Cogumelos tóxicos",icon:"🍄"}
  });
  const OBJECTIVES=Object.freeze([
    {id:"station",chapter:0,title:"Montar a Work Station",hint:"Junte 10 gravetos, abra Objetos e construa uma oficina.",reward:1},
    {id:"hoe",chapter:0,title:"Fabricar uma enxada",hint:"Produza uma enxada na oficina para um colono.",reward:1},
    {id:"firstHarvest",chapter:0,title:"Realizar a primeira colheita",hint:"Arar, semear, regar e colher com ordens individuais.",reward:2},
    {id:"home1",chapter:1,title:"Construir a primeira moradia",hint:"Entregue madeira para uma cabana e proteja seus colonos.",reward:2},
    {id:"chest",chapter:1,title:"Construir um baú",hint:"Guarde os recursos que estão espalhados pelo chão.",reward:2},
    {id:"research1",chapter:1,title:"Pesquisar agricultura eficiente",hint:"Use os pontos de conhecimento na Vida da colônia.",reward:1},
    {id:"food12",chapter:1,title:"Armazenar 12 alimentos",hint:"Amplie a produção; a meta não conta a comida inicial.",reward:1},
    {id:"research2",chapter:2,title:"Pesquisar conservação",hint:"Tenha uma colheita e uma casa para avançar à pesquisa 2.",reward:1},
    {id:"well",chapter:2,title:"Construir um poço",hint:"Após conservação, construa um poço com materiais entregues.",reward:2},
    {id:"homes2",chapter:2,title:"Abrigar os dois colonos iniciais",hint:"Construa pelo menos duas moradias.",reward:2},
    {id:"gear",chapter:3,title:"Preparar proteção para expedição",hint:"Fabrique luvas, roupa de frio, máscara ou outra proteção.",reward:2},
    {id:"explore1",chapter:3,title:"Visitar o primeiro continente",hint:"Equipe o colono e crie uma ordem além do rio.",reward:2},
    {id:"population3",chapter:3,title:"Recrutar um terceiro colono",hint:"Garanta comida para aumentar a equipe.",reward:2},
    {id:"explore3",chapter:4,title:"Explorar três continentes",hint:"Planeje expedições com as proteções específicas.",reward:3},
    {id:"research3",chapter:4,title:"Pesquisar rotina de descanso",hint:"Visite um continente e construa um poço.",reward:2},
    {id:"research4",chapter:4,title:"Pesquisar transporte avançado",hint:"Explore três continentes e organize ao menos três colonos.",reward:3},
    {id:"exploreAll",chapter:4,title:"Conhecer os cinco continentes",hint:"Visite bosque, deserto, gelo, pântano e cogumelos.",reward:5},
    {id:"rocketPad",chapter:5,title:"Fundar a plataforma espacial",hint:"Construa uma pista 3×3 segura na ilha; recursos são transportados até a obra.",reward:3},
    {id:"rocketHull",chapter:5,title:"Montar casco e cabine",hint:"Planeje a segunda etapa, entregando madeira, pedra e fibra.",reward:3},
    {id:"rocketEngine",chapter:5,title:"Construir o motor",hint:"Recolha minerais, cogumelos e ervas para equipar a propulsão.",reward:4},
    {id:"rocketSupport",chapter:5,title:"Instalar suporte de vida",hint:"Complete filtros e estrutura da nave; prepare alimento e água.",reward:4},
    {id:"rocketCrew",chapter:5,title:"Preparar a equipe de evacuação",hint:"Quatro colonos com moradia, saúde e alimentação para embarcar.",reward:4},
    {id:"rocketLaunch",chapter:5,title:"Lançar o foguete",hint:"Com 30 alimentos e 20 águas estocados, inicie o lançamento pelo programa espacial.",reward:6}
  ]);
  const CHAPTERS=Object.freeze([
    {title:"O primeiro abrigo",icon:"🌱",description:"Sobreviver, cultivar e fabricar as primeiras ferramentas.",unlock:"Conhecimento inicial + acesso a toda a oficina."},
    {title:"Uma fazenda de verdade",icon:"🏡",description:"Criar estrutura, preservar recursos e manter comida guardada.",unlock:"Base para pesquisar conservação e construir o poço."},
    {title:"Colônia organizada",icon:"💧",description:"Garantir água e descanso antes de sair da ilha central.",unlock:"Estrutura para expedições duradouras."},
    {title:"Além dos rios",icon:"🧭",description:"Preparar proteção e enviar colonos aos novos continentes.",unlock:"Descobertas dão conhecimento para pesquisas avançadas."},
    {title:"Domínio dos continentes",icon:"🌍",description:"Explorar os cinco biomas e dominar as tecnologias.",unlock:"Projeto espacial desbloqueado: reunir materiais e preparar a partida."},
    {title:"Última esperança: abandonar o planeta",icon:"🚀",description:"Construir, abastecer e lançar uma nave para escapar do mundo superpovoado.",unlock:"Vitória narrativa: a tripulação deixa o planeta, e a colônia pode continuar livre."}
  ]);
  const count=(array)=>Array.isArray(array)?array.length:0;
  function normalize(state){
    if(!state||typeof state!=="object")return null;
    const saved=state.progression&&typeof state.progression==="object"?state.progression:{};
    const existing=saved.achievements&&typeof saved.achievements==="object"?saved.achievements:{};
    const explored=saved.discovered&&typeof saved.discovered==="object"?saved.discovered:{};
    // Não apagar conquistas das versões anteriores, mesmo se a interface mudar.
    state.progression={version:1,
      achievements:Object.fromEntries(Object.entries(existing).filter(([key,v])=>
        OBJECTIVES.some(o=>o.id===key)&&Number.isFinite(v)&&v>=1)),
      discovered:Object.fromEntries(Object.entries(explored).filter(([key,v])=>
        Boolean(BIOMES[key])&&v&&typeof v==="object")),
      rewards:Math.max(0,Number(saved.rewards)||0),
      chapters:Object.fromEntries(Object.entries(saved.chapters||{}).filter(([k,v])=>
        Number(k)>=0&&Number(k)<CHAPTERS.length&&Number.isFinite(v)))};
    return state.progression;
  }
  function discoveredCount(state){
    return Object.keys(state?.progression?.discovered||{}).filter(id=>BIOMES[id]).length;
  }
  function protectedWorkerCount(state){
    const gear=Object.keys(globalGear());
    return (state?.workers||[]).filter(w=>gear.some(key=>w.inventory?.tools?.[key])).length;
  }
  function globalGear(){
    return {forestGloves:true,desertCloak:true,winterCoat:true,
      swampBoots:true,filterMask:true};
  }
  function read(state,id){
    const research=Number(state?.colonyLife?.researchLevel)||0;
    const discovered=discoveredCount(state);
    switch(id){
      case "station":return Boolean(state?.crafting?.station||count(state?.workstations));
      case "hoe":return (state?.workers||[]).some(w=>w.inventory?.tools?.hoe===true)||
        state?.crafting?.equipment?.hoe===true;
      case "firstHarvest":return Boolean(state?.firstHarvest||
        (state?.tutorial?.stats?.harvest||0)>0);
      case "home1":return count(state?.homes)>=1;
      case "chest":return count(state?.chests)>=1;
      case "research1":return research>=1;
      case "food12":return Boolean(state?.firstHarvest)&&(Number(state?.food)||0)>=12;
      case "research2":return research>=2;
      case "well":return count(state?.wells)>=1;
      case "homes2":return count(state?.homes)>=2;
      case "gear":return protectedWorkerCount(state)>=1;
      case "explore1":return discovered>=1;
      case "population3":return count(state?.workers)>=3;
      case "explore3":return discovered>=3;
      case "research3":return research>=3;
      case "research4":return research>=4;
      case "exploreAll":return discovered>=5;
      case "rocketPad":return (state?.rocket?.stage||0)>=1;
      case "rocketHull":return (state?.rocket?.stage||0)>=2;
      case "rocketEngine":return (state?.rocket?.stage||0)>=3;
      case "rocketSupport":return (state?.rocket?.stage||0)>=4;
      case "rocketCrew":return Boolean(state?.rocket?.launched)||
        (state?.workers||[]).filter(w=>(w.health??100)>=50&&
          (w.satiety??100)>=35&&(state?.homes||[]).some(h=>h.residentId===w.id)).length>=4;
      case "rocketLaunch":return state?.rocket?.launched===true;
      default:return false;
    }
  }
  function researchLock(state,nextLevel){
    if(nextLevel===2){
      if(!state?.firstHarvest)return "Para pesquisar conservação, conclua uma colheita.";
      if(count(state?.homes)<1)return "Para pesquisar conservação, construa uma cabana.";
    }
    if(nextLevel===3){
      if(count(state?.wells)<1)return "Para pesquisar descanso, construa primeiro um poço.";
      if(discoveredCount(state)<1)return "Para pesquisar descanso, explore um continente protegido.";
    }
    if(nextLevel===4){
      if(discoveredCount(state)<3)return "Para pesquisar transporte, explore três continentes.";
      if(count(state?.workers)<3)return "Para pesquisar transporte, recrute um terceiro colono.";
    }
    return null;
  }
  function status(state){
    const saved=state?.progression||{};
    const chapters=CHAPTERS.map((chapter,index)=>{
      const objectiveList=OBJECTIVES.filter(o=>o.chapter===index).map(o=>
        ({...o,done:Boolean(saved.achievements?.[o.id])}));
      const done=objectiveList.filter(o=>o.done).length;
      return {...chapter,index,objectives:objectiveList,done,total:objectiveList.length,
        complete:done===objectiveList.length};
    });
    const current=chapters.find(c=>!c.complete)||chapters[chapters.length-1];
    return {current,chapters,allDone:chapters.every(c=>c.complete),
      total:Object.keys(saved.achievements||{}).length,maximum:OBJECTIVES.length,
      discovered:discoveredCount(state)};
  }
  function advance(state,options={}){
    const saved=normalize(state),backfill=options.backfill===true;
    if(!saved)return [];
    const events=[];
    const biomeMap=state?.world?.biomeMap||"",width=state?.world?.width||0;
    if(width>0){
      for(const worker of state.workers||[]){
        const x=Math.floor(worker.x),y=Math.floor(worker.y);
        if(x<0||y<0||x>=width||y>=state.world.height)continue;
        const biome=biomeMap[y*width+x];
        if(!BIOMES[biome]||saved.discovered[biome])continue;
        // Não contar água ou ponte; só terra firme alcançada de verdade.
        if(state.world.water?.some(tile=>tile.x===x&&tile.y===y))continue;
        saved.discovered[biome]={day:Math.max(1,state.day||1),
          colonist:typeof worker.name==="string"?worker.name:"Explorador"};
        const bonus=3;
        if(!backfill){
          events.push({type:"discovery",name:BIOMES[biome].name,
            text:BIOMES[biome].icon+" "+worker.name+" explorou "+BIOMES[biome].name+
              ": +"+bonus+" conhecimento.",points:bonus});
        }
      }
    }
    for(const objective of OBJECTIVES){
      if(saved.achievements[objective.id]||!read(state,objective.id))continue;
      saved.achievements[objective.id]=Math.max(1,Number(state.day)||1);
      if(!backfill)events.push({type:"objective",id:objective.id,chapter:objective.chapter,
        text:"✓ "+objective.title+" · +"+objective.reward+" conhecimento.",
        points:objective.reward});
    }
    for(let i=0;i<CHAPTERS.length;i++){
      if(saved.chapters[i])continue;
      if(!OBJECTIVES.filter(o=>o.chapter===i).every(o=>saved.achievements[o.id]))continue;
      saved.chapters[i]=Math.max(1,Number(state.day)||1);
      if(!backfill)events.push({type:"chapter",chapter:i,
        text:"✦ Capítulo concluído: "+CHAPTERS[i].title+" · +4 conhecimento.",
        points:4});
    }
    let earned=0;
    if(!backfill){
      earned=events.reduce((sum,e)=>sum+(e.points||0),0);
      saved.rewards+=earned;
      if(earned&&state.colonyLife)state.colonyLife.researchPoints=
        Math.min(999,Math.max(0,Number(state.colonyLife.researchPoints)||0)+earned);
    }
    return events;
  }
  return Object.freeze({BIOMES,OBJECTIVES,CHAPTERS,normalize,advance,
    read,status,researchLock,discoveredCount,protectedWorkerCount});
});
