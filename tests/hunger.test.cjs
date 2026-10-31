const assert = require("node:assert/strict");
const Survival = require("../src/survival.js");

function worker(name, satiety = 100, health = 100) {
  return Survival.normalizeWorker({id:name,name,satiety,health});
}

function state(food, workers, mode = "survival") {
  return {mode,day:1,food,workers};
}

{
  const person=worker("A");
  assert.equal(person.satiety,100);
  assert.equal(person.health,100);
  assert.equal(person.hungerState,"fed");
}

{
  const person=worker("A");
  const game=state(0,[person]);
  const events=Survival.advance(game,24*60+1);
  assert.equal(person.hungerState,"hungry");
  assert.ok(person.satiety<30);
  assert.ok(events.some(event=>event.type==="warning"));
  assert.ok(events.some(event=>event.type==="hungry"));
}

{
  const person=worker("A",20);
  const game=state(1,[person]);
  assert.equal(Survival.tryEat(game,person),true);
  assert.equal(game.food,0);
  assert.equal(person.satiety,90);
  assert.equal(person.hungerState,"fed");
  assert.equal(person.starvationMinutes,0);
}

{
  const first=worker("A",20);
  const second=worker("B",20);
  const game=state(1,[first,second]);
  assert.equal(Survival.tryEat(game,first),true);
  assert.equal(Survival.tryEat(game,second),false);
  assert.equal(game.food,0);
  assert.ok(game.food>=0);
}

{
  const person=worker("A",0);
  const game=state(3,[person],"relaxed");
  Survival.advance(game,1440);
  assert.equal(Survival.tryEat(game,person),false);
  assert.equal(person.satiety,0);
  assert.equal(game.food,3);
}

console.log("Sistema de fome: 5 cenários reais aprovados.");
