"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const vm=require("node:vm"),fs=require("node:fs");
const context={window:{}};
for(const file of ["src/crafting.js","src/task-orders.js"]){
  vm.runInNewContext(fs.readFileSync(file,"utf8"),context,{filename:file});
}
const C=context.window.TillfolkCrafting,O=context.window.TillfolkOrders;
const state=()=>({
  inventory:{twigs:0,wood:0,grass:0,stone:0},
  crafting:C.normalize(null),workstations:[],orders:[],world:{water:[]}
});
const plot={x:10,y:10,dirty:false,tilled:false,seeded:false,watered:false,produce:false,growth:0};
test("a primeira bancada requer muitos gravetos e não nasce pronta",()=>{
  const s=state();assert.equal(s.crafting.station,null);
  assert.equal(Object.keys(s.crafting.equipment).length,C.RECIPES.length);
  assert.ok(Object.values(s.crafting.equipment).every(value=>value===false));
  assert.equal(C.STATION_COST,10);
  assert.equal(C.canBuild(s),false);
  assert.equal(O.status({type:"buildStation",x:10,y:10},plot,null,s).state,"blocked");
  s.inventory.twigs=10;
  assert.equal(C.canBuild(s),true);
  assert.equal(O.status({type:"buildStation",x:10,y:10},plot,null,s).state,"ready");
});
test("grama e gravetos são recolhidos à mão, árvore precisa de machado",()=>{
  const s=state();
  assert.equal(C.blocked(s,"clear",{kind:"grass"}),null);
  assert.equal(C.blocked(s,"clear",{kind:"twig"}),null);
  assert.match(C.blocked(s,"clear",{kind:"tree"}),/machado/);
  assert.match(C.blocked(s,"clear",{kind:"stump"}),/pá/);
  assert.match(C.blocked(s,"clear",{kind:"boulder"}),/picareta/);
  assert.match(O.status({type:"till",x:10,y:10},plot,null,s).reason,/enxada/);
  assert.match(O.status({type:"clear",x:10,y:10},plot,{kind:"tree"},s).reason,/machado/);
});
test("fabricar consome recursos, persiste ferramenta e libera a ordem",()=>{
  const s=state();s.inventory.twigs=20;s.inventory.grass=3;
  assert.match(C.craft(s,"axe").error,/Work Station/);
  s.crafting.station={x:10,y:10};
  assert.equal(C.craft(s,"axe").item.key,"axe");
  assert.equal(s.inventory.twigs,12);
  assert.equal(s.inventory.grass,0);
  assert.equal(C.has(s,"axe"),true);
  assert.equal(C.blocked(s,"clear",{kind:"tree"}),null);
  assert.match(C.blocked(s,"clear",{kind:"gateLog"}),/machado de pedra/);
  assert.equal(O.status({type:"clear",x:10,y:10},plot,{kind:"tree"},s).state,"ready");
  assert.match(C.craft(s,"axe").error,/já foi fabricado/);
  assert.equal(C.normalize(s.crafting).equipment.axe,true);
});
test("o regador continua bloqueado até ser fabricado",()=>{
  const s=state();s.crafting.station={x:10,y:10};
  assert.match(C.blocked(s,"water"),/regador/);
  s.inventory.twigs=4;s.inventory.grass=2;
  assert.equal(C.craft(s,"wateringCan").item.key,"wateringCan");
  assert.equal(C.blocked(s,"water"),null);
});
test("migração de saves antigos preserva ferramentas antes ilimitadas",()=>{
  assert.equal(C.normalize(null,true).equipment.pickaxe,true);
  assert.equal(C.normalize(null).equipment.pickaxe,false);
});
