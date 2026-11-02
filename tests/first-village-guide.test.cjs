"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const Village=require("../src/first-village-guide.js");
const Progression=require("../src/progression.js");
const colony=()=>({
  crafting:{station:{x:96,y:60},equipment:{hoe:true}},
  workers:[{id:1,inventory:{tools:{hoe:true}}},{id:2,inventory:{tools:{}}}],
  homes:[{x:98,y:60}],chests:[],firstHarvest:true,food:8,
  colonyLife:{researchLevel:0},orders:[],inventory:{wood:0,twigs:0},
  tutorial:{active:true,finished:true,step:13,version:6}
});
test("após a primeira cabana, indicar baú, pesquisa e reserva de comida",()=>{
 const state=colony(),before=JSON.stringify(state);
 const steps=Village.next(state,Progression);
 assert.deepEqual(steps.map(s=>s.id),["chest","research1","food12"]);
 assert.ok(steps.every(s=>s.title.length>=10&&s.hint.length>=15));
 assert.equal(JSON.stringify(state),before,"guia não muda salvamento, ordens nem recursos");
});
test("o guia adapta os objetivos conforme o avanço da vila",()=>{
 const state=colony();
 state.chests.push({x:97,y:61});
 assert.deepEqual(Village.next(state,Progression).map(s=>s.id),["research1","food12"]);
 state.colonyLife.researchLevel=1;state.food=12;
 assert.deepEqual(Village.next(state,Progression).map(s=>s.id),["research2","well","homes2"]);
});
test("saves antigos sem progresso ou dados nulos não quebram o guia",()=>{
 assert.deepEqual(Village.next(null,Progression),[]);
 assert.deepEqual(Village.next(colony(),null),[]);
 assert.deepEqual(Village.next(colony(),Progression,0),[]);
});
test("não desbloqueia foguete, outro capítulo nem trabalho gratuito",()=>{
 const state=colony();
 const first=Village.next(state,Progression,5);
 assert.ok(first.every(s=>s.chapter===1));
 assert.equal(state.orders.length,0);
 assert.equal(state.colonyLife.researchLevel,0);
});
test("renderização usa texto e até 3 objetivos, sem HTML não confiável",()=>{
 const state=colony();
 const children=[];
 const doc={createElement(tag){return {tag,textContent:"",children:[],
  append(...items){this.children.push(...items)}}}};
 const element={ownerDocument:doc,replaceChildren(){children.length=0},
   append(node){children.push(node)}};
 const plan=Village.render(state,Progression,element);
 assert.equal(plan.length,3);assert.equal(children.length,3);
 assert.equal(children[0].children[0].textContent,"Construir um baú");
 assert.ok(children[0].children[1].textContent.includes("recursos"));
});
