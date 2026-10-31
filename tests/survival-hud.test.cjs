const assert = require("node:assert/strict");
const Survival = require("../src/survival.js");

function worker(id, name, satiety = 100, health = 100) {
  return Survival.normalizeWorker({id,name,satiety,health});
}

{
  const game={mode:"survival",food:8,workers:[worker(1,"A"),worker(2,"B")]};
  const stats=Survival.getStats(game);
  assert.equal(stats.population,2);
  assert.equal(stats.food,8);
  assert.equal(stats.consumptionPerDay,2);
  assert.equal(stats.daysRemaining,4);
  assert.equal(stats.alert,"ok");
}

for (const population of [2,3,5]) {
  const game={
    mode:"survival",
    food:8,
    workers:Array.from({length:population},(_,index)=>worker(index,"Colono "+index))
  };
  const stats=Survival.getStats(game);
  assert.equal(stats.consumptionPerDay,population);
  assert.equal(stats.daysRemaining,8/population);
}

{
  const game={mode:"survival",food:8,workers:[worker(1,"Ana",25),worker(2,"Beto")]};
  const stats=Survival.getStats(game);
  assert.equal(stats.hungryCount,1);
  assert.equal(stats.alert,"warning");
  assert.match(stats.alertText,/Ana/);
}

{
  const game={mode:"survival",food:0,workers:[worker(1,"Ana",0,15)]};
  const stats=Survival.getStats(game);
  assert.equal(stats.daysRemaining,0);
  assert.equal(stats.starvingCount,1);
  assert.equal(stats.criticalCount,1);
  assert.equal(stats.alert,"critical");
  assert.match(stats.alertText,/Ana/);
}

{
  const stats=Survival.getStats({mode:"survival",food:8,workers:[]});
  assert.equal(stats.population,0);
  assert.equal(stats.daysRemaining,null);
}

console.log("HUD de sobrevivência: 7 cenários reais aprovados.");
