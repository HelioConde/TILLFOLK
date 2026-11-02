"use strict";
/* Escolha explicável entre ORDENS QUE O JOGADOR JÁ CRIOU.
   Esta função não cria ordens, recursos, trabalhadores ou caminhos.
   O motor valida acesso, ferramentas e restrições ANTES de pontuar. */
((root,factory)=>{
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.TillfolkTaskAssignment=api;
})(typeof window!=="undefined"?window:null,()=>{
 const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
 const finite=(x,fallback)=>Number.isFinite(Number(x))?Number(x):fallback;
 const criticalFood=(state)=>{
  const count=Math.max(1,state?.workers?.length||1);
  return Math.max(0,finite(state?.food,0))<count*2;
 };
 function score(worker,task,state,workSpeed=1){
   const global=clamp(finite(task?.priority,state?.priorities?.[task?.type]??5),1,9);
   const personal=clamp(finite(worker?.personalPriority?.[task?.type],5),1,9);
   const distance=Math.abs(finite(worker?.x,0)-(finite(task?.x,0)+.5))+
     Math.abs(finite(worker?.y,0)-(finite(task?.y,0)+.5));
   const expertise=clamp(finite(workSpeed,1),.2,5);
   // Urgência melhora tarefas agrícolas já autorizadas, sem ultrapassar
   // o peso de um nível de prioridade escolhido explicitamente pelo jogador.
   const hungerRisk=criticalFood(state);
   const foodUrgency=hungerRisk?({carry:65,harvest:55,water:30,sow:25}[task?.type]||0):0;
   const health=clamp(finite(worker?.health,100),0,100);
   const energy=clamp(finite(worker?.energy,100),0,100);
   // Evita deslocamentos longos para trabalhadores debilitados, sem
   // proibir o trabalho que poderia ser a última saída da colônia.
   const fatigueDistancePenalty=distance*(energy<25||health<30?.45:.22);
   return global*100+personal*14+expertise*9+foodUrgency-fatigueDistancePenalty;
 }
 function rank(worker,tasks,state,speedFn=()=>1){
   return tasks.slice().sort((a,b)=>{
     const diff=score(worker,b,state,speedFn(worker,b.type))-
       score(worker,a,state,speedFn(worker,a.type));
     return diff||String(a.id||"").localeCompare(String(b.id||""));
   });
 }
 return Object.freeze({score,rank,criticalFood});
});
