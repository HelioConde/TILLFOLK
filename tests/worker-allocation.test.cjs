"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const Allocation=require("../src/worker-allocation.js");
const makeTask=(id,type,priority=5,assigned=null)=>({id,type,status:"ready",priority,assigned});
const makeWorker=(id,neg=[],skills=[])=>({id,task:null,resting:false,neg,skills});
const viable=(w,t)=>!w.neg.includes(t.type)&&t.routeBlockedFor!==w.id&&
  (t.type!=="craftTool"||!w.noTool);
const score=(w,t)=>t.priority*100+(w.skills.includes(t.type)?20:0);
test("priorizar o colono com uma única ordem realmente acessível",()=>{
  const w1=makeWorker(1),w2=makeWorker(2,["clear"]);
  const jobs=[makeTask("clear-1","clear",1),makeTask("till-1","till",9)];
  const plan=Allocation.plan([w1,w2],jobs,viable,score);
  assert.deepEqual(plan.map(({worker,task})=>[worker.id,task.id]),[[2,"till-1"],[1,"clear-1"]]);
  assert.equal(w1.task,null,"apenas planejar não altera o estado salvo");
  assert.equal(jobs[0].assigned,null,"não reservar ordens fora do motor");
});
test("rotas bloqueadas reduzem candidaturas e não deixam colono ocioso",()=>{
  const w1=makeWorker(1),w2=makeWorker(2);
  const blocked={...makeTask("corte","clear",3),routeBlockedFor:2};
  const accessible=makeTask("horta","till",9);
  const plan=Allocation.plan([w1,w2],[blocked,accessible],viable,score);
  assert.deepEqual(plan.map(({worker,task})=>[worker.id,task.id]),[[2,"horta"],[1,"corte"]]);
});
test("respeitar ordem já atribuída, descanso e restrições vermelhas",()=>{
  const sleeping={...makeWorker(1),resting:true};
  const active={...makeWorker(2),task:"antiga"};
  const prohibited=makeWorker(3,["water"]);
  const available=makeWorker(4);
  const jobs=[makeTask("ocupada","till",9,99),makeTask("rega","water",8)];
  const plan=Allocation.plan([sleeping,active,prohibited,available],jobs,viable,score);
  assert.deepEqual(plan.map(({worker,task})=>[worker.id,task.id]),[[4,"rega"]]);
});
test("escolher a maior prioridade dentre as tarefas acessíveis",()=>{
  const worker=makeWorker(5,[],["sow"]);
  const jobs=[makeTask("baixo","sow",2),makeTask("alto","clear",8),makeTask("médio","water",4)];
  assert.equal(Allocation.plan([worker],jobs,viable,score)[0].task.id,"alto");
});
test("sem dupla atribuição e resultado determinístico após remover ordem concorrida",()=>{
  const workers=[makeWorker(3),makeWorker(1),makeWorker(2)];
  const jobs=[makeTask("A","clear",5),makeTask("B","clear",5)];
  const a=Allocation.plan(workers,jobs,viable,score);
  const b=Allocation.plan(workers,jobs,viable,score);
  assert.deepEqual(a.map(x=>[x.worker.id,x.task.id]),b.map(x=>[x.worker.id,x.task.id]));
  assert.equal(new Set(a.map(x=>x.task.id)).size,2);
  assert.equal(a.length,2,"um colono deve continuar livre sem uma terceira ordem");
});
test("tarefas bloqueadas ou lista vazia não induzem trabalhos automáticos",()=>{
  const workers=[makeWorker(1)];
  assert.equal(Allocation.plan(workers,[],viable,score).length,0);
  assert.equal(Allocation.plan(workers,[{...makeTask("bloqueada","sow"),status:"blocked"}],viable,score).length,0);
  assert.equal(Allocation.plan([makeWorker(1,["clear"])],[makeTask("limpar","clear")],viable,score).length,0);
});
