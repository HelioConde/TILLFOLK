"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const Food=require("../src/food-ledger.js");
const Survival=require("../src/survival.js");
global.window={TillfolkFoodLedger:Food};
const mkWorker=i=>({id:i,name:"Colono "+i,satiety:10,health:100,task:null});
const mkState=(count,food)=>({
  day:1,mode:"survival",food,workers:Array.from({length:count},(_,i)=>mkWorker(i+1)),
  foodLedger:{version:1,stock:{potato:food},generic:0}
});
for(const colonists of [2,3,5]){
  test("consumo atômico sem duplicar alimentos: "+colonists+" colonos",()=>{
    const state=mkState(colonists,colonists);
    Food.normalize(state);
    assert.ok(state.workers.every(w=>Survival.tryEat(state,w)));
    assert.equal(state.food,0);
    assert.equal(Food.available(state,"potato"),0);
    assert.ok(state.workers.every(w=>w.satiety===80));
    const restored=JSON.parse(JSON.stringify(state));
    Food.normalize(restored);
    assert.equal(restored.food,0,"recarregamento não cria refeições");
    assert.equal(Food.available(restored,"potato"),0);
  });
  test("escassez mantém saúde e estoque consistente: "+colonists+" colonos",()=>{
    const state=mkState(colonists,Math.max(0,colonists-1));
    const ate=state.workers.filter(w=>Survival.tryEat(state,w)).length;
    assert.equal(ate,colonists-1);
    assert.equal(state.food,0);
    assert.equal(Food.available(state,"potato"),0);
    assert.equal(state.workers.filter(w=>w.satiety<30).length,1);
    assert.ok(state.workers.every(w=>w.health===100),"fome não mata instantaneamente");
  });
}
test("migração conservadora não inventa alimento tipado",()=>{
  const s={food:2,foodLedger:{version:1,stock:{potato:900,wheat:1},generic:0}};
  Food.normalize(s);
  assert.equal(Food.available(s,"potato"),2);
  assert.equal(Food.available(s,"wheat"),0);
  assert.equal(s.food,2);
});
test("catálogo de 19 culturas tem rendimentos, sementes e irrigação válidos",()=>{
  const code=fs.readFileSync(path.join(__dirname,"../src/crop-catalog.js"),"utf8");
  const page={window:{}};
  vm.runInNewContext(code,page,{filename:"crop-catalog.js"});
  const crops=page.window.TillfolkCrops.ALL;
  assert.equal(crops.length,19);
  assert.equal(new Set(crops.map(c=>c.id)).size,19);
  for(const crop of crops){
    assert.ok(crop.food>0,crop.id+" precisa produzir comida");
    assert.ok(Number.isInteger(crop.waterNeed)&&crop.waterNeed>=1&&crop.waterNeed<=3);
    assert.ok(Number.isInteger(crop.seedYield)&&crop.seedYield>=1);
  }
});
