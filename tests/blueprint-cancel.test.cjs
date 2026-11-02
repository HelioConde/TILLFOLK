"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const Cancel=require("../src/blueprint-cancel.js");
const Orders=[
 {id:"96-60:till",type:"till",x:96,y:60},
 {id:"96-60:sow",type:"sow",x:96,y:60},
 {id:"96-60:buildHome",type:"buildHome",x:96,y:60,delivered:{wood:3}},
 {id:"96-60:buildStation",type:"buildStation",x:96,y:60},
 {id:"96-60:buildChest",type:"buildChest",x:96,y:60,delivered:{twigs:5}},
 {id:"96-60:buildWell",type:"buildWell",x:96,y:60,delivered:{wood:3}},
 {id:"96-60:buildRocket",type:"buildRocket",x:96,y:60,delivered:{stone:8}}
];
const selected=(layer,x=96,y=60)=>Cancel.matching(Orders,layer,x,y);
test("cada camada cancela exclusivamente o tipo da obra selecionada",()=>{
 assert.deepEqual(selected("field"),["96-60:till","96-60:sow"]);
 for(const [layer,type] of Object.entries({home:"buildHome",station:"buildStation",
   chest:"buildChest",well:"buildWell",rocket:"buildRocket"})){
   assert.deepEqual(selected(layer),["96-60:"+type],layer);
 }
});
test("cancela cabana em qualquer um dos quatro quadrados, nunca fora",()=>{
 for(const [dx,dy] of [[0,0],[1,0],[0,1],[1,1]])
   assert.deepEqual(selected("home",96+dx,60+dy),["96-60:buildHome"]);
 for(const [x,y] of [[98,60],[97,62],[95,60],[96,59]])
   assert.deepEqual(selected("home",x,y),[]);
});
test("cancela foguete em qualquer célula do footprint 3×3",()=>{
 for(let dy=0;dy<3;dy++)for(let dx=0;dx<3;dx++)
   assert.deepEqual(selected("rocket",96+dx,60+dy),["96-60:buildRocket"]);
 assert.deepEqual(selected("rocket",99,60),[]);
 assert.deepEqual(selected("rocket",96,63),[]);
});
test("não remove ordens de outro tipo nem realiza obras sem ter ordem pendente",()=>{
 assert.deepEqual(Cancel.matching(Orders,"chest",98,60),[]);
 assert.deepEqual(Cancel.matching([],"chest",96,60),[]);
 assert.deepEqual(Cancel.matching(null,"well",96,60),[]);
 assert.deepEqual(Cancel.matching(Orders,"unknown",96,60),[]);
});
test("planejamento é puro: não altera estoque, progresso da obra nem o save",()=>{
 const input=JSON.stringify(Orders);
 selected("chest");selected("well");selected("rocket",98,62);
 assert.equal(JSON.stringify(Orders),input);
 assert.equal(Orders.find(o=>o.type==="buildChest").delivered.twigs,5);
});
test("IDs de ordens devem ser reais e coordenadas válidas",()=>{
 const bad=[{type:"buildChest",x:96,y:60},{id:"x",type:"buildChest",x:"96",y:60},
   {id:"y",type:"buildChest",x:96.5,y:60}];
 assert.deepEqual(Cancel.matching(bad,"chest",96,60),[]);
 assert.deepEqual(selected("well",96.5,60),[]);
});
