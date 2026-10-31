"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
global.window={};
const A=require("../src/terrain-autotile.js");
const C=require("../src/terrain-catalog.js");
require("../src/biomes.js");
require("../src/wild-world.js");
const B=global.window.TillfolkBiomes;
const Wild=global.window.TillfolkWild;
const pathRoot=path.resolve(__dirname,"..", "public/assets","Sprout Lands - Sprites - premium pack",
  "Sprout Lands - Sprites - premium pack","Tilesets","ground tiles","New tiles");
const fakeSprites=()=>Object.fromEntries(Object.keys(C.ATLAS).map(key=>
  ["terrain_"+key,{key,complete:true,naturalWidth:176,naturalHeight:112}]));
const paint=(world,sprites=fakeSprites())=>{
  const painted=[],under=[];
  const ctx={
    fillStyle:null,
    fillRect(){},
    drawImage(img,sx,sy,sw,sh,x,y,w,h){painted.push({key:img.key,x,y,sx,sy,sw,sh,w,h});}
  };
  const part=(img,sx,sy,sw,sh,x,y,w,h)=>{under.push({key:img.key||"legacy",x,y,sx,sy});};
  B.draw(ctx,sprites,world,world.width,world.height,32,part);
  return {painted,under};
};
test("mapeamento 3x3 e quatro cantos internos são exatamente os fornecidos",()=>{
  const roles=C.ROLES;
  assert.deepEqual([
    roles.canto_noroeste,roles.borda_norte,roles.canto_nordeste,
    roles.borda_oeste,roles.centro,roles.borda_leste,
    roles.canto_sudoeste,roles.borda_sul,roles.canto_sudeste
  ],["C01_L01","C02_L01","C03_L01","C01_L02","C02_L02","C03_L02","C01_L03","C02_L03","C03_L03"]);
  assert.deepEqual([roles.interno_noroeste,roles.interno_nordeste,roles.interno_sudoeste,roles.interno_sudeste],
    ["C07_L03","C06_L03","C07_L02","C06_L02"]);
  for(const key of A.EXTRA)assert.equal(roles[key],null);
  assert.equal(C.config.schema,"tillfolk-terrain-autotile/v1");
});
test("atlas locais da pasta têm dimensões corretas, inclusive declives",()=>{
  const kindCount={};
  for(const [key,entry] of Object.entries(C.ATLAS)){
    kindCount[entry.kind]=(kindCount[entry.kind]||0)+1;
    const filename=path.join(pathRoot,entry.file);
    assert.ok(fs.existsSync(filename),"Ausente: "+entry.file);
    const png=fs.readFileSync(filename);
    assert.equal(png.toString("hex",0,8),"89504e470d0a1a0a",entry.file);
    const w=png.readUInt32BE(16),h=png.readUInt32BE(20);
    if(entry.kind==="terrain")assert.deepEqual([w,h],[176,112],entry.file);
    else assert.ok(w>0&&h>0,entry.file);
    assert.equal(C.url(key).startsWith("./public/assets/"),true);
  }
  assert.deepEqual(kindCount,{terrain:14,slope:3,decoration:1});
});
test("seis biomas usam atlas próprios e não altera geração dos terrenos",()=>{
  const width=18,height=8,biomeMap=("gggfffsssiiwwwppp").repeat(height);
  const world={width,height,seed:64,biomeMap};
  const {painted,under}=paint(world);
  for(const id of ["g","f","s","i","w","p"]){
    const asset=C.BIOME_ATLAS[id];
    assert.ok(painted.some(p=>p.key===asset),"bioma "+id+" deve usar "+asset);
  }
  assert.equal(under.length,width*height);
  assert.ok(under.every(p=>p.key==="grassGround"));
  assert.equal(world.biomeMap,biomeMap);
  assert.equal(B.at(world,0,0).farmable,true);
  assert.equal(B.at(world,9,0).farmable,false);
});
test("borda externa usa tile e canto interno complementa sem esticar sprite",()=>{
  const rows=["ggggg","ggggg","ggfgg","ggggg","ggggg"];
  const width=5,height=5,world={width,height,seed:42,biomeMap:rows.join("")};
  const {painted}=paint(world);
  const forest=painted.filter(x=>x.key==="darkGrassLayer");
  assert.ok(forest.length>=1);
  assert.ok(forest.some(x=>x.sx===16&&x.sy===16),"fallback central em peça isolada");
  const map=[".##","###","###"].map(x=>Array.from(x,c=>c==="#"));
  const result=A.resolve(map,1,1,C.ROLES);
  assert.deepEqual(result.overlays,["C07_L03"]);
  assert.deepEqual(A.coords(result.overlays[0]),{x:96,y:32,col:7,row:3});
});
test("carrega mapa legado com texturas anteriores quando os atlas não carregam",()=>{
  const w=6,h=3,world={width:w,height:h,seed:11,biomeMap:"gggfff".repeat(h)};
  const sprites={grass:{complete:true,naturalWidth:192,key:"legacy"}};
  const out=paint(world,sprites);
  assert.ok(out.under.some(x=>x.key==="legacy"));
  assert.equal(out.painted.length,0);
});
test("colinas usam variante de bioma, declives ficam fora do recorte 11x7",()=>{
  const s=fakeSprites(),used=[];
  const ctx={fillStyle:null,fillRect(){}};
  Wild.drawObject(ctx,{kind:"ridge",x:2,y:3},s,32,(img)=>used.push(img.key),"i");
  assert.deepEqual(used,["stoneHill"]);
  assert.equal(C.ATLAS.grassSlope.kind,"slope");
  assert.equal(C.ATLAS.bush.kind,"decoration");
});
