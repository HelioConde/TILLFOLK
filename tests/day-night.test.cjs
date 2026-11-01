"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm");
const context={window:{}};
vm.runInNewContext(fs.readFileSync("src/day-night.js","utf8"),context);
const {alpha,phase}=context.window.TillfolkDayNight;
test("o mundo permanece claro durante o dia",()=>{
 for(const h of [7,8,12,16,17.99]){assert.equal(phase(h*60),"day");assert.equal(alpha(h*60),0);}
});
test("transições de manhã e tarde são suaves e simétricas",()=>{
 assert.equal(alpha(18*60),0);
 assert.ok(alpha(19*60)>.25&&alpha(19*60)<.40);
 assert.equal(alpha(20*60),.64);
 assert.ok(alpha(6*60)>.25&&alpha(6*60)<.40);
 assert.equal(alpha(7*60),0);
});
test("a noite é escura e o ciclo reinicia no dia seguinte",()=>{
 for(const hour of [0,2,4,21,23]){
   assert.equal(phase(hour*60),"night");
   assert.equal(alpha(hour*60),.64);
 }
 assert.equal(alpha(1440+8*60),0);
 assert.equal(phase(1440+23*60),"night");
});
test("o cálculo não escreve no estado salvo",()=>{
 const clock={minutes:21*60,day:4};
 alpha(clock.minutes);phase(clock.minutes);
 assert.deepEqual(clock,{minutes:21*60,day:4});
});
