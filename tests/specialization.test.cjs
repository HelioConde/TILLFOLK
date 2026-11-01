"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const source=fs.readFileSync("src/game.js","utf8");
const match=source.match(/  function specialtyMultiplier\(w,type\)\{([\s\S]*?)\n  \}/);
assert.ok(match,"specialtyMultiplier presente no motor");
const multiplier=new Function("w","type",match[1]);
test("três habilidades vermelhas e uma azul em plantar = velocidade 3x",()=>{
 const worker={skills:["sow"],neg:["water","harvest","till"]};
 assert.equal(multiplier(worker,"sow"),3);
 assert.equal(multiplier(worker,"clear"),1);
});
test("especialistas com menos especializações recebem bônus maior",()=>{
 const specialist={skills:["sow"],neg:["water","till","harvest"]};
 const generalist={skills:["sow","carry","clear"],neg:["water","till","harvest"]};
 assert.ok(multiplier(specialist,"sow")>multiplier(generalist,"sow"));
 assert.equal(multiplier({skills:["sow"],neg:[]},"sow"),2);
 assert.equal(multiplier({skills:[],neg:["sow","clear","carry"]},"sow"),1);
});
