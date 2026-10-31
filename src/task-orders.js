"use strict";
/* Um colono pode escolher uma ordem existente, mas nunca criar novas ordens.
   A lista pertence ao jogador e é salva em state.orders. Sem backend. */
(() => {
  const TYPES=Object.freeze(["clear","till","fertilize","sow","water","harvest","carry","collectWater","collectManure","buildHome"]);
  const LABELS=Object.freeze({clear:"Limpar",till:"Arar",fertilize:"Fertilizar",sow:"Semear",water:"Regar",harvest:"Colher",carry:"Transportar",collectWater:"Buscar água",collectManure:"Recolher esterco",buildHome:"Construir casa"});
  const ICONS=Object.freeze({clear:"🪓",till:"⛏",fertilize:"🌿",sow:"🌱",water:"💧",harvest:"🥕",carry:"📦",collectWater:"🪣",collectManure:"🐄",buildHome:"🏠"});
  let worldWidth=28,worldHeight=18;
  function setBounds(width,height){
    if(Number.isInteger(width)&&Number.isInteger(height)&&width>=28&&height>=18){
      worldWidth=width;worldHeight=height;
    }
  }
  const validCell=(x,y)=>Number.isInteger(x)&&Number.isInteger(y)&&x>=1&&x<worldWidth-1&&y>=1&&y<worldHeight-1;
  const id=(type,x,y)=>x+"-"+y+":"+type;
  function normalize(raw) {
    if(!Array.isArray(raw))return [];
    const result=[],seen=new Set();
    for(const order of raw){
      if(!order||!TYPES.includes(order.type)||!validCell(order.x,order.y))continue;
      const key=id(order.type,order.x,order.y);
      if(seen.has(key))continue;
      seen.add(key);result.push({id:key,type:order.type,x:order.x,y:order.y});
      if(result.length>=1500)break;
    }
    return result;
  }
  /* Uma etapa pode ser enfileirada antes de seus pré-requisitos: fica aguardando.
     "Aguardando" não inicia trabalhos adicionais por conta própria. */
  function baseStatus(order,plot,object,resources){
    // Ordens de coleta da lagoa não precisam de terreno cultivável.
    if(order.type==="collectWater")
      return resources?.world?.water?.some(w=>w.x===order.x&&w.y===order.y)
        ?{state:"ready",reason:"Buscar água na margem da lagoa"}
        :{state:"blocked",reason:"Escolha um ponto da lagoa"};
    if(order.type==="collectManure"){
      if(!resources?.animals?.length)
        return {state:"blocked",reason:"Não há animais na fase inicial"};
      const animal=resources.animals.find(a=>Math.floor(a.x)===order.x&&Math.floor(a.y)===order.y);
      return animal?.manure>0?{state:"ready",reason:"Esterco disponível"}
        :{state:"blocked",reason:"Aguardando esterco do animal"};
    }
    if(order.type==="buildHome"){
      const already=resources?.homes?.some(h=>h.x===order.x&&h.y===order.y);
      if(already)return {state:"done",reason:"Casa já concluída"};
      return (resources?.inventory?.wood||0)>=8?{state:"ready",reason:"Madeira suficiente para construir"}
        :{state:"blocked",reason:"Aguardando 8 madeiras"};
    }
    if(!plot)return {state:"blocked",reason:"Terreno indisponível"};
    const biome=window.TillfolkWild?.terrainAt?.(resources?.world,order.x,order.y);
    if(biome&&!biome.farmable&&["till","fertilize","sow","water","harvest","carry"].includes(order.type))
      return {state:"blocked",reason:"O terreno "+biome.name.toLowerCase()+" não permite cultivo"};
    const seeds=Number(resources?.seeds)||0,water=Number(resources?.water)||0;
    const dirty=!!(object||plot.dirty);
    switch(order.type){
      case "clear": return dirty?{state:"ready",reason:"Pronta"}:{state:"done",reason:"Terreno já limpo"};
      case "till":
        if(plot.tilled)return {state:"done",reason:"Solo já arado"};
        return dirty?{state:"blocked",reason:"Aguardando ordem de limpeza"}:{state:"ready",reason:"Pronta"};
      case "fertilize":
        if(plot.fertilized)return {state:"done",reason:"Solo já fertilizado"};
        if(plot.seeded)return {state:"done",reason:"Planta já semeada"};
        if(dirty)return {state:"blocked",reason:"Aguardando limpeza"};
        if(!plot.tilled)return {state:"blocked",reason:"Aguardando arar o solo"};
        const stock=Number(resources?.inventory?.manure)||0;
        const animalReady=resources?.animals?.some(a=>a.manure>0);
        return stock>0?{state:"ready",reason:"Esterco no depósito"}:
          animalReady?{state:"ready",reason:"Buscar esterco no animal"}:
          {state:"blocked",reason:resources?.animals?.length?
            "Aguardando o animal produzir esterco":"Sem animais nem esterco na fase inicial"};
      case "sow":
        if(plot.seeded)return {state:"done",reason:"Já semeado"};
        if(plot.produce)return {state:"blocked",reason:"Retire a colheita anterior"};
        if(dirty)return {state:"blocked",reason:"Aguardando limpeza"};
        if(!plot.tilled)return {state:"blocked",reason:"Aguardando arar o solo"};
        return seeds>0?{state:"ready",reason:"Pronta"}:{state:"blocked",reason:"Sem sementes"};
      case "water":
        if(plot.watered&&plot.seeded)return {state:"done",reason:"Já irrigado"};
        if(!plot.seeded)return {state:"blocked",reason:"Aguardando semeadura"};
        return water>0?{state:"ready",reason:"Água disponível"}:
          resources?.world?.water?.length?{state:"ready",reason:"Buscar água na lagoa"}:
          {state:"blocked",reason:"Sem fonte de água"};
      case "harvest":
        if(plot.produce)return {state:"done",reason:"Colheita já no chão"};
        if(!plot.seeded)return {state:"blocked",reason:"Aguardando plantio"};
        return plot.growth>=1?{state:"ready",reason:"Pronta"}:{state:"blocked",reason:"Aguardando amadurecer"};
      case "carry":
        return plot.produce?{state:"ready",reason:"Pronta"}:{state:"blocked",reason:"Aguardando colheita"};
      default: return {state:"blocked",reason:"Ordem desconhecida"};
    }
  }
  function status(order,plot,object,resources){
    const result=baseStatus(order,plot,object,resources);
    // Ferramentas bloqueiam só ordens prontas; preserva estado "concluída"
    // e as mensagens de falta de sementes, madeira e outros pré-requisitos.
    if(result.state!=="ready")return result;
    const blocker=window.TillfolkPrologue?.toolBlocker(resources,order.type,object);
    return blocker?{state:"blocked",reason:blocker}:result;
  }
  function add(orders,type,x,y,plot,object,resources){
    if(!TYPES.includes(type)||!validCell(x,y)||(!plot&&!["collectWater","collectManure"].includes(type)))return {error:"Escolha um terreno válido."};
    const key=id(type,x,y);
    if(orders.some(o=>o.id===key))return {error:"Esta ordem já está na lista."};
    if(orders.length>=1500)return {error:"Fila cheia. Cancele algumas ordens."};
    const check=status({type},plot,object,resources);
    if(check.state==="done")return {error:check.reason+"."};
    return {order:{id:key,type,x,y},state:check.state,reason:check.reason};
  }
  window.TillfolkOrders=Object.freeze({TYPES,LABELS,ICONS,id,normalize,status,add,setBounds});
})();
