"use strict";
/* TILLFOLK — contabilidade física de comida.
 * cropProduce mantém o histórico (estatísticas); foodLedger.stock contém
 * SOMENTE alimentos realmente disponíveis para extrair sementes.
 * Os saves antigos não conhecem a origem da comida: todo o saldo é genérico.
 * Não inventar tipos de alimentos a partir de contadores históricos.
 */
((root,factory)=>{
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.TillfolkFoodLedger=api;
})(typeof window!=="undefined"?window:null,()=>{
  const whole=value=>Number.isFinite(Number(value))?Math.max(0,Math.min(1000000000,Math.floor(Number(value)))):0;
  const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
  const ids=()=>typeof window!=="undefined"&&window.TillfolkCrops?.ALL?
    window.TillfolkCrops.ALL.map(c=>c.id):null;
  function normalize(state){
    if(!state||typeof state!=="object")return null;
    state.food=whole(state.food);
    const old=state.foodLedger;
    if(!old||old.version!==1||!old.stock||typeof old.stock!=="object"||Array.isArray(old.stock)){
      state.foodLedger={version:1,stock:{},generic:state.food};
      return state.foodLedger;
    }
    const allowed=ids();
    const stock={};let total=0;
    for(const id of Object.keys(old.stock).sort()){
      if(allowed&&!allowed.includes(id))continue;
      const available=Math.min(whole(old.stock[id]),Math.max(0,state.food-total));
      if(available>0){stock[id]=available;total+=available;}
    }
    // A comida sem espécie identificada é mantida e nunca pode ser convertida
    // em sementes de uma cultura arbitrária.
    old.version=1;old.stock=stock;old.generic=state.food-total;
    state.foodLedger=old;
    return old;
  }
  function available(state,id){
    const data=normalize(state);
    return data&&typeof id==="string"&&own(data.stock,id)?data.stock[id]:0;
  }
  function add(state,id,amount){
    const count=whole(amount);
    if(!count||typeof id!=="string"||!id)return false;
    const known=ids();
    if(known&&!known.includes(id))return false;
    const data=normalize(state);if(!data)return false;
    const next=state.food+count;
    if(next>1000000000)return false;
    state.food=next;data.stock[id]=(data.stock[id]||0)+count;
    return true;
  }
  function spend(state,amount,preferred=null){
    const count=whole(amount),data=normalize(state);
    if(!data)return false;
    if(!count)return true;
    if(state.food<count)return false;
    if(preferred!==null&&(!own(data.stock,preferred)||data.stock[preferred]<count))
      return false;
    if(preferred!==null){
      data.stock[preferred]-=count;
      if(!data.stock[preferred])delete data.stock[preferred];
    }else{
      // Primeiro consumir alimentos legados sem procedência.
      let remaining=count;
      const fromGeneric=Math.min(data.generic,remaining);
      data.generic-=fromGeneric;remaining-=fromGeneric;
      for(const id of Object.keys(data.stock).sort()){
        if(!remaining)break;
        const take=Math.min(remaining,data.stock[id]);
        data.stock[id]-=take;remaining-=take;
        if(!data.stock[id])delete data.stock[id];
      }
      if(remaining)return false;
    }
    state.food-=count;
    return true;
  }
  return Object.freeze({normalize,available,add,spend});
});
