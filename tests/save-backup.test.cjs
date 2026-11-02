"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm");
const Backup=require("../src/save-backup.js");
const sample=()=>({
 day:9,minutes:445,mode:"survival",farmName:"Vale da Simone",
 plots:[{x:96,y:60,seeded:true,watered:false,growth:.5}],
 workers:[{id:1,name:"Sim",skills:["sow"],neg:["mine"],energy:60}],
 inventory:{wood:12,twigs:8},orders:[{id:"96-60:water",type:"water",x:96,y:60}],
 cropSeeds:{potato:3},food:11,foodLedger:{version:1,stock:{potato:5},generic:6},
 world:{width:192,height:120,seed:4401,objects:[],water:[]},tutorial:{active:true}
});
const storage=values=>{
 const m=new Map(Object.entries(values||{}));
 return {
 getItem:k=>m.has(k)?m.get(k):null,
 setItem:(k,v)=>m.set(k,String(v)),
 removeItem:k=>m.delete(k)
 };
};
test("exportar/recuperar mantém o mundo, ferramentas, estoques e turnos",()=>{
 const source=sample();
 const json=Backup.encode(source);
 const parsed=Backup.decode(json);
 assert.equal(JSON.parse(json).format,"tillfolk-save-backup/v1");
 assert.deepEqual(parsed,source);
 assert.equal(Backup.decode(JSON.stringify(source)).day,9,"save JSON legado também é aceito");
 assert.equal(source.workers[0].name,"Sim");
});
test("JSON malformado ou formato desconhecido nunca substitui uma colônia",()=>{
 assert.throws(()=>Backup.decode("{invalido"),/JSON válido/);
 assert.throws(()=>Backup.decode(JSON.stringify({format:"unknown",state:sample()})),/não reconhecido/);
 assert.throws(()=>Backup.decode(JSON.stringify({workers:[],plots:[]})),/Mapa ou canteiros/);
 assert.throws(()=>Backup.decode(JSON.stringify({...sample(),minutes:1500})),/Horário/);
 assert.throws(()=>Backup.decode(JSON.stringify({...sample(),orders:Array(1501).fill({})})),/Ordens/);
});
test("backup em staging reabre somente um estado validado depois do pagehide",()=>{
 const imported=sample();
 const old={...sample(),farmName:"Vale antigo",day:3};
 const sessionStorage=storage({"tillfolk-import-staged-v1":JSON.stringify(imported)});
 const localStorage=storage({"tillfolk-v01":JSON.stringify(old),"tillfolk-session-mode":"play"});
 const root={sessionStorage,localStorage,console:{warn:()=>{}},document:null};
 vm.runInNewContext(fs.readFileSync("src/save-backup.js","utf8"),{window:root,module:undefined});
 const stored=JSON.parse(localStorage.getItem("tillfolk-v01"));
 assert.equal(stored.day,9);
 assert.equal(stored.farmName,"Vale da Simone");
 assert.equal(stored.foodLedger.generic,6);
 assert.equal(localStorage.getItem("tillfolk-session-mode"),"play");
 assert.equal(sessionStorage.getItem("tillfolk-import-staged-v1"),null);
});
test("staging inválido preserva save antigo e descarta importação",()=>{
 const old=sample(),sessionStorage=storage({"tillfolk-import-staged-v1":'{"format":"fake"}'});
 const localStorage=storage({"tillfolk-v01":JSON.stringify(old)});
 const root={sessionStorage,localStorage,console:{warn:()=>{}},document:null};
 vm.runInNewContext(fs.readFileSync("src/save-backup.js","utf8"),{window:root});
 assert.equal(JSON.parse(localStorage.getItem("tillfolk-v01")).day,9);
 assert.equal(sessionStorage.getItem("tillfolk-import-staged-v1"),null);
});
test("importação com localStorage indisponível não apaga o estado atual",()=>{
 const imported=sample(),old={...sample(),day:4};
 const sessionStorage=storage({"tillfolk-import-staged-v1":JSON.stringify(imported)});
 const localStorage=storage({"tillfolk-v01":JSON.stringify(old)});
 localStorage.setItem=(key)=>{throw Error("QuotaExceeded");};
 const root={sessionStorage,localStorage,console:{warn:()=>{}},document:null};
 vm.runInNewContext(fs.readFileSync("src/save-backup.js","utf8"),{window:root});
 assert.equal(JSON.parse(localStorage.getItem("tillfolk-v01")).day,4);
 assert.equal(sessionStorage.getItem("tillfolk-import-staged-v1"),null);
});
