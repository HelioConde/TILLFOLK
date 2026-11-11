"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const Budget=require("../src/render-budget.js");
test("desktop conserva orçamento de 60 quadros",()=>{
  assert.equal(Budget.fps(1366),60);
  assert.equal(Budget.fps(1920),60);
  assert.equal(Budget.shouldDraw(17,0,1366),true);
  assert.equal(Budget.shouldDraw(32,17,1366),false);
  assert.equal(Budget.shouldDraw(33,17,1366),true);
});
test("celular limita somente o desenho a cerca de 30 fps",()=>{
  assert.equal(Budget.fps(390),30);
  assert.equal(Budget.fps(600),30);
  assert.equal(Budget.shouldDraw(20,0,390),true);
  assert.equal(Budget.shouldDraw(43,20,390),false);
  assert.equal(Budget.shouldDraw(53,20,390),true);
});
test("instantes inválidos não acionam desenho",()=>{
  assert.equal(Budget.shouldDraw(NaN,0,390),false);
  assert.equal(Budget.shouldDraw(Infinity,0,390),false);
});
