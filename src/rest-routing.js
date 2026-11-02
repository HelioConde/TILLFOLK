"use strict";
/* Descanso seguro: escolhe destino ALCANÇÁVEL sem teleportar colono.
   Pode repousar ao relento se a casa e a clareira forem inacessíveis. */
((root,factory)=>{
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.TillfolkRestRouting=api;
})(typeof window!=="undefined"?window:null,()=>{
 function choose(worker,home,spawn,routeBetween){
   const origin={x:Math.floor(worker.x),y:Math.floor(worker.y)};
   const homeGoal=home?{x:Math.max(1,home.x-1),y:home.y}:null;
   const spawnGoal={x:Math.floor(spawn.x),y:Math.floor(spawn.y)};
   for(const [kind,goal] of [[homeGoal?"home":null,homeGoal],["camp",spawnGoal]]){
     if(!kind||!goal)continue;
     const route=routeBetween(worker.x,worker.y,goal.x,goal.y,worker);
     if(route?.length)return {kind,goal,route,fallback:kind!=="home"};
   }
   // Último recurso: dormir no local atual. Não caminhar através de obstáculos.
   return {kind:"ground",goal:origin,route:[],fallback:true};
 }
 return Object.freeze({choose});
});
