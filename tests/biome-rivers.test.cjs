"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
global.window={};
require("../src/terrain-autotile.js");
require("../src/terrain-catalog.js");
require("../src/biomes.js");
require("../src/wild-world.js");

const Biomes=window.TillfolkBiomes;
const World=window.TillfolkWild;
const W=128,H=80;
const DIRECTIONS=[[1,0],[-1,0],[0,1],[0,-1]];
const key=(x,y)=>x+","+y;

function reachable(world){
  const start=key(Math.floor(world.width/2),Math.floor(world.height/2));
  const queue=[start],visited=new Set(queue);
  for(let index=0;index<queue.length;index++){
    const [x,y]=queue[index].split(",").map(Number);
    for(const [dx,dy] of DIRECTIONS){
      const nx=x+dx,ny=y+dy,id=key(nx,ny);
      if(visited.has(id)||World.blocked(world,nx,ny,world.width,world.height))continue;
      visited.add(id);queue.push(id);
    }
  }
  return visited;
}

test("mapa 128x80 distribui seis biomas e separa todas as fronteiras com água",()=>{
  for(const seed of [13,719,2170,1129]){
    const world=World.create(seed,W,H);
    assert.deepEqual([world.width,world.height],[W,H]);
    assert.equal(world.biomeMap.length,W*H);
    assert.equal(world.version,3);
    const water=new Set(world.water.map(tile=>key(tile.x,tile.y)));
    assert.equal(water.size,world.water.length,"sem duplicar células de água");
    assert.equal(Biomes.kind(world,W/2,H/2),"g","clareira inicial preservada");
    for(const id of Object.keys(Biomes.TYPES))
      assert.ok(world.biomeMap.includes(id),"bioma não encontrado: "+id);
    let boundaries=0;
    for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){
      const id=Biomes.kind(world,x,y);
      for(const [dx,dy] of [[1,0],[0,1]]){
        const nx=x+dx,ny=y+dy;
        if(nx>=W-1||ny>=H-1||id===Biomes.kind(world,nx,ny))continue;
        boundaries++;
        assert.ok(water.has(key(x,y))&&water.has(key(nx,ny)),
          "falta rio entre biomas em "+key(x,y)+" / "+key(nx,ny));
      }
    }
    assert.ok(boundaries>100,"rios acompanham as fronteiras naturais");
  }
});

test("a água continua conectada e pontes permitem explorar os cinco biomas",()=>{
  for(const seed of [13,2170,719,4,1129]){
    const world=World.create(seed,W,H);
    const waters=new Set(world.water.map(tile=>key(tile.x,tile.y)));
    const remaining=new Set(waters),first=remaining.values().next().value;
    const queue=[first];remaining.delete(first);
    for(let i=0;i<queue.length;i++){
      const [x,y]=queue[i].split(",").map(Number);
      for(const [dx,dy] of DIRECTIONS){
        const id=key(x+dx,y+dy);
        if(remaining.delete(id))queue.push(id);
      }
    }
    assert.equal(remaining.size,0,"nenhum trecho de rio desconectado");
    assert.ok(world.crossings.length>=5,"as travessias são geradas");
    for(const crossing of world.crossings){
      assert.ok(World.waterAt(world,crossing.x,crossing.y),"ponte sobre água");
      assert.ok(World.bridgeAt(world,crossing.x,crossing.y),"ponte reconhecida");
      assert.equal(World.blocked(world,crossing.x,crossing.y,W,H),false,"ponte caminhável");
    }
    const explored=reachable(world);
    const visited=new Set([...explored].map(pos=>{
      const [x,y]=pos.split(",").map(Number);
      return World.biomeAt(world,x,y);
    }));
    for(const biome of Object.keys(Biomes.TYPES))
      assert.ok(visited.has(biome),"ponte não dá acesso a bioma: "+biome);
  }
});

test("expandir saves 80x50 preserva biomas, recursos e água; moderniza as pontes",()=>{
  const legacy=World.create(2170,80,50);
  const originalObjects=legacy.objects.map(p=>key(p.x,p.y));
  const originalWater=new Set(legacy.water.map(p=>key(p.x,p.y)));
  const originalMap=legacy.biomeMap;
  const expanded=World.expand(legacy,W,H,80,50);
  assert.equal(expanded.biomeMap.length,W*H);
  for(let y=0;y<50;y++)for(let x=0;x<80;x++)
    assert.equal(Biomes.kind(expanded,x,y),originalMap[y*80+x],
      "terreno legado alterado em "+key(x,y));
  const newObjects=new Set(expanded.objects.map(p=>key(p.x,p.y)));
  for(const id of originalObjects)assert.ok(newObjects.has(id),"recurso antigo desapareceu: "+id);
  for(const id of originalWater)assert.ok(World.waterAt(expanded,...id.split(",").map(Number)),
    "água antiga desapareceu: "+id);
  assert.equal(expanded.crossingsVersion,2,"pontes precisam ser recalculadas");
  assert.ok(expanded.crossings.length>=5,"expansão mantém os biomas conectados");
  for(const crossing of expanded.crossings){
    assert.ok(World.waterAt(expanded,crossing.x,crossing.y),"ponte somente sobre água");
    assert.ok(["vertical","horizontal"].includes(crossing.axis));
  }
});
