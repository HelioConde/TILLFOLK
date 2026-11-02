"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const Scoring=require("../src/worker-task-scoring.js");
const worker=(props={})=>({id:1,x:12.5,y:11.5,energy:90,health:100,
  satiety:100,skills:["till"],neg:[],personalPriority:{},...props});
const task=(type,x,y,id=type+x+y)=>({id,type,x,y,status:"ready"});
const state=(food=10,population=2)=>({
  food,workers:Array.from({length:population},(_,id)=>({id:id+1})),
  priorities:{till:5,water:5,harvest:5,carry:5,clear:5}
});
test("a tarefa mais perto ganha entre prioridades e bônus iguais",()=>{
 const w=worker(),s=state();
 const near=task("till",13,11,"near");
 const far=task("till",80,75,"far");
 const order=Scoring.sort([far,near],w,s,()=>1);
 assert.equal(order[0].id,"near");
});
test("prioridade explícita 9 supera distância para preservar controle do jogador",()=>{
 const w=worker(),s=state();
 const near=task("clear",13,11,"near");
 const important={...task("till",80,75,"important"),priority:9};
 assert.equal(Scoring.sort([near,important],w,s,()=>1)[0].id,"important");
});
test("especialização favorece trabalhador eficiente, sem bloquear generalistas",()=>{
 const s=state();
 const job=task("till",20,11);
 assert.ok(Scoring.score(worker(),job,s,2.5)>Scoring.score(worker(),job,s,1));
 assert.ok(Number.isFinite(Scoring.score(worker(),job,s,1)));
});
test("escassez prioriza colheita que já foi ordenada",()=>{
 const w=worker({skills:[]});
 const sow=task("till",13,11,"soil");
 const harvest=task("harvest",25,11,"food");
 const low=state(1,2),full=state(20,2);
 assert.ok(Scoring.score(w,harvest,low,1)-Scoring.score(w,harvest,full,1)>=45);
 assert.equal(Scoring.sort([harvest,sow],w,low,()=>1)[0].id,"food");
});
test("trabalhadores exaustos ou doentes priorizam trajetos mais curtos",()=>{
 const s=state(),far=task("clear",70,70),near=task("clear",13,11);
 const rested=worker({skills:[]});
 const tired=worker({skills:[],energy:15,health:20,satiety:15});
 const penalty=Scoring.score(tired,far,s,1)-Scoring.score(tired,near,s,1);
 const normal=Scoring.score(rested,far,s,1)-Scoring.score(rested,near,s,1);
 assert.ok(penalty<normal);
 assert.equal(Scoring.sort([far,near],tired,s,()=>1)[0].id,near.id);
});
test("ranqueamento não cria nem altera ordens, recursos ou saves",()=>{
 const w=worker(),s=state(5),a=task("clear",13,11),b=task("till",15,11);
 const original=JSON.stringify({w,s,a,b});
 Scoring.sort([a,b],w,s,()=>1);
 assert.equal(JSON.stringify({w,s,a,b}),original);
});
test("empates são determinísticos e não dependem da ordem original da fila",()=>{
 const w=worker(),s=state();
 const a=task("clear",12,11,"A"),b=task("clear",12,11,"B");
 assert.equal(Scoring.sort([b,a],w,s,()=>1)[0].id,"A");
});
