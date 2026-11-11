"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {plan,blockers,score}=require("../scripts/assignment.cjs");
const worker=(id,neg=[],skills=[])=>({id,neg,skills,task:null,resting:false,health:100,tools:[]});
const task=(id,type,priority=5)=>({id,type,priority,status:"ready",assigned:null});
test("colono com poucas opções recebe primeiro o trabalho exclusivo",()=>{
  const flexible=worker(1),restricted=worker(2,["clear"]);
  const jobs=[task("A","clear",1),task("B","sow",9)];
  const result=plan([flexible,restricted],jobs);
  assert.deepEqual(result.map(x=>[x.worker.id,x.task.id]),[[2,"B"],[1,"A"]]);
  assert.equal(flexible.task,null);assert.equal(jobs[0].assigned,null);
});
test("proibições, descanso, ferramenta e acessibilidade impedem trabalho",()=>{
  const forbidden=worker(1,["sow"]);const tired=worker(2);tired.resting=true;
  const usable=worker(3);usable.tools=["hoe"];
  const planting={...task("S","sow",9),requiredTool:"hoe"};
  assert.ok(blockers(forbidden,planting).includes("forbidden-trait"));
  assert.ok(blockers(tired,planting).includes("resting"));
  assert.ok(blockers(worker(4),planting).includes("missing-tool"));
  assert.equal(plan([forbidden,tired,usable],[planting],{reachable:(w)=>w.id===3})[0].worker.id,3);
});
test("a prioridade prevalece e a especialidade desempata",()=>{
  const w=worker(1,[],["sow"]);
  assert.equal(plan([w],[task("A","sow",4),task("B","clear",7)])[0].task.id,"B");
  assert.ok(score(w,task("A","sow",4))>score(worker(2),task("A","sow",4)));
});
test("20 colonos e 10 ordens: nenhuma ordem duplicada ou criada",()=>{
  const workers=Array.from({length:20},(_,i)=>worker(i+1));
  const jobs=Array.from({length:10},(_,i)=>task("order"+i,"clear",5));
  const result=plan(workers,jobs);
  assert.equal(result.length,10);
  assert.equal(new Set(result.map(x=>x.task.id)).size,10);
  assert.equal(jobs.length,10);
  assert.ok(workers.every(w=>w.task==null));
});
test("decisão determinística mesmo com IDs de texto",()=>{
  const workers=[worker("worker-11"),worker("worker-2")];
  const jobs=[task("z","clear"),task("a","clear")];
  const one=plan(workers,jobs),two=plan(workers,jobs);
  assert.deepEqual(one.map(a=>[a.worker.id,a.task.id]),two.map(a=>[a.worker.id,a.task.id]));
});
test("não executa atividade sem autorização ou trabalhador válido",()=>{
  assert.deepEqual(plan([worker(1)],[]),[]);
  assert.deepEqual(plan([worker(1)],[{...task("x","sow"),status:"blocked"}]),[]);
  const dead=worker(3);dead.health=0;
  assert.deepEqual(plan([dead],[task("x","clear")]),[]);
});
