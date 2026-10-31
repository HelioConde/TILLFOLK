"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
global.window={};
require("../src/biomes.js");
require("../src/wild-world.js");
const World=window.TillfolkWild;
const directions=[[1,0],[-1,0],[0,1],[0,-1]];

function waterComponents(world){
  const remaining=new Set(world.water.map(tile=>tile.x+","+tile.y));
  let components=0;
  while(remaining.size){
    components++;
    const first=remaining.values().next().value,queue=[first];
    remaining.delete(first);
    for(let i=0;i<queue.length;i++){
      const [x,y]=queue[i].split(",").map(Number);
      for(const [dx,dy] of directions){
        const next=(x+dx)+","+(y+dy);
        if(remaining.delete(next))queue.push(next);
      }
    }
  }
  return components;
}

test("lagoa e curso d'água formam um único corpo conectado em mapas gerados",()=>{
  for(let seed=0;seed<30;seed++){
    const world=World.create(seed*719+13,80,50);
    assert.ok(world.water.length>0,"o mapa contém água");
    assert.equal(waterComponents(world),1,"a água não deve ficar cortada (seed "+world.seed+")");
    const water=new Set(world.water.map(tile=>tile.x+","+tile.y));
    for(let y=1;y<world.height-1;y++)for(let x=1;x<world.width-1;x++){
      const gap=!water.has(x+","+y)&&
        ((water.has((x-1)+","+y)&&water.has((x+1)+","+y))||
          (water.has(x+","+(y-1))&&water.has(x+","+(y+1))));
      assert.equal(gap,false,"não pode sobrar faixa seca entre margens (seed "+world.seed+")");
    }
  }
});

test("a água preenche uma faixa de terra estreita entre duas margens",()=>{
  const world={version:2,seed:1,width:12,height:10,objects:[],water:[]};
  for(let y=2;y<=7;y++){
    world.water.push({x:4,y},{x:6,y});
  }

  World.connectWater(world);

  for(let y=2;y<=7;y++)
    assert.equal(World.waterAt(world,5,y),true,"a faixa seca em y="+y+" deve virar água");
});

test("saves antigos conectam trechos de água sem cobrir objetos ocupados",()=>{
  const world=World.create(2170,80,50);
  world.water.push({x:34,y:28},{x:35,y:28},{x:36,y:28},{x:35,y:27},{x:35,y:29});
  world.objects.push({x:40,y:25,kind:"tree",variant:0,age:0});
  const protectedTiles=[{x:41,y:25}];

  const added=World.connectWater(world,protectedTiles);

  assert.ok(added>0,"o save recebe as tiles que faltavam para unir a água");
  assert.equal(waterComponents(world),1);
  assert.equal(World.waterAt(world,40,25),false);
  assert.equal(World.waterAt(world,41,25),false);
  const waterCount=world.water.length;
  assert.equal(World.connectWater(world,protectedTiles),0,"a migração é idempotente");
  assert.equal(world.water.length,waterCount,"a migração não duplica água");
});
