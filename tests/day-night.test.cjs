"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm");
const context={window:{}};
vm.runInNewContext(fs.readFileSync("src/day-night.js","utf8"),context);
const Clock=context.window.TillfolkDayNight;
const {alpha,phase,elapsedMinutes,DAY_START,NIGHT_START}=Clock;

test("o dia dura 16 horas e a noite 8, sem descontinuidade na meia-noite",()=>{
  assert.equal(DAY_START,6*60);
  assert.equal(NIGHT_START,22*60);
  assert.equal(NIGHT_START-DAY_START,16*60);
  assert.equal(1440-NIGHT_START+DAY_START,8*60);
  assert.equal(phase(5*60+59),"night");
  assert.equal(phase(6*60),"dawn");
  assert.equal(phase(7*60),"day");
  assert.equal(phase(21*60),"dusk");
  assert.equal(phase(22*60),"night");
  assert.equal(phase(1440+6*60),"dawn");
});
test("o mundo permanece claro durante a maior parte do período diurno",()=>{
  for(const h of [7,8,12,18,20.99]){
    assert.equal(phase(h*60),"day");
    assert.equal(alpha(h*60),0);
  }
});
test("amanhecer 6h–7h e anoitecer 21h–22h têm transições suaves",()=>{
  assert.equal(alpha(6*60),.64);
  assert.equal(alpha(7*60),0);
  assert.equal(alpha(21*60),0);
  assert.equal(alpha(22*60),.64);
  assert.ok(alpha(6.5*60)>.25&&alpha(6.5*60)<.40);
  assert.ok(alpha(21.5*60)>.25&&alpha(21.5*60)<.40);
});
test("noite escura de 22h a 6h, inclusive depois da meia-noite",()=>{
  for(const hour of [0,2,4,5.99,22,23.5]){
    assert.equal(phase(hour*60),"night");
    assert.equal(alpha(hour*60),.64);
  }
});
test("relógio 1× é mais lento e mantém velocidades 0×, 3× e 6×",()=>{
  assert.equal(Clock.MINUTES_PER_REAL_SECOND,.75);
  assert.equal(elapsedMinutes(1),.75);
  assert.equal(elapsedMinutes(0),0);
  assert.equal(elapsedMinutes(3),2.25);
  assert.equal(elapsedMinutes(6),4.5);
  assert.equal(elapsedMinutes(-4),0);
  assert.equal(elapsedMinutes(NaN),0);
  assert.equal(1440/elapsedMinutes(1)/60,32);
  assert.ok(16*60/elapsedMinutes(1)>8*60/elapsedMinutes(1));
});
test("apresentação do tempo não altera os dados do save",()=>{
  const state={minutes:23*60,day:4};
  alpha(state.minutes);
  phase(state.minutes);
  elapsedMinutes(1);
  assert.deepEqual(state,{minutes:23*60,day:4});
});
