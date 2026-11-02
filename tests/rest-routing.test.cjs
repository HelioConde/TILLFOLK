"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const R=require("../src/rest-routing.js");
const worker={x:20.5,y:16.5,id:1};
const home={x:25,y:20,residentId:1};
const camp={x:10,y:10};
const path=[{x:21.5,y:16.5},{x:24.5,y:20.5}];
test("vai até a casa quando o caminho existe, sem trocar destino",()=>{
 const called=[];
 const result=R.choose(worker,home,camp,(_fx,_fy,x,y)=>{called.push([x,y]);return path});
 assert.equal(result.kind,"home");
 assert.equal(result.fallback,false);
 assert.deepEqual(result.goal,{x:24,y:20});
 assert.equal(result.route,path);
 assert.deepEqual(called,[[24,20]]);
});
test("casa bloqueada utiliza caminho real até a clareira, sem teleporte",()=>{
 const calls=[];
 const result=R.choose(worker,home,camp,(_fx,_fy,x,y)=>{
   calls.push([x,y]);return x===24?[]:[{x:10.5,y:10.5}];
 });
 assert.equal(result.kind,"camp");
 assert.equal(result.fallback,true);
 assert.deepEqual(result.goal,{x:10,y:10});
 assert.equal(result.route.length,1);
 assert.deepEqual(calls,[[24,20],[10,10]]);
 assert.deepEqual(worker,{x:20.5,y:16.5,id:1});
});
test("ambos os caminhos inacessíveis: repouso no chão do próprio tile",()=>{
 const result=R.choose(worker,home,camp,()=>[]);
 assert.equal(result.kind,"ground");
 assert.equal(result.fallback,true);
 assert.deepEqual(result.route,[]);
 assert.deepEqual(result.goal,{x:20,y:16});
 assert.equal(worker.x,20.5);
});
test("sem moradia usa somente clareira se alcançável",()=>{
 const result=R.choose(worker,null,camp,(_a,_b,x,y)=>[{x:x+.5,y:y+.5}]);
 assert.equal(result.kind,"camp");assert.equal(result.fallback,true);
 assert.deepEqual(result.goal,{x:10,y:10});
});
