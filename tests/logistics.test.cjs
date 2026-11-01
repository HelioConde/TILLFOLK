"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const context={window:{}};
for(const path of ["src/crafting.js","src/logistics.js","src/task-orders.js"])
  vm.runInNewContext(fs.readFileSync(path,"utf8"),context,{filename:path});
const L=context.window.TillfolkLogistics;
const C=context.window.TillfolkCrafting;
const O=context.window.TillfolkOrders;
O.setBounds(80,50);
const makeState=()=>L.normalize({
  groundItems:[],chests:[],nextDropId:1,spawn:{x:40,y:25},orders:[],
  crafting:C.normalize(null),inventory:{twigs:0,wood:0,grass:0,stone:0},workers:[]
});
test("o recurso coletado fica no chão, não surge magicamente no estoque",()=>{
  const state=makeState();
  const drop=L.drop(state,12,18,"twigs",1);
  assert.equal(drop.qty,1);
  assert.equal(state.inventory.twigs,0);
  assert.equal(L.available(state,"twigs"),1);
  assert.equal(state.groundItems.length,1);
  L.drop(state,12,18,"twigs",2);
  assert.equal(state.groundItems[0].qty,3);
});
test("construção recebe 10 gravetos em dez entregas normais",()=>{
  const state=makeState();L.drop(state,11,12,"twigs",10);
  const worker={x:10,y:10,skills:[],neg:[]};
  const order={id:"15-15:buildStation",type:"buildStation",x:15,y:15};
  for(let i=0;i<10;i++){
    const job=L.plan(state,order,worker);
    assert.equal(job.qty,1);
    assert.equal(L.collect(state,job),1);
    assert.equal(L.deliver(state,order,job),1);
  }
  assert.equal(L.complete(order),true);
  assert.equal(order.delivered.twigs,10);
  assert.equal(L.available(state,"twigs"),0);
  assert.equal(state.groundItems.length,0);
  assert.equal(state.inventory.twigs,0);
});
test("habilidade de transporte diminui viagens e três restrições ampliam a capacidade",()=>{
  const state=makeState();L.drop(state,2,2,"twigs",10);
  const specialist={x:1,y:1,skills:["carry"],neg:["till","sow","water"]};
  const regular={x:1,y:1,skills:[],neg:[]};
  assert.equal(L.capacity(regular),1);
  assert.equal(L.capacity(specialist),7);
  const task={id:"20-20:buildStation",type:"buildStation",x:20,y:20};
  assert.equal(L.plan(state,task,specialist).qty,7);
});
test("baú premium recebe carga física, conserva quantidade e fornece itens para obra",()=>{
  const state=makeState();
  state.chests=[{x:8,y:8,items:{}}];L.drop(state,2,3,"grass",5);
  const worker={x:2,y:3,skills:["carry"],neg:[]};
  const job=L.planStorage(state,worker);
  assert.equal(job.destination.x,8);
  assert.equal(L.collect(state,job),4);
  assert.equal(L.deliver(state,null,job),4);
  assert.equal(state.chests[0].items.grass,4);
  assert.equal(L.available(state,"grass"),5);
  const build={type:"buildChest",x:15,y:18,delivered:{twigs:8,grass:0}};
  const next=L.plan(state,build,worker);
  assert.equal(next.kind,"grass");
  L.collect(state,next);L.deliver(state,build,next);
  assert.equal(build.delivered.grass,3);
  assert.equal(state.chests[0].items.grass,1);
  assert.equal(L.complete(build),true);
});
test("cancelamento devolve recursos entregues ao mapa e mantém IDs únicos após reload",()=>{
  const state=makeState(),order={x:9,y:10,type:"buildHome",delivered:{wood:5}};
  L.refund(state,order);
  assert.equal(L.available(state,"wood"),5);
  assert.equal(state.groundItems[0].x,9);
  assert.equal(Object.keys(order.delivered).length,0);
  const reloaded=L.normalize(JSON.parse(JSON.stringify(state)));
  reloaded.nextDropId=1;
  const added=L.drop(reloaded,10,10,"stone",1);
  assert.notEqual(added.id,state.groundItems[0].id);
});
test("ordem de construção usa pilhas no chão sem exigir estoque mágico",()=>{
  const state=makeState(),plot={x:20,y:20};
  const order={type:"buildStation",x:20,y:20};
  assert.equal(O.status(order,plot,null,state).state,"blocked");
  L.drop(state,10,10,"twigs",10);
  assert.equal(O.status(order,plot,null,state).state,"ready");
  assert.equal(fs.existsSync("public/assets/Sprout Lands - Sprites - premium pack/Sprout Lands - Sprites - premium pack/Tilesets/Building parts/Chest.png"),true);
});
