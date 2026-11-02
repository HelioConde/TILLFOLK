"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),vm=require("node:vm");
const {reloadWithSave,SAVE_KEY}=require("./helpers/save-fixture.cjs");
function storage(){
 const data=new Map();
 return {
  getItem:key=>data.has(key)?data.get(key):null,
  setItem:(key,value)=>{data.set(key,String(value))},
  removeItem:key=>data.delete(key)
 };
}
function browserSave(saved){
 const localStorage=storage(),sessionStorage=storage(),ctx={localStorage,sessionStorage};
 localStorage.setItem(SAVE_KEY,JSON.stringify(saved));
 let setup=null,unloadState=JSON.parse(JSON.stringify(saved)),reloaded=0;
 const page={
  async evaluate(fn,arg){return vm.runInNewContext("("+fn.toString()+")",ctx)(arg);},
  async addInitScript(fn,arg){setup={fn,arg};},
  async reload(){reloaded++;localStorage.setItem(SAVE_KEY,JSON.stringify(unloadState));
   if(setup)vm.runInNewContext("("+setup.fn.toString()+")",ctx)(setup.arg);
  }
 };
 return {page,localStorage,sessionStorage,get reloaded(){return reloaded}};
}
test("fixtures prevalecem sobre save anterior disparado por pagehide",async()=>{
 const original={workers:[{id:1,name:"Sim"}],plots:[{x:96,y:60}],cropSeeds:{wheat:0},food:8};
 const mock=browserSave(original);
 await reloadWithSave(mock.page,s=>{s.cropSeeds.wheat=2;s.food=6;});
 const stored=JSON.parse(mock.localStorage.getItem(SAVE_KEY));
 assert.equal(mock.reloaded,1);
 assert.equal(stored.cropSeeds.wheat,2);
 assert.equal(stored.food,6);
 assert.equal(stored.workers[0].name,"Sim");
 assert.equal(mock.sessionStorage.getItem("tillfolk-e2e-pending-save"),null);
 assert.equal(mock.localStorage.getItem("tillfolk-session-mode"),"play");
});
test("save ausente é rejeitado sem escrever nem recarregar",async()=>{
 const mock=browserSave({food:1});
 await assert.rejects(()=>reloadWithSave(mock.page,s=>{s.food=99}),/Não há save/);
 assert.equal(mock.reloaded,0);
 assert.equal(JSON.parse(mock.localStorage.getItem(SAVE_KEY)).food,1);
});
