"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const AI=require("../src/task-assignment.js");
const state=(food=2)=>({food,workers:[{},{}],priorities:{carry:7,harvest:7,water:7,till:7,clear:7}});
const worker={id:1,x:10,y:10,health:100,energy:100,personalPriority:{}};
const task=(id,type,x=11,y=10,priority=7)=>({id,type,x,y,priority,status:"ready"});
test("alimentação crítica favorece transporte e colheita JÁ ORDENADOS",()=>{
 const w={...worker};
 const orders=[task("t1","till"),task("t2","carry"),task("t3","harvest")];
 const ids=AI.rank(w,orders,state(1)).map(x=>x.id);
 assert.deepEqual(ids,["t2","t3","t1"]);
 assert.equal(orders[0].type,"till","não muta a fila de ordens");
});
test("prioridade escolhida pelo jogador continua acima do bônus de urgência",()=>{
 const orders=[task("t1","till",11,10,9),task("t2","carry",11,10,7)];
 assert.equal(AI.rank(worker,orders,state(0))[0].id,"t1");
});
test("especialista ganha na escolha sem poder trabalhar numa proibição",()=>{
 const orders=[task("t1","water"),task("t2","sow")];
 assert.equal(AI.rank(worker,orders,state(20),(_,type)=>type==="water"?3:1)[0].id,"t1");
 // Elegibilidade é calculada fora do ranking, como no motor.
 assert.equal(AI.rank(worker,[orders[1]],state(20))[0].id,"t2");
});
test("tarefas perto ganham de ordens iguais distantes",()=>{
 const orders=[task("far","clear",70,70),task("near","clear",12,12)];
 assert.equal(AI.rank(worker,orders,state(20))[0].id,"near");
});
test("colono exausto tem penalização maior em deslocamentos longos",()=>{
 const far=task("far","clear",100,80);
 const healthy=AI.score(worker,far,state(20));
 const exhausted=AI.score({...worker,energy:15},far,state(20));
 assert.ok(healthy>exhausted);
});
test("IA não gera ordens ou recursos e usa empates determinísticos",()=>{
 const orders=[task("b","clear"),task("a","clear")];
 const snapshot=JSON.stringify(orders);
 assert.deepEqual(AI.rank(worker,orders,state(20)).map(x=>x.id),["a","b"]);
 assert.equal(JSON.stringify(orders),snapshot);
 assert.equal(AI.criticalFood(state(3)),true);
 assert.equal(AI.criticalFood(state(4)),false);
});
