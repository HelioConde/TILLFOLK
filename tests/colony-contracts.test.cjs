"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const Contracts=require("../src/colony-contracts.js");
const mock=()=>({day:1,gameOver:false,tutorial:{active:true,finished:true},
 workers:[{id:1,neg:[],morale:63,inventory:{tools:{axe:true,hoe:true,wateringCan:true}}}],
 crafting:{station:{x:4,y:4}},homes:[],chests:[],wells:[],colonyLife:{researchLevel:1},firstHarvest:true});
test("as opções curtas surgem depois do machado, sem iniciar ordens",()=>{
 const state=mock();const options=Contracts.offers(state);
 assert.equal(options.length,3);
 assert.deepEqual(options.map(p=>p.id),["madeira","cabana","plantio"]);
 assert.equal(state.orders,undefined);
 assert.equal(state.contracts.active,null);
});
test("madeira só contabiliza árvores realmente derrubadas",()=>{
 const s=mock();assert.equal(Contracts.select(s,"madeira").ok,true);
 assert.equal(Contracts.record(s,{type:"clear"},{kind:"twig"}),null);
 assert.equal(Contracts.record(s,{type:"till"},{kind:"tree"}),null);
 assert.deepEqual(Contracts.record(s,{type:"clear"},{kind:"tree"}),{progressed:true,progress:1,goal:2});
 assert.equal(Contracts.record(s,{type:"clear"},{kind:"twig"}),null);
 const result=Contracts.record(s,{type:"clear"},{kind:"tree"});
 assert.equal(result.completed,true);
 assert.equal(s.workers[0].morale,73);
 assert.equal(s.contracts.completedTotal,1);
 assert.equal(s.contracts.completedDay,1);
 assert.equal(Contracts.record(s,{type:"clear"},{kind:"tree"}),null);
 assert.equal(s.workers[0].morale,73);
});
test("não permite repetir bônus no mesmo dia; abre novas escolhas no dia seguinte",()=>{
 const s=mock();Contracts.select(s,"cabana");
 assert.equal(Contracts.record(s,{type:"buildHome"}).completed,true);
 assert.equal(Contracts.select(s,"madeira").ok,false);
 assert.equal(Contracts.view(s).mode,"completed");
 s.day=2;
 assert.equal(Contracts.view(s).mode,"choose");
 assert.equal(Contracts.select(s,Contracts.offers(s)[0].id).ok,true);
});
test("mutirão em andamento não expira no amanhecer nem concede bônus antecipado",()=>{
 const s=mock();Contracts.select(s,"plantio");
 Contracts.record(s,{type:"sow"});s.day=3;
 assert.equal(Contracts.view(s).mode,"active");
 assert.equal(Contracts.view(s).progress,1);
 assert.equal(s.workers[0].morale,63);
 assert.equal(Contracts.record(s,{type:"sow"}).completed,true);
 assert.equal(s.workers[0].morale,71);
 assert.equal(s.contracts.completedDay,3);
});
test("save antigo sem contratos migra sem prêmios retroativos; save novo preserva progresso",()=>{
 const s=mock();delete s.contracts;
 assert.equal(Contracts.normalize(s).completedTotal,0);
 Contracts.select(s,"clareira");Contracts.record(s,{type:"clear"});
 const saved=JSON.parse(JSON.stringify(s));Contracts.normalize(saved);
 assert.equal(Contracts.view(saved).progress,1);
 assert.equal(saved.workers[0].morale,63);
 assert.equal(Contracts.record(saved,{type:"clear"}).progress,2);
 assert.equal(Contracts.record(saved,{type:"clear"}).completed,true);
 assert.equal(saved.workers[0].morale,70);
});
test("restrição vermelha e falta de ferramenta não oferecem trabalho impossível",()=>{
 const s=mock();s.workers[0].neg=["sow","till"];s.workers[0].inventory.tools.axe=false;
 const choices=Contracts.offers(s);
 assert.equal(choices.some(p=>["madeira","cabana","plantio","canteiros"].includes(p.id)),false);
 assert.ok(choices.some(p=>p.id==="clareira"));
 assert.equal(Contracts.select(s,"madeira").ok,false);
});
test("conclusão e opções ficam ocultas antes de terminar o tutorial",()=>{
 const s=mock(),el={dataset:{},hidden:true,innerHTML:""};
 s.tutorial.finished=false;Contracts.render(s,el,true);assert.equal(el.hidden,true);
 s.tutorial.finished=true;Contracts.render(s,el,true);
 assert.equal(el.hidden,false);assert.match(el.innerHTML,/MUTIRÕES DO VALE/);
 assert.match(el.innerHTML,/data-contract-choice/);
 Contracts.render(s,el,false);assert.equal(el.hidden,true);
});
