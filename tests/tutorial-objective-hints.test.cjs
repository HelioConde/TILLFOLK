"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");

const recipes={
  hoe:{name:"Enxada",cost:{twigs:3,gravel:1}},
  axe:{name:"Machado de pedra",cost:{twigs:4,gravel:2}},
  wateringCan:{name:"Regador",cost:{twigs:3,gravel:2,grass:1}}
};
global.window={
  TillfolkLogistics:{available:(state,kind)=>state.resources?.[kind]??0},
  TillfolkCrafting:{
    recipe:key=>recipes[key]||null,
    formatCost:cost=>Object.entries(cost).map(([kind,amount])=>amount+" "+kind).join(" · ")
  }
};
require("../src/missions.js");
const missions=global.window.TillfolkMissions;
const objective=key=>missions.STEPS.find(step=>step.key===key);
const make=(resources,orders=[])=>({resources,orders});

test("obras indicam materiais entregues em vez de reiniciar contagem",()=>{
  const colony=make({twigs:6,wood:5},[
    {type:"buildStation",delivered:{twigs:4}},
    {type:"buildHome",delivered:{wood:3}}
  ]);
  assert.match(missions.objectiveHint(colony,objective("workstation")),/4 \/ 10 gravetos entregues/);
  assert.match(missions.objectiveHint(colony,objective("workstation")),/6 disponíveis/);
  assert.match(missions.objectiveHint(colony,objective("home")),/3 \/ 8 madeiras entregues/);
  assert.match(missions.objectiveHint(colony,objective("home")),/5 disponíveis/);
});

test("ferramenta mostra apenas recursos faltantes",()=>{
  assert.match(missions.objectiveHint(make({twigs:2,gravel:1}),objective("hoe")),/Ainda falta: 1 twigs/);
  assert.doesNotMatch(missions.objectiveHint(make({twigs:2,gravel:1}),objective("hoe")),/3 twigs/);
  assert.match(missions.objectiveHint(make({twigs:3,gravel:1}),objective("hoe")),/Materiais prontos/);
});

test("ferramenta já encomendada tem orientação própria",()=>{
  const colony=make({twigs:0},[{type:"craftTool",recipe:"axe"}]);
  assert.match(missions.objectiveHint(colony,objective("axe")),/encomendada/);
});

test("outras missões preservam dicas e ausência de objetivo não causa erro",()=>{
  assert.match(missions.objectiveHint(make({}),objective("tree")),/machado/);
  assert.match(missions.objectiveHint(make({}),objective("seed")),/Procure:/);
  assert.equal(missions.objectiveHint(make({}),null),"");
});
