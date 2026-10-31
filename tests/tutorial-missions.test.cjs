"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
global.window={};
require("../src/missions.js");
const Missions=global.window.TillfolkMissions;
const world=()=>({tutorial:Missions.create(),workers:[{name:"Mone"},{name:"Luna"}]});

test("começa na primeira missão, sem concluir por mera marcação de ordem",()=>{
 const state=world();
 assert.equal(Missions.current(state).key,"workstation");
 assert.equal(state.tutorial.stats.workstation,0);
 assert.equal(Missions.record(state,"invalid").advanced,false);
 assert.equal(state.tutorial.step,0);
});

test("semente encontrada antes da passagem de etapa continua valendo",()=>{
 const state=world();
 Missions.record(state,"seed");
 assert.equal(state.tutorial.step,0);
 Missions.record(state,"workstation");
 Missions.record(state,"axe");
 Missions.record(state,"grass");
 assert.equal(state.tutorial.step,4);
 assert.equal(Missions.current(state).key,"till");
});

test("dez ações reais concluem tutorial apenas uma vez",()=>{
 const state=world();
 for(const key of Missions.STEPS.map(step=>step.key)){
  const output=Missions.record(state,key);
  assert.equal(output.advanced,true,key);
 }
 assert.equal(state.tutorial.finished,true);
 assert.equal(state.tutorial.step,Missions.STEPS.length);
 assert.equal(Missions.current(state),null);
 assert.equal(Missions.record(state,"plan").finished,false);
});

test("cada missão oferece conversas naturais de apresentação, espera e trabalho",()=>{
 const state=world();
 assert.equal(Missions.STEPS.length,10);
 for(const [index,step] of Missions.STEPS.entries()){
   state.tutorial.step=index;
   for(const mode of ["intro","waiting","working"]){
     const first=Missions.speech(state,state.workers[0],mode,0);
     const other=Missions.speech(state,state.workers[1],mode,0);
     assert.ok(first.length>=25&&first.length<=145,step.key+" "+mode+" tamanho");
     assert.ok(other.length>=25&&other.length<=145,step.key+" "+mode+" tamanho 2");
     assert.notEqual(first,other,step.key+" "+mode+" variação entre colonos");
     assert.notEqual(first,Missions.speech(state,state.workers[0],mode,1),step.key+" "+mode+" alternância");
   }
   assert.ok(step.help.length>80,step.key+" ajuda detalhada");
   assert.ok(step.complete.length>10,step.key+" celebração");
 }
});

test("a fala acompanha a missão atual e não aparece ao terminar",()=>{
 const state=world();
 const before=Missions.speech(state,state.workers[0],"intro");
 Missions.record(state,"workstation");Missions.record(state,"axe");
 assert.notEqual(Missions.speech(state,state.workers[0],"intro"),before);
 for(const key of ["grass","seed","till","sow","water","harvest","carry","plan"])Missions.record(state,key);
 assert.equal(Missions.speech(state,state.workers[0],"intro"),"");
});
test("save antigo não inicia missões, e progresso novo restaura",()=>{
 assert.equal(Missions.normalize(null).active,false);
 const state=world();
 Missions.record(state,"workstation");
 const loaded=Missions.normalize(JSON.parse(JSON.stringify(state.tutorial)));
 assert.equal(loaded.active,true);
 assert.equal(loaded.step,1);
 assert.equal(loaded.stats.workstation,1);
 assert.ok(Missions.speech({tutorial:loaded,workers:[{}]},{}).length>0);
});
