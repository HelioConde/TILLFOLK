"use strict";
/* Progressão de sobrevivência sem backend: estação, receitas e ferramentas compartilhadas. */
(()=>{
  const STATION_COST=30;
  const ASSET_ROOT="./public/assets/Sprout Lands - Sprites - premium pack/Sprout Lands - Sprites - premium pack/";
  const STATION_SPRITE=ASSET_ROOT+"Objects/work station.png";
  const ITEMS_SPRITE=ASSET_ROOT+"Objects/Items/tools and meterials.png";
  const RECIPES=Object.freeze([
    {key:"axe",name:"Machado",icon:"🪓",cost:{twigs:8,grass:3},help:"Derrubar árvores e retirar troncos."},
    {key:"stoneAxe",name:"Machado de pedra",icon:"🪓",cost:{twigs:8,grass:3,stone:3},help:"Remover o tronco caído que bloqueia a saída leste."},
    {key:"shovel",name:"Pá",icon:"🪏",cost:{twigs:8,grass:2},help:"Arrancar tocos e escavar terreno."},
    {key:"pickaxe",name:"Picareta",icon:"⛏️",cost:{twigs:10,wood:2},help:"Extrair pedras grandes."},
    {key:"hoe",name:"Enxada",icon:"🌱",cost:{twigs:8,wood:2},help:"Arar e preparar canteiros."},
    {key:"wateringCan",name:"Regador",icon:"💧",cost:{twigs:6,wood:2},help:"Irrigar as plantações."}
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
  function has(state,key){return state?.crafting?.equipment?.[key]===true;}
  function missing(state,cost){
    return Object.entries(cost).filter(([key,need])=>(Number(state?.inventory?.[key])||0)<need);
  }
  function canBuild(state){return !state?.crafting?.station&&missing(state,{twigs:STATION_COST}).length===0;}
  function recipe(key){return RECIPES.find(item=>item.key===key)||null;}
  function craft(state,key){
    const item=recipe(key);
    if(!item)return {error:"Receita desconhecida."};
    if(!state?.crafting?.station)return {error:"Construa e acesse uma Work Station primeiro."};
    if(has(state,key))return {error:item.name+" já foi fabricado."};
    const unavailable=missing(state,item.cost);
    if(unavailable.length)return {error:"Faltam materiais para "+item.name.toLowerCase()+"."};
    for(const [resource,amount] of Object.entries(item.cost))state.inventory[resource]-=amount;
    state.crafting.equipment[key]=true;
    return {item};
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
  function blocked(state,type,object){
    if(type==="clear"&&object?.kind==="ridge")return "Encosta fechada: procure a passagem com o tronco caído.";
    const tool=requiredTool(type,object);
    const name=recipe(tool)?.name||"Ferramenta";
    return tool&&!has(state,tool)?"Precisa de "+name.toLowerCase()+" na Work Station":null;
  }
  function formatCost(cost){
    const labels={twigs:"gravetos",grass:"fibras",wood:"madeiras",stone:"pedras"};
    return Object.entries(cost).map(([key,n])=>n+" "+(labels[key]||key)).join(" · ");
  }
  window.TillfolkCrafting=Object.freeze({
    STATION_COST,STATION_SPRITE,ITEMS_SPRITE,RECIPES,
    normalize,has,missing,canBuild,recipe,craft,requiredTool,blocked,formatCost
  });
})();
