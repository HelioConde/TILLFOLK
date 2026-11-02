"use strict";
/* Planejamento S4: meta transparente, nunca uma promessa de produtividade.
   A execução depende de ordens, clima, solo, transporte e mão de obra. */
((root,factory)=>{
 const api=factory(root);
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.TillfolkFarmPlanning=api;
})(typeof window!=="undefined"?window:null,root=>{
 const SAFETY_MARGIN=1.15; // inclui pequena margem para deterioração e imprevistos
 function forecast(state,cropId){
   const crop=root?.TillfolkCrops?.get?.(cropId);
   const people=Array.isArray(state?.workers)?state.workers.length:0;
   if(!crop||!people)return null;
   // 70 pontos de saciedade consumidos/dia, 70 restaurados por refeição.
   // Aproximação em steady-state; trabalhadores já saciados podem comer depois.
   const mealsPerDay=people;
   const harvestsPerDay=Math.ceil(mealsPerDay*SAFETY_MARGIN/crop.food);
   return Object.freeze({
     people,cropId:crop.id,cropName:crop.name,mealsPerDay,
     harvestsPerDay,foodYield:crop.food,
     wateringsPerHarvest:crop.waterNeed,
     wateringsPerDay:harvestsPerDay*crop.waterNeed,
     foodPerDay:harvestsPerDay*crop.food
   });
 }
 return Object.freeze({forecast});
});
