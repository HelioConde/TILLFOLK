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
    // Este é o recorte que antes estava incorretamente marcado "Machado de pedra".
    // A arte mostra uma enxada e deve ser reutilizada na carta Enxada.
    hoe:Object.freeze({x:32,y:0,w:16,h:16})
  });
  const itemFrame=key=>ITEM_FRAMES[key]||null;
  const RECIPES=Object.freeze([
    {key:"axe",name:"Machado de pedra",icon:"🪓",cost:{twigs:4,gravel:2},help:"Primeira ferramenta: gravetos e pedrinhas. Derruba árvores."},
    {key:"shovel",name:"Pá de pedra",icon:"🪏",cost:{twigs:4,gravel:2},help:"Tira tocos e prepara solo."},
    {key:"pickaxe",name:"Picareta de pedra",icon:"⛏️",cost:{twigs:5,gravel:4},help:"Extrai pedra grande e bronze do bosque."},
    {key:"hoe",name:"Enxada",icon:"🌱",cost:{twigs:3,gravel:1},help:"Arar e preparar canteiros."},
    {key:"wateringCan",name:"Regador",icon:"💧",cost:{twigs:3,gravel:2,grass:1},help:"Irrigar as plantações."},
    {key:"bronzePickaxe",name:"Picareta de bronze",icon:"⛏️",cost:{twigs:5,bronze:7,gravel:2},help:"Minera ferro no deserto."},
    {key:"ironPickaxe",name:"Picareta de ferro",icon:"⛏️",cost:{twigs:5,iron:9,bronze:3},help:"Minera ouro e diamante nos continentes avançados."},
    {key:"diamondPickaxe",name:"Picareta de diamante",icon:"⛏️",cost:{twigs:5,iron:8,diamond:6},help:"Extrai bauxita resistente no último continente."},
    {key:"aluminumAlloy",type:"material",name:"Fundir liga de alumínio",icon:"🔩",cost:{bauxite:3,iron:1},output:{kind:"aluminumAlloy",qty:2},help:"Refina bauxita e reforço de ferro para construir o foguete."},
    {key:"goldCircuit",type:"material",name:"Circuito de ouro",icon:"🔌",cost:{gold:3,bronze:1},output:{kind:"goldCircuit",qty:1},help:"Circuitos de alta condutividade para o motor e a nave."},
    ...Object.entries(window.TillfolkExploration?.GEAR||{}).map(([key,gear])=>
      Object.freeze({key,name:gear.name,icon:gear.icon,cost:gear.cost,help:gear.help}))
  ]);
  const equipped=Object.freeze(Object.fromEntries(RECIPES.filter(item=>item.type!=="material").map(({key})=>[key,false])));
  function normalize(raw,legacy=false){
    // Saves anteriores tinham acesso irrestrito a ferramentas: preservar seu progresso.
    const equipment={...equipped};
    for(const key of Object.keys(equipment))
      equipment[key]=legacy||raw?.equipment?.[key]===true||
        (key==="axe"&&raw?.equipment?.stoneAxe===true);
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
      worker.inventory.tools[key]=hadOwn?Boolean(worker.inventory.tools[key]):
        Boolean(legacyEquipment?.[key]);
      // Saves da versão anterior não perdem o machado já fabricado.
      if(key==="axe"&&(worker.inventory.tools.stoneAxe||legacyEquipment?.stoneAxe))
        worker.inventory.tools.axe=true;
    }
    delete worker.inventory.tools.stoneAxe;
    return worker.inventory;
  }
  function has(state,key,worker=null){
    if(worker)return Boolean(worker.inventory?.tools?.[key]);
    if(Array.isArray(state?.workers)&&state.workers.length)
      return state.workers.some(w=>Boolean(w.inventory?.tools?.[key]));
    return state?.crafting?.equipment?.[key]===true;
  }
  function missing(state,cost){
    // Bancada aceita matérias-primas espalhadas no solo ou guardadas nos baús;
    // a retirada real só ocorre quando o colono faz a entrega física.
    return Object.entries(cost).filter(([key,need])=>
      (window.TillfolkLogistics?.available(state,key)??Number(state?.inventory?.[key])??0)<need);
  }
  function canBuild(state){return !state?.crafting?.station&&(window.TillfolkLogistics?.available(state,"twigs")??state?.inventory?.twigs??0)>=STATION_COST;}
  function recipe(key){return RECIPES.find(item=>item.key===key)||null;}
  function locked(state,key){
    if(key==="aluminumAlloy"&&(state?.colonyLife?.researchLevel||0)<4)
      return "Para fundir liga de alumínio, conclua as quatro pesquisas.";
    if(key==="goldCircuit"&&(state?.colonyLife?.researchLevel||0)<3)
      return "Pesquise rotina de descanso para estudar circuitos condutores.";
    return null;
  }
  function craft(state,key,worker=null,prepaid=false){
    const item=recipe(key);
    if(!item)return {error:"Receita desconhecida."};
    if(!state?.crafting?.station)return {error:"Construa e acesse uma Work Station primeiro."};
    if(item.type!=="material"&&has(state,key,worker))
      return {error:item.name+" já foi fabricado"+(worker?" para este colono":"")+"."};
    const unavailableStage=locked(state,key);if(unavailableStage)return {error:unavailableStage};
    if(!prepaid){
      const unavailable=missing(state,item.cost);
      if(unavailable.length)return {error:"Faltam materiais para "+item.name.toLowerCase()+"."};
      for(const [resource,amount] of Object.entries(item.cost))state.inventory[resource]-=amount;
    }
    if(item.type==="material")return {item,material:{...item.output},workerId:worker?.id??null};
    state.crafting.equipment[key]=true;
    if(worker)normalizeWorker(worker).tools[key]=true;
    return {item,workerId:worker?.id??null};
  }
  function requiredTool(type,object){
    if(type==="till")return "hoe";
    if(type==="water")return "wateringCan";
    if(type==="clear"){
      switch(object?.kind){
        case "tree":case "log":case "thicket":return "axe";
        case "stump":return "shovel";
        case "boulder":return "pickaxe";
        default:return null; // gravetos, grama, flores e pequenos objetos: coleta manual
      }
    }
    return null;
  }
  function blocked(state,type,object,worker=null){
    if(type==="clear"&&object?.kind==="boulder"&&window.TillfolkMinerals)
      return window.TillfolkMinerals.missingTool(state,object,worker);
    const tool=requiredTool(type,object);
    const name=recipe(tool)?.name||"Ferramenta";
    return tool&&!has(state,tool,worker)?"Precisa de "+name.toLowerCase()+" no inventário do colono":null;
  }
  function formatCost(cost){
    const labels={twigs:"gravetos",grass:"fibras",wood:"madeiras",stone:"pedras",
      gravel:"cascalhos",bronze:"bronzes",iron:"ferros",gold:"ouros",diamond:"diamantes",
      bauxite:"bauxitas",aluminumAlloy:"ligas de alumínio",goldCircuit:"circuitos",
      mushroom:"cogumelos",herbs:"ervas"};
    return Object.entries(cost).map(([key,n])=>n+" "+(labels[key]||key)).join(" · ");
  }
  window.TillfolkCrafting=Object.freeze({
    STATION_COST,STATION_SPRITE,ITEMS_SPRITE,ITEM_FRAMES,itemFrame,RECIPES,
    normalize,normalizeWorker,has,missing,canBuild,recipe,craft,locked,requiredTool,blocked,formatCost
  });
})();
