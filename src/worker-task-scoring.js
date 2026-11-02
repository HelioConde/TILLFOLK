"use strict";
/* IA de distribuição: apenas classifica ordens EXISTENTES do jogador.
 * A elegibilidade, os caminhos e a reserva ficam no motor.
 * Sem auto-criar trabalhos, tocar inventário ou alterar saves.
 */
((root,factory)=>{
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.TillfolkTaskScoring=api;
})(typeof window!=="undefined"?window:null,()=>{
  const valid=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  function score(worker,task,state,multiplier=1){
    if(!worker||!task||!state)return Number.NEGATIVE_INFINITY;
    const priority=clamp(valid(task.priority,state.priorities?.[task.type]??5),1,9);
    const personal=clamp(valid(worker.personalPriority?.[task.type],5),1,9);
    const expertise=clamp(valid(multiplier,1),.3,4);
    const dx=valid(worker.x,0)-(valid(task.x,0)+.5);
    const dy=valid(worker.y,0)-(valid(task.y,0)+.5);
    const distance=Math.abs(dx)+Math.abs(dy);
    const energy=clamp(valid(worker.energy,100),0,100);
    const health=clamp(valid(worker.health,100),0,100);
    const satiety=clamp(valid(worker.satiety,100),0,100);
    const food=clamp(valid(state.food,0),0,1e6);
    const population=state.workers?.length||0;
    const shortage=population>0&&food<population*2;
    // Somente ordens de alimento já existentes recebem bônus de emergência.
    const foodTask=task.type==="harvest"||task.type==="carry";
    const urgency=shortage&&foodTask?45:0;
    // Trabalhador debilitado prefere trajetos curtos, sem ficar proibido
    // de fazer tarefas para as quais continua habilitado.
    const exhaustion=(energy<25?2.5:energy<45?1.4:1);
    const illness=health<30?2:health<55?1.3:1;
    const hunger=satiety<25?1.3:1;
    return priority*120+personal*17+expertise*12+urgency-
      distance*1.1*exhaustion*illness*hunger;
  }
  function sort(orders,worker,state,bonus){
    return [...orders].sort((a,b)=>{
      const diff=score(worker,b,state,bonus(worker,b.type))-
        score(worker,a,state,bonus(worker,a.type));
      return diff||String(a.id||"").localeCompare(String(b.id||""));
    });
  }
  return Object.freeze({score,sort});
});
