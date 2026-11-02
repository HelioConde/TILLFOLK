"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const Food=require("../src/food-ledger.js");

const state=(food=8)=>({mode:"survival",day:2,food,
  workers:[],cropProduce:{potato:45,tomato:30},cropSeeds:{potato:1,tomato:2}});

test("save legado preserva comida e histórico sem inventar espécie disponível",()=>{
 const s=state(8);
 const ledger=Food.normalize(s);
 assert.equal(s.food,8);
 assert.equal(s.cropProduce.potato,45);
 assert.equal(s.cropProduce.tomato,30);
 assert.equal(ledger.generic,8);
 assert.equal(Food.available(s,"tomato"),0);
 assert.equal(Food.spend(s,2,"tomato"),false);
 assert.equal(s.food,8);
});
test("colheita entregue acrescenta somente saldo físico da própria espécie",()=>{
 const s=state(4);
 assert.equal(Food.add(s,"potato",3),true);
 assert.equal(s.food,7);
 assert.equal(Food.available(s,"potato"),3);
 assert.equal(Food.available(s,"tomato"),0);
 assert.equal(Food.spend(s,2,"tomato"),false);
 assert.equal(Food.spend(s,2,"potato"),true);
 assert.equal(s.food,5);
 assert.equal(Food.available(s,"potato"),1);
 assert.equal(s.cropProduce.potato,45);
});
test("colonos consomem comida genérica primeiro, depois estoque tipado",()=>{
 const s=state(2);
 Food.add(s,"carrot",4);
 assert.equal(Food.spend(s,3),true);
 assert.equal(s.food,3);
 assert.equal(Food.available(s,"carrot"),3);
 assert.equal(s.foodLedger.generic,0);
 assert.equal(Food.spend(s,4),false);
 assert.equal(s.food,3);
 assert.equal(Food.spend(s,3),true);
 assert.equal(s.food,0);
 assert.equal(Food.available(s,"carrot"),0);
});
test("estado incompleto ou adulterado nunca duplica alimento ao normalizar",()=>{
 const s=state(3);
 s.foodLedger={version:1,stock:{tomato:90,carrot:4},generic:999};
 const ledger=Food.normalize(s);
 assert.equal(Object.values(ledger.stock).reduce((sum,n)=>sum+n,0)+ledger.generic,3);
 assert.equal(s.food,3);
 assert.equal(Food.spend(s,4),false);
 assert.equal(s.food,3);
});
test("roundtrip de save mantém quantidades e tipos sem recompensas retroativas",()=>{
 const s=state(7);
 Food.add(s,"wheat",3);
 Food.spend(s,2);
 const old=JSON.parse(JSON.stringify(s));
 assert.equal(Food.available(old,"wheat"),3);
 assert.equal(old.food,8);
 assert.equal(Food.spend(old,2,"wheat"),true);
 assert.equal(old.food,6);
 assert.equal(Food.available(old,"wheat"),1);
});
test("refeição, deterioração e conselho debitam o mesmo registro",()=>{
 const context={window:{TillfolkFoodLedger:Food}};
 vm.runInNewContext(fs.readFileSync("src/survival.js","utf8"),context);
 vm.runInNewContext(fs.readFileSync("src/colony-life.js","utf8"),context);
 vm.runInNewContext(fs.readFileSync("src/colony-council.js","utf8"),context);
 const Survival=context.window.TillfolkSurvival;
 const Life=context.window.TillfolkColonyLife;
 const Council=context.window.TillfolkCouncil;
 const s={mode:"survival",day:2,food:12,workers:[
  {id:1,name:"Sim",satiety:20,health:100,energy:80,morale:75},
  {id:2,name:"Mone",satiety:80,health:100,energy:80,morale:75}],
  world:{seed:99},plots:[],homes:[],animals:[],
  tutorial:{active:false,finished:true},
  foodLedger:{version:1,stock:{tomato:5},generic:7}};
 assert.equal(Survival.tryEat(s,s.workers[0]),true);
 assert.equal(s.food,11);
 assert.equal(Food.available(s,"tomato"),5);
 s.colonyLife={foodSpoil:.99};
 Life.advance(s,60);
 assert.equal(s.food,10); // 1 item deteriorou; sem descontar novamente no ledger
 assert.equal(Food.available(s,"tomato"),5);
 assert.equal(Council.status(s).mode,"ready");
 assert.equal(Council.decide(s,"lanche").ok,true);
 assert.equal(s.food,8);
 assert.equal(Food.available(s,"tomato"),5);
 assert.equal(s.foodLedger.generic,3);
});
