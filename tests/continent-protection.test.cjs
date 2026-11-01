"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
global.window={};
require("../src/terrain-autotile.js");
require("../src/terrain-catalog.js");
require("../src/biomes.js");
require("../src/wild-world.js");
require("../src/exploration.js");
require("../src/crafting.js");
require("../src/colony-life.js");

const Biomes=window.TillfolkBiomes,World=window.TillfolkWild;
const Exploration=window.TillfolkExploration,Crafting=window.TillfolkCrafting;
const Life=window.TillfolkColonyLife;
const W=192,H=120;
const DIRECTIONS=[[1,0],[-1,0],[0,1],[0,-1]];
const at=(x,y)=>x+","+y;

test("o novo mapa é 192x120, tem seis regiões e ilha central ampliada",()=>{
  for(const seed of [1,13,2170,719]){
    const world=World.create(seed,W,H);
    assert.deepEqual([world.width,world.height],[W,H]);
    assert.equal(world.biomeMap.length,W*H);
    for(const biome of Object.keys(Biomes.TYPES))
      assert.ok(world.biomeMap.includes(biome),"bioma ausente: "+biome);
    for(let y=H/2-16;y<=H/2+16;y++)for(let x=W/2-18;x<=W/2+18;x++){
      assert.equal(Biomes.kind(world,x,y),"g","ilha central precisa ser pradaria");
    }
    const water=new Set(world.water.map(p=>at(p.x,p.y)));
    assert.ok(world.crossings.length>4);
    for(const crossing of world.crossings)
      assert.ok(water.has(at(crossing.x,crossing.y)),"ponte sem rio");
  }
});

test("fauna tem sprites locais e nasce apenas fora do santuário, sem esterco",()=>{
  for(const seed of [1,13,2170,719,1129]){
    const world=World.create(seed,W,H);
    const animals=Exploration.spawn(world,world.objects);
    assert.ok(animals.length>=20);
    assert.ok(new Set(animals.map(a=>a.biome)).size>=5);
    for(const a of animals){
      assert.equal(a.wild,true);
      assert.equal(a.manure,0);
      assert.equal(Exploration.insideSanctuary(world,Math.floor(a.x),Math.floor(a.y)),false);
      assert.equal(Biomes.kind(world,Math.floor(a.x),Math.floor(a.y)),a.biome);
      assert.equal(World.waterAt(world,Math.floor(a.x),Math.floor(a.y)),false);
      assert.equal(World.at(world,Math.floor(a.x),Math.floor(a.y)),null);
      assert.ok(Exploration.speciesUrl(a.kind)?.startsWith("./public/assets/"));
    }
    const before=animals.map(a=>({x:a.x,y:a.y,biome:a.biome}));
    for(let i=0;i<12;i++)Exploration.step(animals,world,8,(x,y)=>Boolean(World.at(world,x,y)));
    for(let i=0;i<animals.length;i++){
      const a=animals[i];
      assert.equal(Exploration.insideSanctuary(world,Math.floor(a.x),Math.floor(a.y)),false);
      assert.equal(Biomes.kind(world,Math.floor(a.x),Math.floor(a.y)),before[i].biome);
      assert.equal(World.waterAt(world,Math.floor(a.x),Math.floor(a.y)),false);
    }
  }
});

test("cada continente exige proteção distinta e só libera acesso ao portador",()=>{
  const world=World.create(2170,W,H);
  const worker={inventory:{tools:{},items:{}}};
  const state={crafting:{station:{x:96,y:60},equipment:{}},workers:[worker]};
  for(const id of ["f","s","i","w","p"]){
    const index=world.biomeMap.indexOf(id),x=index%W,y=Math.floor(index/W);
    const area=Exploration.requirement(world,x,y);
    assert.ok(area.gear,"proteção ausente: "+id);
    assert.ok(Crafting.recipe(area.gear),"receita não encontrada: "+area.gear);
    assert.match(Exploration.blocker(worker,world,x,y),/Precisa de/);
    const result=Crafting.craft(state,area.gear,worker,true);
    assert.equal(result.error,undefined);
    assert.equal(Exploration.blocker(worker,world,x,y),null);
  }
  assert.equal(new Set(Object.values(Exploration.PROTECTION).filter(p=>p.gear).map(p=>p.gear)).size,5);
  assert.equal(Exploration.blocker({inventory:{tools:{}}},world,W/2,H/2),null);
});

test("animais selvagens não geram reprodução de fazenda nem consomem alimentos",()=>{
  const world=World.create(2170,W,H);
  const animals=Exploration.spawn(world,world.objects);
  const state={day:12,food:50,animals,workers:[],colonyLife:{}};
  Life.normalize(state);
  assert.equal(Life.animalBirths(state),0);
  assert.equal(state.food,50);
  assert.equal(state.animals.length,animals.length);
});

test("migrar save 128x80 mantém as coordenadas dos objetos e rios antigos",()=>{
  const old=World.create(13,128,80),originalMap=old.biomeMap;
  const originalObjects=old.objects.map(p=>at(p.x,p.y));
  const originalWater=old.water.map(p=>at(p.x,p.y));
  const grown=World.expand(old,W,H,128,80);
  for(let y=0;y<80;y++)for(let x=0;x<128;x++)
    assert.equal(grown.biomeMap[y*W+x],originalMap[y*128+x]);
  const found=new Set(grown.objects.map(p=>at(p.x,p.y)));
  for(const item of originalObjects)assert.ok(found.has(item),"objeto perdido: "+item);
  const water=new Set(grown.water.map(p=>at(p.x,p.y)));
  for(const item of originalWater)assert.ok(water.has(item),"água perdida: "+item);
});
