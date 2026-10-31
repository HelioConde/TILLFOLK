"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
global.window={};
require("../src/missions.js");
const M=global.window.TillfolkMissions;
const make=()=>({tutorial:M.create(),workers:[{name:"Mone"},{name:"Luna"}]});
const keys=M.STEPS.map(item=>item.key);

test("o tutorial inicia na primeira missão sem cumprir objetivos automaticamente",()=>{
 const state=make();
 assert.equal(M.current(state)?.key,keys[0]);
 assert.equal(M.record(state,"inexistente").advanced,false);
 assert.equal(state.tutorial.step,0);
});
test("objetivos adiantados ficam registrados e são reconhecidos ao chegar na etapa",()=>{
 const state=make();
 const ahead=keys[Math.min(3,keys.length-1)];
 M.record(state,ahead);
 assert.equal(state.tutorial.step,0);
 for(const key of keys.slice(0,keys.indexOf(ahead)))M.record(state,key);
 assert.equal(state.tutorial.step,keys.indexOf(ahead)+1);
});
test("todas as missões completam uma única vez e preservam a conclusão",()=>{
 const state=make();
 for(const key of keys)assert.equal(M.record(state,key).advanced,true,key);
 assert.equal(state.tutorial.finished,true);
 assert.equal(state.tutorial.step,keys.length);
 assert.equal(M.current(state),null);
 assert.equal(M.record(state,keys.at(-1)).advanced,false);
});
test("falas têm dois interlocutores e três contextos naturais",()=>{
 const state=make();
 for(const [index,step] of M.STEPS.entries()){
  state.tutorial.step=index;
  for(const mode of ["intro","waiting","working"]){
   const a=M.speech(state,state.workers[0],mode,0);
   const b=M.speech(state,state.workers[1],mode,0);
   assert.ok(a.length>=18&&a.length<=180,step.key+" fala");
   assert.notEqual(a,b,step.key+" interlocutor");
   assert.notEqual(a,M.speech(state,state.workers[0],mode,1),step.key+" variação");
  }
  assert.ok(step.help.length>60,step.key+" instrução");
  assert.ok(step.complete.length>10,step.key+" conclusão");
 }
});
test("saves antigos não recebem tutorial novo, saves atuais são restaurados",()=>{
 assert.equal(M.normalize(null).active,false);
 const state=make();
 M.record(state,keys[0]);
 const restored=M.normalize(JSON.parse(JSON.stringify(state.tutorial)));
 assert.equal(restored.active,true);
 assert.equal(restored.step,1);
 assert.equal(restored.stats[keys[0]],1);
 assert.ok(M.speech({tutorial:restored,workers:[{}]},{}).length>10);
});
