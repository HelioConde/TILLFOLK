"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const path=require("node:path");
const {inventory,verify}=require("../tools/audit-assets.cjs");
const report=inventory(path.resolve(__dirname,".."));
test("créditos e licença da arte de terceiros permanecem disponíveis",()=>{
  assert.equal(report.premiumLicensePresent,true);
  assert.equal(report.attributionPresent,true);
  assert.ok(report.premium.count>0);
});
test("produto independente não transporta imagens, áudio, fontes ou executáveis externos",()=>{
  assert.deepEqual(report.commercialBinary,[]);
  assert.equal(verify(report),true);
});
test("inventário informa skills externas e grupos para revisão",()=>{
  assert.ok(report.importedSkills>0);
  assert.ok(report.totalAssets>100);
  assert.ok(Object.keys(report.groups).length>5);
});
