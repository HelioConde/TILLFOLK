"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm");
const ctx={window:{TillfolkWild:{terrainAt:()=>({farmable:true,name:"Pradaria"})}}};
vm.runInNewContext(fs.readFileSync("src/task-orders.js","utf8"),ctx);
const Orders=ctx.window.TillfolkOrders;
const plot={x:96,y:60,tilled:true,seeded:false,fertilized:false,dirty:false};
const cow={id:1,kind:"cow",x:98.5,y:60.5,wild:false,manure:1};
const rabbit={id:"wild-g-0",kind:"rabbit",x:97.5,y:59.5,wild:true,manure:3};
const state=(animals=[],manure=0)=>({inventory:{manure},animals,world:{seed:23},plots:[plot]});
const fertilize=s=>Orders.status({type:"fertilize",x:96,y:60},plot,null,s);
test("fauna selvagem não desbloqueia fertilização ou coleta de esterco",()=>{
 const s=state([rabbit]);
 const f=fertilize(s);
 assert.equal(f.state,"blocked");
 assert.match(f.reason,/fauna selvagem/i);
 const c=Orders.status({type:"collectManure",x:97,y:59},null,null,s);
 assert.equal(c.state,"blocked");
 assert.match(c.reason,/domésticos/);
});
test("esterco já guardado permite fertilizar mesmo sem animais",()=>{
 const f=fertilize(state([rabbit],1));
 assert.equal(f.state,"ready");
 assert.match(f.reason,/depósito/);
});
test("animal doméstico com esterco libera coleta e fertilização",()=>{
 const s=state([rabbit,cow]);
 const f=fertilize(s);
 assert.equal(f.state,"ready");
 assert.match(f.reason,/doméstico/);
 const collect=Orders.status({type:"collectManure",x:98,y:60},null,null,s);
 assert.equal(collect.state,"ready");
});
test("animal doméstico ainda sem esterco bloqueia até sua produção",()=>{
 const s=state([{...cow,manure:0},rabbit]);
 assert.equal(fertilize(s).state,"blocked");
 assert.match(fertilize(s).reason,/Aguardando animal doméstico/);
 const wrong=Orders.status({type:"collectManure",x:97,y:59},null,null,s);
 assert.equal(wrong.state,"blocked","não se pode selecionar coelho selvagem como produtor");
});
