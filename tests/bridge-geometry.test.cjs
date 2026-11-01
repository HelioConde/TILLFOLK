"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
global.window={};
require("../src/terrain-autotile.js");
require("../src/terrain-catalog.js");
require("../src/biomes.js");
require("../src/wild-world.js");

const World=window.TillfolkWild,WIDTH=192,HEIGHT=120;
const pos=(x,y)=>x+","+y;
const directions=[[1,0],[-1,0],[0,1],[0,-1]];
const seeds=[1,4,13,45,73,143,172,301,719,1129,2026,2170];
function reachable(world){
  const cx=Math.floor(world.width/2),cy=Math.floor(world.height/2);
  const queue=[[cx,cy]],seen=new Set([pos(cx,cy)]),biomes=new Set();
  for(let i=0;i<queue.length;i++){
    const [x,y]=queue[i];biomes.add(World.biomeAt(world,x,y));
    for(const [dx,dy] of directions){
      const nx=x+dx,ny=y+dy,k=pos(nx,ny);
      if(seen.has(k)||World.blocked(world,nx,ny,world.width,world.height))continue;
      seen.add(k);queue.push([nx,ny]);
    }
  }
  return {tiles:seen,biomes};
}
function inspectBridges(world){
  const water=new Set(world.water.map(o=>pos(o.x,o.y)));
  const bridges=new Map();
  for(const crossing of world.crossings){
    assert.ok(water.has(pos(crossing.x,crossing.y)),"ponte fora da água");
    assert.equal(World.bridgeAt(world,crossing.x,crossing.y),true);
    assert.equal(World.blocked(world,crossing.x,crossing.y,world.width,world.height),false);
    assert.ok(["horizontal","vertical"].includes(crossing.axis),"eixo inválido");
    assert.ok(crossing.bridgeId,"trecho da ponte não identificado");
    if(!bridges.has(crossing.bridgeId))bridges.set(crossing.bridgeId,[]);
    bridges.get(crossing.bridgeId).push(crossing);
  }
  assert.ok(bridges.size>=5,"cada continente exige travessia real");
  for(const [id,tiles] of bridges){
    assert.ok(tiles.length>=1&&tiles.length<=4,"ponte longa sobre lago: "+id);
    assert.equal(new Set(tiles.map(o=>o.axis)).size,1,"ponte em zigue-zague: "+id);
    if(tiles[0].axis==="horizontal")assert.equal(new Set(tiles.map(o=>o.y)).size,1);
    else assert.equal(new Set(tiles.map(o=>o.x)).size,1);
    for(let i=1;i<tiles.length;i++)
      assert.equal(Math.abs(tiles[i].x-tiles[i-1].x)+
        Math.abs(tiles[i].y-tiles[i-1].y),1,"escada ou buraco em "+id);
    const {axis}=tiles[0],dx=axis==="horizontal"?1:0,dy=axis==="vertical"?1:0;
    const before={x:tiles[0].x-dx,y:tiles[0].y-dy};
    const after={x:tiles.at(-1).x+dx,y:tiles.at(-1).y+dy};
    for(const bank of [before,after]){
      assert.equal(water.has(pos(bank.x,bank.y)),false,"a ponte não tem uma margem seca");
      assert.equal(World.blocked(world,bank.x,bank.y,world.width,world.height),false,
        "a ponte termina em árvore ou rocha");
    }
  }
  return bridges.size;
}
test("12 sementes: pontes curtas, retas e com margens livres, sem escadas no lago",()=>{
  for(const seed of seeds){
    const world=World.create(seed,WIDTH,HEIGHT);
    assert.equal(world.crossingsVersion,2);
    assert.ok(inspectBridges(world)>=5,"seed "+seed);
    const {biomes}=reachable(world);
    assert.deepEqual([...biomes].sort(),["f","g","i","p","s","w"],
      "continente ficou inacessível: "+seed);
  }
});
test("pontes mantêm caminhos entre seis biomas em mapas menores",()=>{
  for(const seed of [13,719,2170]){
    const world=World.create(seed,128,80);
    inspectBridges(world);
    assert.deepEqual([...reachable(world).biomes].sort(),["f","g","i","p","s","w"]);
  }
});
test("reparo em save antigo não altera água, objetos ou qualquer tile do terreno",()=>{
  const world=World.create(2170,WIDTH,HEIGHT);
  const waterBefore=JSON.stringify(world.water);
  const objectsBefore=JSON.stringify(world.objects);
  const biomesBefore=world.biomeMap;
  // Simula a sequência antiga de pontes diagonais da captura enviada.
  world.crossings=[{x:100,y:55,axis:"vertical"},
    {x:101,y:55,axis:"horizontal"},
    {x:101,y:54,axis:"vertical"},
    {x:102,y:54,axis:"horizontal"}];
  world.crossingsVersion=1;
  assert.equal(World.repairCrossings(world),true);
  inspectBridges(world);
  assert.equal(world.biomeMap,biomesBefore,"tilemap alterado!");
  assert.equal(JSON.stringify(world.water),waterBefore,"água modificada!");
  assert.equal(JSON.stringify(world.objects),objectsBefore,"objetos removidos!");
  assert.equal(World.repairCrossings(world),false,"reparo repetido desnecessariamente");
  assert.deepEqual([...reachable(world).biomes].sort(),["f","g","i","p","s","w"]);
});
test("novo save não reapresenta pontes em zigue-zague depois de JSON reload",()=>{
  const save=JSON.parse(JSON.stringify(World.create(719,WIDTH,HEIGHT)));
  assert.equal(World.repairCrossings(save),false);
  inspectBridges(save);
  assert.deepEqual([...reachable(save).biomes].sort(),["f","g","i","p","s","w"]);
});
