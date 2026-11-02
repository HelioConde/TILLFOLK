"use strict";
/* Irrigação S4 — etapas reais de rega, sem ordens automáticas.
   Cada ação de regar gasta uma água; chuva usa a mesma transição sem
   retirar água do estoque. Saves antigos preservam crescimento e rega. */
((root,factory)=>{
 const api=factory(root);
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.TillfolkCropCare=api;
})(typeof window!=="undefined"?window:null,root=>{
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function need(cropId){
   const n=root?.TillfolkCrops?.get?.(cropId)?.waterNeed;
   return Number.isInteger(n)?clamp(n,1,3):1;
 }
 function normalize(plot){
   if(!plot||typeof plot!=="object")return plot;
   if(!plot.seeded){
     plot.waterings=0;
     return plot;
   }
   const required=need(plot.crop);
   plot.growth=clamp(Number.isFinite(plot.growth)?plot.growth:0,0,1);
   if(!Number.isInteger(plot.waterings)){
     // Legacy: once irrigated, a culture retains its prior full growing
     // rights. New 2–3-stage rules never roll back an existing garden.
     plot.waterings=plot.watered?required:Math.ceil(plot.growth*required);
   }
   plot.waterings=clamp(plot.waterings,0,required);
   if(plot.watered&&plot.waterings===0)plot.waterings=required;
   return plot;
 }
 function sow(plot,cropId){
   if(!plot||typeof plot!=="object")return false;
   plot.crop=cropId;plot.seeded=true;plot.produce=false;
   plot.watered=false;plot.waterings=0;plot.growth=0;
   return true;
 }
 function irrigate(plot){
   if(!plot?.seeded||plot.growth>=1)return false;
   normalize(plot);
   if(plot.watered||plot.waterings>=need(plot.crop))return false;
   plot.waterings++;
   plot.watered=true;
   return true;
 }
 function needsWater(plot){
   return Boolean(plot?.seeded&&plot.growth<1&&!plot.watered);
 }
 function advance(plot,delta){
   if(!plot?.seeded||!plot.watered||plot.growth>=1)return false;
   normalize(plot);
   const step=Number.isFinite(delta)?Math.max(0,delta):0;
   if(!step)return false;
   const maxProgress=plot.waterings/need(plot.crop);
   const old=plot.growth;
   plot.growth=Math.min(1,maxProgress,old+step);
   // Water has been consumed for this growth stage. The next irrigation
   // must be explicitly ordered (or supplied by the weather system).
   if(plot.growth+1e-9>=maxProgress&&plot.growth<1-1e-9)plot.watered=false;
   return plot.growth>old;
 }
 function finish(plot){
   if(!plot)return;
   plot.watered=false;plot.waterings=0;
 }
 function remaining(plot){
   if(!plot?.seeded||plot.growth>=1)return 0;
   normalize(plot);
   const required=need(plot.crop);
   return Math.max(0,required-plot.waterings);
 }
 return Object.freeze({need,normalize,sow,irrigate,needsWater,advance,finish,remaining});
});
