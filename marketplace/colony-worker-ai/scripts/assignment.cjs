"use strict";
/* Independent TILLFOLK-derived example. No game assets or external dependencies. */
function blockers(worker,task,{reachable}={}){
  const reasons=[];
  if(!worker||!task)return ["invalid"];
  if(task.status!=="ready"||task.assigned!=null&&task.assigned!==false)reasons.push("not-ready");
  if(worker.task!=null)reasons.push("busy");
  if(worker.resting||worker.sleeping)reasons.push("resting");
  if(Number.isFinite(worker.health)&&worker.health<=0)reasons.push("incapacitated");
  if(Array.isArray(worker.neg)&&worker.neg.includes(task.type))reasons.push("forbidden-trait");
  if(task.requiredTool&&!new Set(worker.tools||[]).has(task.requiredTool))reasons.push("missing-tool");
  if(typeof reachable==="function"&&!reachable(worker,task))reasons.push("unreachable");
  return reasons;
}
function score(worker,task,{distance}={}){
  const priority=Number.isFinite(Number(task.priority))?Number(task.priority):5;
  const skills=Array.isArray(worker.skills)?worker.skills:[];
  const specialization=skills.includes(task.type)?(skills.length===1?30:skills.length===2?24:18):0;
  const urgency=Math.min(20,Math.max(0,Number(task.urgency)||0));
  const dist=typeof distance==="function"?Number(distance(worker,task)):0;
  return priority*100+specialization+urgency-(Number.isFinite(dist)?Math.max(0,dist):0);
}
function plan(workers,tasks,options={}){
  if(!Array.isArray(workers)||!Array.isArray(tasks))return [];
  const pending=tasks.filter(t=>t&&t.id!=null&&t.status==="ready"&&t.assigned==null);
  const eligible=typeof options.isEligible==="function"?options.isEligible:()=>true;
  const active=workers.filter(Boolean).map(worker=>({
    worker,jobs:pending.filter(task=>blockers(worker,task,options).length===0&&eligible(worker,task))
  })).filter(entry=>entry.jobs.length>0);
  const claimed=new Set(),assignments=[];
  const stable=(a,b)=>String(a).localeCompare(String(b),"en",{numeric:true});
  while(active.length){
    active.sort((a,b)=>{
      const count=x=>x.jobs.filter(job=>!claimed.has(job.id)).length;
      return count(a)-count(b)||stable(a.worker.id,b.worker.id);
    });
    const next=active.shift();
    const choices=next.jobs.filter(job=>!claimed.has(job.id));
    if(!choices.length)continue;
    const evaluate=typeof options.score==="function"?options.score:(w,t)=>score(w,t,options);
    choices.sort((a,b)=>{
      const left=Number(evaluate(next.worker,a)),right=Number(evaluate(next.worker,b));
      const delta=(Number.isFinite(right)?right:0)-(Number.isFinite(left)?left:0);
      return delta||stable(a.id,b.id);
    });
    const task=choices[0];claimed.add(task.id);
    assignments.push({worker:next.worker,task});
  }
  return assignments;
}
module.exports=Object.freeze({plan,blockers,score});
