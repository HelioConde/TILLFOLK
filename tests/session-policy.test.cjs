"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const Session=require("../src/session-policy.js");
function storage(initial={}){
  const entries=new Map(Object.entries(initial));
  return {getItem:key=>entries.has(key)?entries.get(key):null,
    setItem:(key,value)=>entries.set(key,String(value))};
}
const saveKey="tillfolk-v01",sessionKey="tillfolk-session-mode";
test("sem save não existe retomada",()=>assert.equal(Session.shouldAutoResume(storage(),saveKey,sessionKey),false));
test("save legado sem preferência é retomado",()=>assert.equal(Session.shouldAutoResume(storage({[saveKey]:"{}"}),saveKey,sessionKey),true));
test("volta voluntária ao menu impede retomada mas preserva save",()=>{
  const s=storage({[saveKey]:"{}"});
  assert.equal(Session.setSessionMode(s,sessionKey,"menu"),true);
  assert.equal(Session.shouldAutoResume(s,saveKey,sessionKey),false);
  assert.equal(s.getItem(saveKey),"{}");
});
test("jogo aberto continua a retomar",()=>{
  const s=storage({[saveKey]:"{}"});
  Session.setSessionMode(s,sessionKey,"play");
  assert.equal(Session.shouldAutoResume(s,saveKey,sessionKey),true);
});
test("storage indisponível falha em segurança e não lança exceção",()=>{
  const s={getItem:()=>{throw Error("blocked");},setItem:()=>{throw Error("blocked");}};
  assert.equal(Session.shouldAutoResume(s,saveKey,sessionKey),false);
  assert.equal(Session.setSessionMode(s,sessionKey,"menu"),false);
});
