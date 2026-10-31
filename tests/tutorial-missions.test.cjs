"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
global.window={};
require("../src/missions.js");
const Missions=global.window.TillfolkMissions;
const world=()=>({tutorial:Missions.create(),workers:[{name:"Mone"},{name:"Luna"}]});

test("começa na primeira missão, sem concluir por mera marcação de ordem",()=>{
 const state=world();
 assert.equal(Missions.current(state).key,"grass");
 assert.equal(state.tutorial.stats.grass,0);
 assert.equal(Missions.record(state,"invalid").advanced,false);
 assert.equal(state.tutorial.step,0);
});

test("semente encontrada antes da passagem de etapa continua valendo",()=>{
 const state=world();
 Missions.record(state,"seed");
 assert.equal(state.tutorial.step,0);
 Missions.record(state,"grass");
 assert.equal(state.tutorial.step,2);
 assert.equal(Missions.current(state).key,"till");
});

test("oito ações reais concluem tutorial apenas uma vez",()=>{
 const state=world();
 for(const key of Missions.STEPS.map(step=>step.key)){
  const output=Missions.record(state,key);
  assert.equal(output.advanced,true,key);
 }
 assert.equal(state.tutorial.finished,true);
 assert.equal(state.tutorial.step,8);
 assert.equal(Missions.current(state),null);
 assert.equal(Missions.record(state,"plan").finished,false);
});

test("save antigo não inicia missões, e progresso novo restaura",()=>{
 assert.equal(Missions.normalize(null).active,false);
 const state=world();
 Missions.record(state,"grass");
 const loaded=Missions.normalize(JSON.parse(JSON.stringify(state.tutorial)));
 assert.equal(loaded.active,true);
 assert.equal(loaded.step,1);
 assert.equal(loaded.stats.grass,1);
 assert.ok(Missions.speech({tutorial:loaded,workers:[{}]},{}).length>0);
});
