const assert = require("node:assert/strict");
const Survival = require("../src/survival.js");

function worker(name, satiety = 100, health = 100) {
  return Survival.normalizeWorker({id:name,name,satiety,health});
}

{
  const person=worker("A",0);
  const game={mode:"survival",food:0,workers:[person]};
  Survival.advance(game,Survival.STARVATION_GRACE_MINUTES);
  assert.equal(person.health,100);
  assert.equal(person.starvationMinutes,Survival.STARVATION_GRACE_MINUTES);
  Survival.advance(game,1440);
  assert.equal(person.health,90);
  assert.equal(Survival.workMultiplier(person),0.75);
  assert.equal(Survival.advance(game,9*1440).some(event=>event.type==="critical"),true);
  assert.equal(person.health,0);
}

{
  const dead=worker("A",0,0);
  Object.assign(dead,{
    task:"12-8:till",progress:0.6,carryingWater:true,carryingManure:true,
    inventory:{tools:{axe:true},items:{wood:2}}
  });
  const survivor=worker("B");
  survivor.inventory={tools:{},items:{}};
  const game={
    food:0,water:0,inventory:{manure:0},workers:[dead,survivor],
    orders:[{id:"12-8:till",type:"till",x:12,y:8}],
    homes:[{x:3,y:3,residentId:"A"}]
  };

  const removed=Survival.removeDeadWorkers(game);
  assert.deepEqual(removed,[dead]);
  assert.deepEqual(game.workers,[survivor]);
  assert.equal(game.orders.length,1);
  assert.equal(dead.task,null);
  assert.equal(dead.progress,0);
  assert.equal(game.water,1);
  assert.equal(game.inventory.manure,1);
  assert.equal(game.homes[0].residentId,null);
  assert.equal(survivor.inventory.tools.axe,true);
  assert.equal(survivor.inventory.items.wood,2);
}

{
  const dead=worker("same-id",0,0);
  const survivor=worker("same-id",60,100);
  const game={food:0,workers:[dead,survivor],inventory:{},orders:[]};
  Survival.removeDeadWorkers(game);
  assert.deepEqual(game.workers,[survivor]);
}

console.log("Saúde, morte e liberação de tarefas: 3 cenários reais aprovados.");
