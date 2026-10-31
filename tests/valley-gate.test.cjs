"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
global.window={};
require("../src/biomes.js");
require("../src/wild-world.js");
const World=window.TillfolkWild,Biomes=window.TillfolkBiomes;
const directions=[[1,0],[-1,0],[0,1],[0,-1]];
function canExplorePastOldBorder(world){
  const queue=[[40,25]],visited=new Set(["40,25"]);
  for(let i=0;i<queue.length;i++){
    const [px,py]=queue[i];
    if(px>53)return true;
    for(const [dx,dy] of directions){
      const nx=px+dx,ny=py+dy,id=nx+","+ny;
      if(visited.has(id)||World.blocked(world,nx,ny,80,50))continue;
      visited.add(id);queue.push([nx,ny]);
    }
  }
  return false;
}

test("o mundo inicial não gera anel de colinas nem bloqueia a expansão",()=>{
  for(let seed=0;seed<30;seed++){
    const world=World.create(seed*719+13,80,50);
    assert.equal(world.boundary,undefined);
    assert.equal(world.objects.some(o=>o.kind==="ridge"||o.kind==="gateLog"),false);
    assert.equal(world.biomeMap,Biomes.generate(world.seed,80,50),"não cria uma clareira retangular");
    assert.equal(canExplorePastOldBorder(world),true,"há caminho para além da antiga muralha");
  }
});

test("saves com o antigo vale fechado são abertos sem perder recursos",()=>{
  const seed=51,world=World.create(seed,80,50),region=World.valleyBounds(80,50);
  const original=Biomes.generate(seed,80,50),cells=original.split("");
  world.objects=world.objects.filter(o=>!World.ringTile(region,o.x,o.y));
  world.water=world.water.filter(o=>!World.ringTile(region,o.x,o.y));
  for(let y=region.top+1;y<region.bottom;y++)for(let x=region.left+1;x<region.right;x++)
    cells[y*80+x]="g";
  world.biomeMap=cells.join("");
  world.boundary=region;
  for(let y=region.top;y<=region.bottom;y++)for(let x=region.left;x<=region.right;x++){
    if(!World.ringTile(region,x,y))continue;
    world.objects.push({x,y,kind:x===region.gate.x&&y===region.gate.y?"gateLog":"ridge",variant:0,age:0});
  }
  const resource=world.objects.find(o=>o.kind==="tree");
  assert.ok(resource,"save fixture contains a resource to preserve");

  World.removeValleyEnclosure(world);

  assert.equal(world.boundary,undefined);
  assert.equal(world.objects.some(o=>o.kind==="ridge"||o.kind==="gateLog"),false);
  assert.ok(world.objects.includes(resource),"existing resources remain intact");
  assert.equal(world.biomeMap,original,"the old rectangular grass patch is restored to natural biomes");
  assert.equal(World.blocked(world,region.gate.x,region.gate.y,80,50),false);
});
