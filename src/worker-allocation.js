"use strict";
/* Distribuição determinística das ordens EXISTENTES do jogador.
   Primeiro oferece as escolhas aos colonos que possuem MENOS trabalhos
   realmente compatíveis (proibições, ferramentas e caminho). Nunca cria
   ordens, altera recursos ou decide ações sem autorização do jogador. */
((root,factory)=>{
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.TillfolkWorkerAllocation=api;
})(typeof window!=="undefined"?window:null,()=>{
  function plan(workers,tasks,isEligible,priority){
    if(!Array.isArray(workers)||!Array.isArray(tasks))return [];
    const pending=tasks.filter(t=>t?.id&&t.status==="ready"&&!t.assigned);
    const options=workers.filter(w=>w&&!w.task&&!w.resting).map(worker=>({
      worker,
      // A elegibilidade completa é avaliada uma vez por par, incluindo rota;
      // decisões posteriores só usam a lista já validada.
      jobs:pending.filter(job=>isEligible(worker,job))
    })).filter(entry=>entry.jobs.length);
    const claimed=new Set(),result=[];
    while(options.length){
      // Após cada escolha, recalcule a escassez real: uma ordem compartilhada
      // pode ter sido reservada por outra pessoa neste mesmo tick.
      options.sort((a,b)=>{
        const na=a.jobs.filter(t=>!claimed.has(t.id)).length;
        const nb=b.jobs.filter(t=>!claimed.has(t.id)).length;
        return na-nb||Number(a.worker.id||0)-Number(b.worker.id||0);
      });
      const next=options.shift();
      const jobs=next.jobs.filter(t=>!claimed.has(t.id));
      if(!jobs.length)continue;
      jobs.sort((a,b)=>{
        const delta=(Number(priority(next.worker,b))||0)-(Number(priority(next.worker,a))||0);
        return delta||String(a.id).localeCompare(String(b.id));
      });
      const task=jobs[0];
      claimed.add(task.id);
      result.push({worker:next.worker,task});
    }
    return result;
  }
  return Object.freeze({plan});
});
