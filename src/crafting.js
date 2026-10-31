"use strict";
/* Progressão de sobrevivência sem backend: estação, receitas e ferramentas compartilhadas. */
(()=>{
  const STATION_COST=10;
  const ASSET_ROOT="./public/assets/Sprout Lands - Sprites - premium pack/Sprout Lands - Sprites - premium pack/";
  const STATION_SPRITE=ASSET_ROOT+"Objects/work station.png";
  const ITEMS_SPRITE=ASSET_ROOT+"Objects/Items/tools and meterials.png";
  // Recortes verificados do atlas premium Objects/Items/tools and meterials.png (64×48).
  // Cada frame mede 16×16, sem interpolação ou recriação manual da arte.
  // Pá e picareta não possuem correspondência inequívoca nessa spritesheet;
  // nesses dois casos o menu usa ícone provisório, sem fingir que é um sprite do pack.
  const ITEM_FRAMES=Object.freeze({
    wateringCan:Object.freeze({x:0,y:0,w:16,h:16}),
    axe:Object.freeze({x:16,y:0,w:16,h:16}),
    stoneAxe:Object.freeze({x:32,y:0,w:16,h:16}),
    hoe:Object.freeze({x:0,y:16,w:16,h:16})
  });
  const itemFrame=key=>ITEM_FRAMES[key]||null;
  const RECIPES=Object.freeze([
    {key:"axe",name:"Machado",icon:"🪓",cost:{twigs:8,grass:3},help:"Derrubar árvores e retirar troncos."},
    {key:"stoneAxe",name:"Machado de pedra",icon:"🪓",cost:{twigs:8,grass:3,stone:3},help:"Remover o tronco caído que bloqueia a saída leste."},
    {key:"shovel",name:"Pá",icon:"🪏",cost:{twigs:8,grass:2},help:"Arrancar tocos e escavar terreno."},
    {key:"pickaxe",name:"Picareta",icon:"⛏️",cost:{twigs:10,wood:2},help:"Extrair pedras grandes."},
    {key:"hoe",name:"Enxada",icon:"🌱",cost:{twigs:4,grass:2},help:"Arar e preparar canteiros."},
    {key:"wateringCan",name:"Regador",icon:"💧",cost:{twigs:4,grass:2},help:"Irrigar as plantações."}
  ]);
  const equipped=Object.freeze({axe:false,stoneAxe:false,shovel:false,pickaxe:false,hoe:false,wateringCan:false});
  function normalize(raw,legacy=false){
    // Saves anteriores tinham acesso irrestrito a ferramentas: preservar seu progresso.
    const equipment={...equipped};
    for(const key of Object.keys(equipment))equipment[key]=legacy||raw?.equipment?.[key]===true;
    const station=raw?.station&&Number.isInteger(raw.station.x)&&Number.isInteger(raw.station.y)
      ?{x:raw.station.x,y:raw.station.y}:null;
    return {version:1,station,equipment};
  }
  // Ferramentas equipadas pertencem ao trabalhador. A flag global serve somente
  // como espelho de compatibilidade dos saves antigos, não concede ferramenta.
  function normalizeWorker(worker,legacyEquipment=null){
    if(!worker.inventory||typeof worker.inventory!=="object")
      worker.inventory={tools:{},items:{}};
    worker.inventory.tools=worker.inventory.tools||{};
    worker.inventory.items=worker.inventory.items||{};
    for(const key of Object.keys(equipped)){
      const hadOwn=Object.hasOwn(worker.inventory.tools,key);
      worker.inventory.tools[key]=hadOwn?Boolean(worker.inventory.tools[key]):Boolean(legacyEquipment?.[key]);
    }
    return worker.inventory;
  }
  function has(state,key,worker=null){
    if(worker)return Boolean(worker.inventory?.tools?.[key]);
    if(Array.isArray(state?.workers)&&state.workers.length)
      return state.workers.some(w=>Boolean(w.inventory?.tools?.[key]));
    return state?.crafting?.equipment?.[key]===true;
  }
  function missing(state,cost){
    return Object.entries(cost).filter(([key,need])=>(Number(state?.inventory?.[key])||0)<need);
  }
  function canBuild(state){return !state?.crafting?.station&&missing(state,{twigs:STATION_COST}).length===0;}
  function recipe(key){return RECIPES.find(item=>item.key===key)||null;}
  function locked(state,key){
    if(["axe","stoneAxe"].includes(key)&&state?.tutorial?.active===true&&
       !state?.firstHarvest&&!(state.tutorial.stats?.harvest>0))
      return "Colha sua primeira plantação antes de fabricar machados.";
    return null;
  }
  function craft(state,key,worker=null){
    const item=recipe(key);
    if(!item)return {error:"Receita desconhecida."};
    if(!state?.crafting?.station)return {error:"Construa e acesse uma Work Station primeiro."};
    if(has(state,key,worker))return {error:item.name+" já foi fabricado"+(worker?" para este colono":"")+"."};
    const unavailableStage=locked(state,key);if(unavailableStage)return {error:unavailableStage};
    const unavailable=missing(state,item.cost);
    if(unavailable.length)return {error:"Faltam materiais para "+item.name.toLowerCase()+"."};
    for(const [resource,amount] of Object.entries(item.cost))state.inventory[resource]-=amount;
    state.crafting.equipment[key]=true;
    if(worker)normalizeWorker(worker).tools[key]=true;
    return {item,workerId:worker?.id??null};
  }
  function requiredTool(type,object){
    if(type==="till")return "hoe";
    if(type==="water")return "wateringCan";
    if(type==="clear"){
      switch(object?.kind){
        case "gateLog":return "stoneAxe";
        case "tree":case "log":case "thicket":return "axe";
        case "stump":return "shovel";
        case "boulder":return "pickaxe";
        default:return null; // gravetos, grama, flores e pequenos objetos: coleta manual
      }
    }
    return null;
  }
  function blocked(state,type,object,worker=null){
    if(type==="clear"&&object?.kind==="ridge")return "Encosta fechada: procure a passagem com o tronco caído.";
    const tool=requiredTool(type,object);
    const name=recipe(tool)?.name||"Ferramenta";
    return tool&&!has(state,tool,worker)?"Precisa de "+name.toLowerCase()+" no inventário do colono":null;
  }
  function formatCost(cost){
    const labels={twigs:"gravetos",grass:"fibras",wood:"madeiras",stone:"pedras"};
    return Object.entries(cost).map(([key,n])=>n+" "+(labels[key]||key)).join(" · ");
  }
  window.TillfolkCrafting=Object.freeze({
    STATION_COST,STATION_SPRITE,ITEMS_SPRITE,ITEM_FRAMES,itemFrame,RECIPES,
    normalize,normalizeWorker,has,missing,canBuild,recipe,craft,locked,requiredTool,blocked,formatCost
  });
})();
