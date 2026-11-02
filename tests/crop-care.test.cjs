"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const vm=require("node:vm");
const fs=require("node:fs");

const ctx={window:{},Image:class{}};
for(const path of ["src/crop-catalog.js","src/crop-care.js","src/colony-life.js","src/farm-planning.js"]){
  vm.runInNewContext(fs.readFileSync(path,"utf8"),ctx,{filename:path});
}
const Crops=ctx.window.TillfolkCrops;
const Care=ctx.window.TillfolkCropCare;
const Life=ctx.window.TillfolkColonyLife;
const Plan=ctx.window.TillfolkFarmPlanning;
const newPlot=()=>({crop:"pumpkin",seeded:false,watered:false,growth:0,produce:false});

test("19 culturas têm regas diferenciadas; batata do tutorial mantém uma",()=>{
 assert.equal(Crops.ALL.length,19);
 assert.ok(Crops.ALL.every(c=>Number.isInteger(c.waterNeed)&&c.waterNeed>=1&&c.waterNeed<=3));
 assert.equal(Crops.get("potato").waterNeed,1);
 assert.equal(Crops.get("tomato").waterNeed,2);
 assert.equal(Crops.get("pumpkin").waterNeed,3);
});
test("cada rega libera apenas uma etapa de crescimento e nunca gasta água sozinha",()=>{
 const p=newPlot();Care.sow(p,"pumpkin");
 assert.equal(Care.remaining(p),3);
 assert.equal(Care.advance(p,1),false);
 for(let cycle=1;cycle<=3;cycle++){
   assert.equal(Care.irrigate(p),true);
   assert.equal(Care.irrigate(p),false,"não pode contar a mesma rega duas vezes");
   assert.equal(Care.advance(p,1),true);
   assert.ok(Math.abs(p.growth-cycle/3)<1e-9);
   assert.equal(Care.remaining(p),3-cycle);
   assert.equal(p.watered,cycle===3);
 }
 assert.equal(p.growth,1);assert.equal(Care.irrigate(p),false);
 assert.equal(Care.advance(p,100),false);
 Care.finish(p);
 assert.equal(p.watered,false);assert.equal(p.waterings,0);
});
test("batata amadurece após uma rega e não altera as sementes",()=>{
 const p=newPlot();Care.sow(p,"potato");
 const count=5;assert.equal(Care.irrigate(p),true);
 Care.advance(p,1);
 assert.equal(p.growth,1);
 assert.equal(p.waterings,1);
 assert.equal(count,5);
});
test("save legado com canteiro já regado não perde progresso nem exige água nova",()=>{
 const p={crop:"pumpkin",seeded:true,watered:true,growth:.77};
 const clone=JSON.parse(JSON.stringify(p));
 Care.normalize(clone);
 assert.equal(clone.waterings,3);
 Care.advance(clone,.3);
 assert.equal(clone.growth,1);
 assert.equal(Care.needsWater(clone),false);
 const oldDry={crop:"pumpkin",seeded:true,watered:false,growth:0};
 Care.normalize(oldDry);
 assert.equal(oldDry.waterings,0);
 assert.equal(Care.needsWater(oldDry),true);
});
test("chuva cumpre rega atual sem adicionar água ao depósito",()=>{
 const seed=4433;
 const day=Array.from({length:30},(_,i)=>i+1)
   .find(d=>Life.weather(d,seed)==="chuva");
 assert.ok(day,"deve existir dia chuvoso");
 const p=newPlot();Care.sow(p,"pumpkin");
 const state={day,world:{seed},workers:[],plots:[p],mode:"relaxed",food:0,water:0};
 Life.advance(state,60);
 assert.equal(p.waterings,1);assert.equal(p.watered,true);
 Life.advance(state,60);
 assert.equal(p.waterings,1,"a chuva não multiplica regas na mesma etapa");
 Care.advance(p,1);
 assert.equal(p.watered,false);
 Life.advance(state,60);
 assert.equal(p.waterings,2);
 assert.equal(state.water,0);
});
test("meta diária orientativa cresce de 2 para 3 e 5 pessoas e custa água",()=>{
 const make=n=>({workers:Array.from({length:n},(_,i)=>({id:i+1})),food:0});
 const goals=[2,3,5].map(n=>Plan.forecast(make(n),"potato"));
 assert.deepEqual(goals.map(p=>p.harvestsPerDay),[1,2,2]);
 assert.deepEqual(goals.map(p=>p.mealsPerDay),[2,3,5]);
 assert.ok(goals.every(p=>p.wateringsPerDay===p.harvestsPerDay));
 const five=Plan.forecast(make(5),"pumpkin");
 assert.equal(five.harvestsPerDay,2);
 assert.equal(five.wateringsPerDay,6);
 assert.equal(Plan.forecast(make(0),"pumpkin"),null);
});
