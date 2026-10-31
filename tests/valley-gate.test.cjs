"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
global.window={};
require("../src/biomes.js");
require("../src/wild-world.js");
require("../src/crafting.js");
require("../src/task-orders.js");
const World=window.TillfolkWild,Crafting=window.TillfolkCrafting,Orders=window.TillfolkOrders;
const directions=[[1,0],[-1,0],[0,1],[0,-1]];
function reachable(world,x,y){
  const queue=[[40,25]],visited=new Set(["40,25"]);
  for(let i=0;i<queue.length;i++){
    const [px,py]=queue[i];
    if(px===x&&py===y)return true;
    for(const [dx,dy] of directions){
      const nx=px+dx,ny=py+dy,id=nx+","+ny;
      if(visited.has(id)||World.blocked(world,nx,ny,80,50))continue;
      visited.add(id);queue.push([nx,ny]);
    }
  }
  return false;
}
test("vale fechado: 1 saída, impossível escapar antes de cortar o tronco",()=>{
  for(let seed=0;seed<30;seed++){
    const world=World.create(seed*719+13,80,50);
    assert.ok(world.boundary,"área protegida");
    assert.equal(world.objects.filter(o=>o.kind==="gateLog").length,1);
    assert.equal(reachable(world,60,25),false,"passagem bloqueada antes do machado");
    const gate=world.boundary.gate;
    assert.equal(World.clear(world,gate.x,gate.y).blocked,true,"corte manual proibido");
    assert.equal(World.blocked(world,gate.x,gate.y,80,50),true);
    assert.equal(World.clear(world,gate.x,gate.y,{axe:true}).resource,"4 madeiras");
    assert.equal(world.boundary.open,true);
    assert.equal(reachable(world,60,25),true,"novo corredor livre depois de cortar");
  }
});
test("recursos do primeiro machado existem dentro da área fechada",()=>{
  for(const seed of [1,7,51,9987]){
    const world=World.create(seed,80,50),r=world.boundary;
    for(const [kind,min] of [["twig",52],["grass",28],["pebble",10]]){
      const count=world.objects.filter(o=>o.kind===kind&&
        o.x>r.left+1&&o.x<r.right-1&&o.y>r.top+1&&o.y<r.bottom-1).length;
      assert.ok(count>=min,kind+" dentro da área jogável");
    }
  }
});
test("o machado comum abre a passagem quando fabricado na oficina",()=>{
  const state={crafting:Crafting.normalize(null),inventory:{twigs:40,grass:3,stone:3}};
  const gate={kind:"gateLog"};
  assert.ok(Crafting.blocked(state,"clear",gate));
  assert.ok(Crafting.craft(state,"axe").error);
  state.crafting.station={x:40,y:29};
  assert.equal(Crafting.craft(state,"stoneAxe").item.key,"axe");
  assert.equal(Crafting.blocked(state,"clear",gate),null);
  const order={type:"clear",x:53,y:25};
  assert.equal(Orders.status(order,{x:53,y:25,dirty:false},gate,state).state,"ready");
  assert.equal(Orders.status(order,{x:53,y:25,dirty:false},{kind:"ridge"},state).state,"blocked");
});
test("ampliação de saves antigos não cria anel sobre construções",()=>{
  const legacy=World.create(16,28,18);
  const expanded=World.expand(legacy,80,50,28,18);
  assert.equal(expanded.boundary,undefined);
  assert.equal(expanded.objects.some(o=>o.kind==="ridge"||o.kind==="gateLog"),false);
});
