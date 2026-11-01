"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm");
const context={window:{}};
vm.runInNewContext(fs.readFileSync("src/colony-life.js","utf8"),context);
const Life=context.window.TillfolkColonyLife;
const state=()=>({day:1,minutes:480,mode:"survival",
 world:{seed:1234},food:20,plots:[],homes:[],animals:[],
 crafting:{station:{x:11,y:11}},
 workers:[{id:1,name:"Sim",satiety:100,energy:100,morale:75,resting:false}]});
test("estado antigo recebe energia e moral sem perder a partida",()=>{
 const s=state();delete s.workers[0].energy;
 Life.normalize(s);
 assert.equal(s.workers[0].energy,100);
 assert.equal(s.workers[0].morale,75);
 assert.equal(s.colonyLife.autoFarm,false);
 assert.equal(Life.season(1),"Primavera");
 assert.equal(Life.season(8),"Verão");
});
test("cansaço cresce com trabalho e descanso regenera energia",()=>{
 const s=state(),w=s.workers[0];w.task="10-12:till";
 Life.advance(s,60);
 assert.ok(w.energy<100);
 w.task=null;w.resting=true;w.atRest=true;
 const before=w.energy;
 Life.advance(s,60);
 assert.ok(w.energy>before);
 w.energy=16;w.resting=false;
 assert.equal(Life.sleepRequired(w,9*60),true);
 w.energy=54;w.resting=false;
 assert.equal(Life.sleepRequired(w,22*60),true);
 assert.equal(Life.sleepRequired(w,14*60),false);
});
test("moral varia conforme moradia, energia e fome",()=>{
 const s=state();s.workers[0].energy=22;s.workers[0].satiety=10;
 Life.advance(s,60);const low=s.workers[0].morale;
 s.homes=[{x:10,y:10,residentId:1}];
 s.workers[0].energy=100;s.workers[0].satiety=100;
 Life.advance(s,60);
 assert.ok(s.workers[0].morale>low);
});
test("cultura tem tempo distinto e chuva irriga sem produzir água no estoque",()=>{
 assert.ok(Life.cropDuration("pumpkin")>Life.cropDuration("potato"));
 const s=state();s.plots=[{x:7,y:7,seeded:true,watered:false,growth:0}];
 const rainy=Array.from({length:30},(_,i)=>i+1).find(d=>Life.weather(d,s.world.seed)==="chuva");
 assert.ok(rainy);
 s.day=rainy;s.water=0;
 Life.advance(s,20);
 assert.equal(s.plots[0].watered,true);
 assert.equal(s.water,0);
});
test("colheitas produzem pesquisa, mas pesquisa exige pontos e estação",()=>{
 const s=state();
 assert.match(Life.research(s).error,/pontos/);
 Life.discover(s,5);
 assert.equal(Life.research(s).level,1);
 assert.equal(s.colonyLife.researchPoints,0);
 const improvement=Life.growthMultiplier(s,"potato");
 s.colonyLife.researchLevel=0;
 assert.ok(improvement>Life.growthMultiplier(s,"potato"));
});
test("automação não começa ligada e respeita o intervalo",()=>{
 const s=state();
 assert.equal(Life.canAutomate(s,100),false);
 Life.normalize(s).autoFarm=true;
 assert.equal(Life.canAutomate(s,100),true);
 assert.equal(Life.canAutomate(s,105),false);
 assert.equal(Life.canAutomate(s,111),true);
});
test("alimentos estragam gradualmente sem ficar negativos",()=>{
 const s=state();s.food=200;
 for(let i=0;i<25;i++)Life.advance(s,60);
 assert.ok(s.food<200&&s.food>=0);
 s.food=0;
 Life.advance(s,60);
 assert.equal(s.food,0);
});
test("criação de animais exige casal adulto, tempo e alimento",()=>{
 const s=state();s.day=11;s.food=12;
 s.animals=[{x:10,y:10,age:10},{x:11,y:10,age:10}];
 assert.equal(Life.animalBirths(s),1);
 assert.equal(s.animals.length,3);
 assert.equal(s.food,10);
 assert.equal(Life.animalBirths(s),0);
});
