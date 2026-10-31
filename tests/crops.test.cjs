"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const context={window:{},Image:class{constructor(){this.complete=false;this.naturalWidth=0;this.naturalHeight=0;}}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,"../src/crop-catalog.js"),"utf8"),context);
const Crops=context.window.TillfolkCrops;
function pngInfo(file){
 const buffer=fs.readFileSync(path.join(__dirname,"..",file));
 assert.equal(buffer.subarray(1,4).toString(),"PNG",file);
 return {width:buffer.readUInt32BE(16),height:buffer.readUInt32BE(20)};
}
test("19 culturas agrícolas possuem sprites originais para todas as etapas",()=>{
 assert.equal(Crops.ALL.length,19);
 assert.equal(new Set(Crops.ALL.map(c=>c.id)).size,19);
 for(const crop of Crops.ALL){
  for(const [name,filepath] of [["growth",crop.growth],["icon",crop.icon]]){
   const file=filepath.replace(/^\.\//,"");
   assert.ok(fs.existsSync(path.join(__dirname,"..",file)),crop.id+" "+name+" não encontrado");
   const image=pngInfo(file);
   assert.ok(image.width>= (name==="growth"?crop.w:16),crop.id+" largura");
   assert.ok(image.height>= (name==="growth"?crop.h:16),crop.id+" altura");
  }
  assert.ok(crop.frames>=6);
  assert.ok(crop.food>=1);
 }
});
test("oficina premium original e sprites de ferramentas estão presentes",()=>{
 const premium="public/assets/Sprout Lands - Sprites - premium pack/Sprout Lands - Sprites - premium pack/Objects/";
 for(const file of ["work station.png","Farming Plants.png","Items/tools and meterials.png","Items/All items.png"]){
  assert.ok(fs.existsSync(path.join(__dirname,"..",premium,file)),file+" ausente");
  assert.ok(pngInfo(premium+file).width>0);
 }
});
test("inventário limita valores, preserva escolhas e sorteia variedades existentes",()=>{
 const stock=Crops.normalizeStock({tomato:3,carrot:-5,wheat:2.8,unknown:100});
 assert.equal(stock.tomato,3);assert.equal(stock.carrot,0);assert.equal(stock.wheat,2);
 assert.equal(Crops.get("unknown"),undefined);
 for(const value of [0,.1,.25,.5,.75,.999999]){
  const crop=Crops.get(Crops.pickWild(()=>value));
  assert.ok(crop&&crop.weight>0);
 }
});
