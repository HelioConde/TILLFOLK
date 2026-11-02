"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");

const context={window:{},Image:class{}};
vm.runInNewContext(fs.readFileSync("src/crop-catalog.js","utf8"),context);
vm.runInNewContext(fs.readFileSync("src/colony-life.js","utf8"),context);
const Crops=context.window.TillfolkCrops;
const Life=context.window.TillfolkColonyLife;
const state=(day)=>({day,world:{seed:127},workers:[],colonyLife:{researchLevel:0}});

test("as 19 espécies têm informações agrícolas consistentes",()=>{
  assert.equal(Crops.ALL.length,19);
  const seasons=["Primavera","Verão","Outono","Inverno"];
  for(const crop of Crops.ALL){
    assert.ok(seasons.includes(crop.favoredSeason),crop.id+" sem estação");
    assert.ok(Number.isInteger(crop.seedYield)&&crop.seedYield>=1&&crop.seedYield<=3,
      crop.id+" precisa devolver sementes inteiras");
    assert.ok(crop.food>=1,"colheita positiva "+crop.id);
    assert.ok(Life.cropDuration(crop.id)>0,"tempo de crescimento "+crop.id);
    assert.equal(Object.isFrozen(crop),true,"metadados imutáveis");
  }
});

test("batata e trigo fazem escolhas diferentes de produção",()=>{
  assert.ok(Crops.get("potato").food>0);
  assert.equal(Crops.get("potato").seedYield,1);
  assert.equal(Crops.get("wheat").seedYield,3);
  assert.equal(Crops.get("wheat").favoredSeason,"Verão");
  assert.ok(Life.cropDuration("wheat")>Life.cropDuration("potato"));
});

test("a estação favorável acelera o crescimento sem gerar recursos",()=>{
  // O clima, a pesquisa e o bioma são iguais dentro de cada comparação.
  assert.equal(Life.season(1),"Primavera");
  assert.equal(Life.season(8),"Verão");
  const spring=state(1),summer=state(8);
  const springBerry=Life.growthMultiplier(spring,"berry");
  const springWheat=Life.growthMultiplier(spring,"wheat");
  const summerWheat=Life.growthMultiplier(summer,"wheat");
  const summerBerry=Life.growthMultiplier(summer,"berry");
  assert.ok(Math.abs(springBerry/springWheat-1.15)<1e-10);
  assert.ok(Math.abs(summerWheat/summerBerry-1.15)<1e-10);
  assert.equal(spring.food,undefined);
  assert.equal(summer.seeds,undefined);
});

test("um save antigo sem traits mantém fallback seguro de crescimento",()=>{
  const s=state(1);
  const original=Life.growthMultiplier(s,"cultura-antiga");
  assert.ok(Number.isFinite(original)&&original>0);
  assert.equal(Crops.get("cultura-antiga"),undefined);
});
