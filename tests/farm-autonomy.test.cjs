"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const F=require("../src/farm-autonomy.js");
const mk=(over={})=>({colonyLife:{autoFarm:false},tutorial:{stats:{carry:0}},cropSeeds:{potato:2,carrot:0},selectedCrop:"potato",
  plots:[{x:4,y:5,tilled:true,seeded:false,watered:false,produce:false,growth:0}],...over});

test("não automatiza antes de ensinar; primeira colheita transportada ativa horta existente",()=>{
  const s=mk();const p=s.plots[0];
  assert.equal(F.next(s,p),null);
  assert.equal(F.trained(s),false);
  assert.equal(F.learn(s),true);
  assert.equal(s.colonyLife.autoFarm,true);
  assert.equal(s.colonyLife.farmTrained,true);
  assert.equal(p.farmManaged,true);
  assert.deepEqual(F.next(s,p),{type:"sow",crop:"potato"});
  assert.equal(F.learn(s),false);
});
test("cada etapa da horta é uma tarefa real, não um produto grátis",()=>{
  const s=mk();F.learn(s);const p=s.plots[0];
  p.seeded=true;p.crop="potato";p.watered=false;p.growth=.3;
  assert.deepEqual(F.next(s,p),{type:"water"});
  p.watered=true;assert.equal(F.next(s,p),null);
  p.growth=1;assert.deepEqual(F.next(s,p),{type:"harvest"});
  p.seeded=false;p.produce=true;assert.deepEqual(F.next(s,p),{type:"carry"});
  p.produce=false;assert.deepEqual(F.next(s,p),{type:"sow",crop:"potato"});
  assert.equal(s.cropSeeds.potato,2,"nenhuma semente pode surgir na programação");
});
test("respeita escolha de parar automatização e cancelar canteiro",()=>{
  const s=mk({colonyLife:{autoFarm:false,autoFarmUserSet:true}});
  assert.equal(F.learn(s),false);
  assert.equal(s.colonyLife.autoFarm,false);
  assert.equal(F.next(s,s.plots[0]),null);
  s.colonyLife.autoFarm=true;
  s.plots[0].farmManaged=false;
  assert.equal(F.next(s,s.plots[0]),null);
  assert.equal(F.shouldPauseOnCancel({type:"sow",autoFarm:true}),true);
  assert.equal(F.shouldPauseOnCancel({type:"sow"}),false);
  assert.equal(F.shouldPauseOnCancel({type:"buildChest",autoFarm:true}),false);
});
test("não ocupa terreno sem ordem agrícola autorizada nem planta sem semente",()=>{
  const untouched=mk();F.learn(untouched);const p=untouched.plots[0];
  p.tilled=false;p.farmManaged=false;
  assert.equal(F.next(untouched,p),null);
  p.tilled=true;p.farmManaged=true;
  untouched.cropSeeds={potato:0};
  assert.equal(F.next(untouched,p),null);
});
test("prefere última cultura do canteiro; reserva espécie disponível sem inventar saldo",()=>{
  const s=mk();F.learn(s);s.plots[0].crop="carrot";s.cropSeeds.carrot=5;
  assert.deepEqual(F.next(s,s.plots[0]),{type:"sow",crop:"carrot"});
  s.cropSeeds.carrot=0;assert.deepEqual(F.next(s,s.plots[0]),{type:"sow",crop:"potato"});
  s.cropSeeds.potato=0;assert.equal(F.next(s,s.plots[0]),null);
});
test("reconhece treino nos saves existentes sem resetar progresso",()=>{
  const s=mk({tutorial:{stats:{carry:1}}});
  assert.equal(F.trained(s),true);
  assert.equal(F.learn(s),true);
  s.plots[0].farmManaged=false;
  assert.equal(F.learn(s),false);
  assert.equal(s.plots[0].farmManaged,false,"não religar canteiro cancelado ao recarregar");
});
