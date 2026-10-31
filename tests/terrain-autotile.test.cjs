"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const A=require("../src/terrain-autotile.js");
const grid=(...rows)=>rows.map(r=>Array.from(r,ch=>ch==="#"));

test("atlas 11×7 de células 16 px e IDs em linha/coluna",()=>{
  assert.deepEqual(A.coords("C03_L05"),{x:32,y:64,col:3,row:5});
  assert.equal(A.coords("C11_L07").x,160);
  assert.equal(A.coords("C12_L07"),null);
  assert.equal(A.coords("C01_L08"),null);
  assert.equal(A.coords("C00_L01"),null);
  assert.equal(A.coords("../../file"),null);
});
test("forma cheia tem quatro cantos, quatro bordas e um centro",()=>{
  const m=grid("###","###","###");
  assert.deepEqual(A.roleAt(m,0,0),{role:"canto_noroeste",inner:[]});
  assert.equal(A.roleAt(m,2,0).role,"canto_nordeste");
  assert.equal(A.roleAt(m,0,2).role,"canto_sudoeste");
  assert.equal(A.roleAt(m,2,2).role,"canto_sudeste");
  assert.equal(A.roleAt(m,1,0).role,"borda_norte");
  assert.equal(A.roleAt(m,1,2).role,"borda_sul");
  assert.equal(A.roleAt(m,0,1).role,"borda_oeste");
  assert.equal(A.roleAt(m,2,1).role,"borda_leste");
  assert.equal(A.roleAt(m,1,1).role,"centro");
  assert.equal(A.roleAt(m,-1,0).role,null);
});
test("diagonais vazias solicitam cantos internos complementares",()=>{
  const m=grid(".##","###","###");
  const a=A.roleAt(m,1,1);
  assert.equal(a.role,"centro");
  assert.deepEqual(a.inner,["interno_noroeste"]);
  const b=A.resolve(m,1,1,{centro:"C01_L06",interno_noroeste:"C02_L03"});
  assert.equal(b.primary,"C01_L06");
  assert.deepEqual(b.overlays,["C02_L03"]);
});
test("pontas, ilhas e corredores não usam cantos incorretos",()=>{
  assert.equal(A.roleAt(grid(".#."),1,0).role,"isolado");
  assert.equal(A.roleAt(grid("###"),1,0).role,"horizontal");
  assert.equal(A.roleAt(grid("#","#","#"),0,1).role,"vertical");
  assert.equal(A.roleAt(grid(".#.","###"),1,0).role,"ponta_sul");
});
test("fallback e ausências de canto interno ficam explícitos",()=>{
  const m=grid(".##","###","###");
  const r=A.resolve(m,1,1,{centro:"C01_L06"});
  assert.equal(r.primary,"C01_L06");
  assert.deepEqual(r.missing,["interno_noroeste"]);
  const patch=A.resolve(grid("###","###","###"),0,0,{centro:"C01_L06"});
  assert.equal(patch.usedFallback,true);
  assert.deepEqual(patch.missing,["canto_noroeste"]);
  assert.equal(A.resolve(grid("###","###","###"),0,0,{}).primary,null);
});
test("configuração exportada usa nomes estáveis e não aceita coordenadas inválidas",()=>{
  const cfg=A.exportConfig({centro:"C02_L06",borda_norte:"C99_L99"});
  assert.equal(cfg.schema,"tillfolk-terrain-autotile/v1");
  assert.equal(cfg.roles.centro,"C02_L06");
  assert.equal(cfg.roles.borda_norte,null);
  assert.equal(Object.keys(cfg.roles).length,20);
});
