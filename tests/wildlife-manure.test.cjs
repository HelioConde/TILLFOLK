"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm");
const context={window:{}};
vm.runInNewContext(fs.readFileSync("src/task-orders.js","utf8"),context);
const Orders=context.window.TillfolkOrders;
const plot={x:13,y:11,tilled:true,fertilized:false,seeded:false,dirty:false};
const wild=[{x:16.5,y:9.5,kind:"cow",wild:true,manure:0}];
const animal={x:17.5,y:9.5,kind:"cow",manure:1,placedByPlayer:true};
const base={animals:wild,inventory:{manure:0},world:{seed:23}};
test("fauna selvagem aparece na cena mas não desbloqueia fertilização",()=>{
 const result=Orders.status({type:"fertilize",x:13,y:11},plot,null,base);
 assert.equal(result.state,"blocked");
 assert.match(result.reason,/Sem animais de criação/);
 assert.equal(Orders.status({type:"collectManure",x:16,y:9},plot,null,base).state,"blocked");
});
test("animal domesticado produz esterco quando disponível",()=>{
 const state={...base,animals:[...wild,animal]};
 const fertilize=Orders.status({type:"fertilize",x:13,y:11},plot,null,state);
 assert.equal(fertilize.state,"ready");
 assert.match(fertilize.reason,/Buscar esterco/);
 const manure=Orders.status({type:"collectManure",x:17,y:9},plot,null,state);
 assert.equal(manure.state,"ready");
});
test("animais de criação sem esterco bloqueiam, sem usar a fauna como recurso",()=>{
 const state={...base,animals:[...wild,{...animal,manure:0}]};
 const result=Orders.status({type:"fertilize",x:13,y:11},plot,null,state);
 assert.equal(result.state,"blocked");
 assert.match(result.reason,/Aguardando animal de criação/);
});
