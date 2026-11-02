"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm");
const context={window:{},Image:class{}};
for(const name of ["crop-catalog","crop-care","task-orders","irrigation-orders","colony-life"]){
 vm.runInNewContext(fs.readFileSync("src/"+name+".js","utf8"),context,{filename:name+".js"});
}
const W=context.window, Care=W.TillfolkCropCare,Orders=W.TillfolkOrders,
  Batch=W.TillfolkIrrigationOrders,Life=W.TillfolkColonyLife;
Orders.setBounds(192,120);
const fresh=(x,y,crop="pumpkin")=>{
 const plot={x,y,tilled:true,seeded:false,watered:false,waterings:0,growth:0,produce:false};
 Care.sow(plot,crop);
 return plot;
};
const state=(plots,water=10)=>({plots,orders:[],workers:[{id:1,neg:[]}],
 water,world:{seed:4433,water:[]},inventory:{},cropSeeds:{},seeds:0});
test("lote só cria ordens para canteiros sedentos, sem repetição ou água grátis",()=>{
 const thirsty=fresh(12,13),wet=fresh(13,13),ripe=fresh(14,13);
 Care.irrigate(wet);
 for(let i=0;i<3;i++){Care.irrigate(ripe);Care.advance(ripe,1);}
 const s=state([thirsty,wet,ripe]);
 const before=JSON.stringify(s);
 const planned=Batch.plan(s);
 assert.equal(planned.needing,1);assert.equal(planned.ready.length,1);
 assert.equal(JSON.stringify(s),before,"planejamento jamais altera o save");
 const done=Batch.queue(s);
 assert.equal(done.added,1);
 assert.equal(s.orders.length,1);
 assert.equal(s.orders[0].id,Orders.id("water",12,13));
 assert.equal(s.water,10);
 assert.equal(Batch.queue(s).added,0);
 assert.equal(s.orders.length,1);
});
test("ordem não oferece rega em cultivo maduro, mesmo se estiver seco",()=>{
 const plot=fresh(12,12);
 plot.growth=1;plot.watered=false;
 const s=state([plot]);
 assert.equal(Orders.status({type:"water",x:12,y:12},plot,null,s).state,"done");
 const p=Batch.plan(s);
 assert.equal(p.needing,0);
 assert.equal(p.ready.length,0);
});
test("limites reais: sem ferramenta, água, trabalhador ou fonte não gera ordem",()=>{
 const p=fresh(12,12),s=state([p],0);
 assert.equal(Batch.queue(s).added,0);
 assert.match(Batch.plan(s).reason,/água/i);
 s.water=10;s.workers=[{id:1,neg:["water"]}];
 assert.equal(Batch.queue(s).added,0);
 assert.equal(s.orders.length,0);
});
test("lote respeita limite 40 e teto de 1500 ordens, sem alterações implícitas",()=>{
 const plots=Array.from({length:85},(_,i)=>fresh(2+i%17,2+Math.floor(i/17)));
 const s=state(plots);
 assert.equal(Batch.queue(s).added,40);
 assert.equal(Batch.queue(s).added,40);
 assert.equal(Batch.queue(s).added,5);
 assert.equal(Batch.queue(s).added,0);
 assert.equal(s.orders.length,85);
 const copy=JSON.parse(JSON.stringify(s));copy.orders.push(...Array.from({length:1415},(_,i)=>({id:"extra"+i,type:"clear",x:2,y:3})));
 assert.equal(copy.orders.length,1500);
 assert.equal(Batch.queue(copy).added,0);
});
test("chuva encerra rega que o jogador havia solicitado, sem gastar água",()=>{
 const day=Array.from({length:28},(_,i)=>i+1).find(d=>Life.weather(d,4433)==="chuva");
 assert.ok(day);
 const p=fresh(12,12),s=state([p],4);s.day=day;s.mode="relaxed";
 assert.equal(Batch.queue(s).added,1);
 const events=Life.advance(s,15);
 assert.ok(events.some(e=>e.startsWith("Chuva irrigou ")));
 assert.equal(Orders.status(s.orders[0],p,null,s).state,"done");
 assert.equal(s.water,4);
 assert.equal(Life.advance(s,15).some(e=>e.startsWith("Chuva irrigou ")),false);
});
test("save serializado conserva ordens sem executá-las automaticamente",()=>{
 const s=state([fresh(12,12)],2);
 assert.equal(Batch.plan(s).ready.length,1);
 assert.equal(s.orders.length,0);
 Batch.queue(s);
 const old=JSON.parse(JSON.stringify(s));
 assert.equal(old.orders.length,1);
 assert.equal(old.plots[0].watered,false);
 assert.equal(old.water,2);
 assert.equal(Orders.normalize(old.orders).length,1);
});
