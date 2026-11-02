"use strict";
/* Lote de regas é uma ação EXPLÍCITA do jogador, jamais automação.
   Usa a mesma validação das ordens individuais. Não produz água,
   não movimenta o colono e não altera a simulação. */
((root,factory)=>{
 const api=factory(root);
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.TillfolkIrrigationOrders=api;
})(typeof window!=="undefined"?window:null,root=>{
 const MAX_BATCH=40;
 function plan(state,max=MAX_BATCH){
   const Care=root?.TillfolkCropCare,Orders=root?.TillfolkOrders,World=root?.TillfolkWild;
   if(!state||!Array.isArray(state.plots)||!Array.isArray(state.orders)||!Care||!Orders)
     return {needing:0,ready:[],already:0,blocked:0,reason:"Sistema de ordens indisponível"};
   const queued=new Set(state.orders.filter(o=>o.type==="water").map(o=>Orders.id("water",o.x,o.y)));
   const candidates=[];
   let needing=0,already=0,blocked=0,reason="";
   const workers=Array.isArray(state.workers)?state.workers:[];
   for(const p of state.plots){
     if(!Care.needsWater(p))continue;
     needing++;
     const id=Orders.id("water",p.x,p.y);
     if(queued.has(id)){already++;continue;}
     const canWork=workers.some(w=>!w.neg?.includes("water")&&
       (Number(state.water)>0||!w.neg?.includes("collectWater")));
     if(!canWork){blocked++;reason=reason||"Nenhum colono habilitado para regar ou buscar água";continue;}
     const obj=World?.at?.(state.world,p.x,p.y)||null;
     const check=Orders.status({id,type:"water",x:p.x,y:p.y},p,obj,state);
     if(check.state!=="ready"){blocked++;reason=reason||check.reason;continue;}
     candidates.push({x:p.x,y:p.y,plot:p,object:obj});
   }
   // Limite de ordens globais é definido pelo motor. Não exceder 1500.
   const room=Math.max(0,1500-state.orders.length);
   return {needing,ready:candidates.slice(0,Math.max(0,Math.min(MAX_BATCH,Math.floor(max),room))),
     already,blocked,reason:room===0?"Fila de ordens cheia":reason,
     overflow:Math.max(0,candidates.length-Math.min(MAX_BATCH,Math.floor(max),room))};
 }
 function queue(state,max=MAX_BATCH){
   const view=plan(state,max);
   let added=0;
   for(const target of view.ready){
     const result=root.TillfolkOrders.add(state.orders,"water",target.x,target.y,
       target.plot,target.object,state);
     if(result?.order&&result.state==="ready"){
       state.orders.push(result.order);
       added++;
     }
   }
   return {added,needing:view.needing,already:view.already,blocked:view.blocked,
     reason:view.reason,overflow:view.overflow};
 }
 return Object.freeze({plan,queue,MAX_BATCH});
});
