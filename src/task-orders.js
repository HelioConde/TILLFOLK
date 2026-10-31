"use strict";
/* Um colono pode escolher uma ordem existente, mas nunca criar novas ordens.
   A lista pertence ao jogador e é salva em state.orders. Sem backend. */
(() => {
  const TYPES=Object.freeze(["clear","till","fertilize","sow","water","harvest","carry"]);
  const LABELS=Object.freeze({clear:"Limpar",till:"Arar",fertilize:"Fertilizar",sow:"Semear",water:"Regar",harvest:"Colher",carry:"Transportar"});
  const ICONS=Object.freeze({clear:"🪓",till:"⛏",fertilize:"🌿",sow:"🌱",water:"💧",harvest:"🥕",carry:"📦"});
  const validCell=(x,y)=>Number.isInteger(x)&&Number.isInteger(y)&&x>=1&&x<27&&y>=1&&y<17;
  const id=(type,x,y)=>x+"-"+y+":"+type;
  function normalize(raw) {
    if(!Array.isArray(raw))return [];
    const result=[],seen=new Set();
    for(const order of raw){
      if(!order||!TYPES.includes(order.type)||!validCell(order.x,order.y))continue;
      const key=id(order.type,order.x,order.y);
      if(seen.has(key))continue;
      seen.add(key);result.push({id:key,type:order.type,x:order.x,y:order.y});
      if(result.length>=450)break;
    }
    return result;
  }
  /* Uma etapa pode ser enfileirada antes de seus pré-requisitos: fica aguardando.
     "Aguardando" não inicia trabalhos adicionais por conta própria. */
  function status(order,plot,object,resources){
    if(!plot)return {state:"blocked",reason:"Terreno indisponível"};
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
        return plot.tilled?{state:"ready",reason:"Pronta"}:{state:"blocked",reason:"Aguardando arar o solo"};
      case "sow":
        if(plot.seeded)return {state:"done",reason:"Já semeado"};
        if(plot.produce)return {state:"blocked",reason:"Retire a colheita anterior"};
        if(dirty)return {state:"blocked",reason:"Aguardando limpeza"};
        if(!plot.tilled)return {state:"blocked",reason:"Aguardando arar o solo"};
        return seeds>0?{state:"ready",reason:"Pronta"}:{state:"blocked",reason:"Sem sementes"};
      case "water":
        if(plot.watered&&plot.seeded)return {state:"done",reason:"Já irrigado"};
        if(!plot.seeded)return {state:"blocked",reason:"Aguardando semeadura"};
        return water>0?{state:"ready",reason:"Pronta"}:{state:"blocked",reason:"Sem água"};
      case "harvest":
        if(plot.produce)return {state:"done",reason:"Colheita já no chão"};
        if(!plot.seeded)return {state:"blocked",reason:"Aguardando plantio"};
        return plot.growth>=1?{state:"ready",reason:"Pronta"}:{state:"blocked",reason:"Aguardando amadurecer"};
      case "carry":
        return plot.produce?{state:"ready",reason:"Pronta"}:{state:"blocked",reason:"Aguardando colheita"};
      default: return {state:"blocked",reason:"Ordem desconhecida"};
    }
  }
  function add(orders,type,x,y,plot,object,resources){
    if(!TYPES.includes(type)||!validCell(x,y)||!plot)return {error:"Escolha um terreno válido."};
    const key=id(type,x,y);
    if(orders.some(o=>o.id===key))return {error:"Esta ordem já está na lista."};
    if(orders.length>=450)return {error:"Fila cheia. Cancele algumas ordens."};
    const check=status({type},plot,object,resources);
    if(check.state==="done")return {error:check.reason+"."};
    return {order:{id:key,type,x,y},state:check.state,reason:check.reason};
  }
  window.TillfolkOrders=Object.freeze({TYPES,LABELS,ICONS,id,normalize,status,add});
})();
