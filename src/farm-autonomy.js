"use strict";
/* Rotina de cultivo: uma ordem inicial autoriza o manejo de um canteiro.
   O ensino só termina quando a primeira colheita chega ao estoque.
   Nunca cria terrenos/canteiros nem recursos: só agenda trabalhos reais. */
((root,factory)=>{
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.TillfolkFarmAutonomy=api;
})(typeof window!=="undefined"?window:null,()=>{
  const CROPS=["sow","water","harvest","carry"];
  function trained(state){
    return state?.colonyLife?.farmTrained===true ||
      Number(state?.tutorial?.stats?.carry)>0;
  }
  function learn(state){
    if(!state||!Array.isArray(state.plots))return false;
    state.colonyLife=state.colonyLife||{};
    const life=state.colonyLife;
    if(life.farmTrained)return false;
    life.farmTrained=true;
    if(life.autoFarmUserSet!==true)life.autoFarm=true;
    // O canteiro já preparado pelo jogador conta como autorização.
    // Um canteiro desligado explicitamente jamais é religado por migração.
    for(const p of state.plots)if(p&&(p.tilled||p.seeded||p.produce)&&p.farmManaged!==false)
      p.farmManaged=true;
    return life.autoFarm;
  }
  function chooseCrop(state,plot){
    const stock=state?.cropSeeds||{};
    if(plot?.crop&&Number(stock[plot.crop])>0)return plot.crop;
    if(state?.selectedCrop&&Number(stock[state.selectedCrop])>0)return state.selectedCrop;
    return Object.keys(stock).find(id=>Number(stock[id])>0)||null;
  }
  function next(state,plot){
    if(!state?.colonyLife?.autoFarm||!plot||plot.farmManaged!==true||
      !(plot.tilled||plot.seeded||plot.produce))return null;
    if(plot.produce)return {type:"carry"};
    if(plot.seeded){
      if(plot.growth>=1)return {type:"harvest"};
      if(!plot.watered)return {type:"water"};
      return null;
    }
    const crop=chooseCrop(state,plot);
    return crop?{type:"sow",crop}:null;
  }
  function shouldPauseOnCancel(order){
    return Boolean(order?.autoFarm===true&&CROPS.includes(order.type));
  }
  return Object.freeze({trained,learn,chooseCrop,next,shouldPauseOnCancel});
});
