"use strict";
// Proteção contra regressão visual: este contrato é a regra aprovada pelo
// criador do TILLFOLK. Não aceitar remapeamentos silenciosos.
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
global.window={};
const A=require("../src/terrain-autotile.js");
const C=require("../src/terrain-catalog.js");
require("../src/biomes.js");
const B=window.TillfolkBiomes;
const DIR=path.join(__dirname,"..","public","assets",
  "Sprout Lands - Sprites - premium pack","Sprout Lands - Sprites - premium pack",
  "Tilesets","ground tiles","New tiles");
const EXPECTED=Object.freeze({
  canto_noroeste:"C01_L01",borda_norte:"C02_L01",canto_nordeste:"C03_L01",
  borda_oeste:"C01_L02",centro:"C02_L02",borda_leste:"C03_L02",
  canto_sudoeste:"C01_L03",borda_sul:"C02_L03",canto_sudeste:"C03_L03",
  interno_noroeste:"C07_L03",interno_nordeste:"C06_L03",
  interno_sudoeste:"C07_L02",interno_sudeste:"C06_L02",
  isolado:null,horizontal:null,vertical:null,
  ponta_norte:null,ponta_leste:null,ponta_sul:null,ponta_oeste:null
});
const CONTRACT={
  schema:"tillfolk-terrain-autotile/v1",terrain:"grass",
  atlas:"Grass_Tile_Layers.png",tileSize:16,atlasColumns:11,
  atlasRows:7,neighbors:8,
  method:"cardinal + complementary inner corners",roles:EXPECTED
};
const terrains=[
 "Grass_Tile_Layers.png","Grass_Tile_layers2.png",
 "Darker_Grass_Tile_Layers.png","Darker_Grass_Tile_Layers2.png",
 "Grass_tiles_v2.png","Darker_Grass_Tiles_v2.png",
 "Soil_Ground_Tiles.png","Darker_Soil_Ground_Tiles.png",
 "Stone_Ground_Tiles.png"
];
test("JSON canônico não pode divergir do padrão aprovado (20 papéis, 16px, 11x7, 8 vizinhos)",()=>{
 const current=JSON.parse(fs.readFileSync(
   path.join(DIR,"Grass_Tile_Layers_terrain.json"),"utf8"));
 assert.deepStrictEqual(current,CONTRACT);
 assert.deepStrictEqual({...C.ROLES},EXPECTED);
 assert.deepStrictEqual(C.config,{...CONTRACT,roles:C.ROLES});
 assert.deepStrictEqual(A.exportConfig(C.ROLES),CONTRACT);
 assert.ok(Object.isFrozen(C.ROLES),"papéis precisam ser imutáveis em execução");
 assert.ok(Object.isFrozen(C.config),"contrato precisa ser imutável");
 assert.equal(Object.keys(C.ROLES).length,20);
 for(const [name,id] of Object.entries(EXPECTED))
   assert.ok(id===null||A.coords(id),name+": célula fora do atlas");
});
test("todos os 9 terrenos 176x112 usam o MESMO mapeamento, sem converter declives",()=>{
 const entries=Object.values(C.ATLAS).filter(item=>item.kind==="terrain");
 assert.equal(entries.length,terrains.length);
 assert.deepStrictEqual([...C.TERRAIN_KEYS].sort(),entries.map(o=>o.key).sort());
 assert.deepStrictEqual(entries.map(o=>o.file).sort(),[...terrains].sort());
 for(const entry of entries){
   const png=fs.readFileSync(path.join(DIR,entry.file));
   assert.equal(png.toString("hex",0,8),"89504e470d0a1a0a",entry.file);
   assert.deepStrictEqual([png.readUInt32BE(16),png.readUInt32BE(20)],
     [176,112],entry.file);
   const cfg=C.configForAtlas(entry.key);
   assert.ok(cfg,"não há config para "+entry.file);
   assert.equal(cfg.atlas,entry.file);
   assert.equal(cfg.roles,C.ROLES,"todo terreno aponta para o MESMO objeto");
   assert.equal(cfg.tileSize,16);assert.equal(cfg.atlasColumns,11);
   assert.equal(cfg.atlasRows,7);assert.equal(cfg.neighbors,8);
   assert.equal(cfg.method,"cardinal + complementary inner corners");
 }
 for(const [key,item] of Object.entries(C.ATLAS))
   if(item.kind!=="terrain")
     assert.equal(C.configForAtlas(key),null,
       "não distorcer declives/decoração com grade inadequada");
});
test("os seis biomas usam somente atlas registrados como terreno com o padrão imutável",()=>{
 assert.deepStrictEqual(Object.keys(C.BIOME_ATLAS).sort(),
   Object.keys(B.TYPES).sort());
 for(const [biome,atlasName] of Object.entries(C.BIOME_ATLAS)){
   const item=C.ATLAS[atlasName];
   assert.ok(item&&item.kind==="terrain","bioma "+biome+" usa atlas inválido");
   assert.equal(C.configForAtlas(atlasName).roles,C.ROLES);
 }
});
test("vizinhança de 8 direções escolhe os 9 principais e 4 cantos internos oficiais",()=>{
 const grid=(...r)=>r.map(row=>[...row].map(ch=>ch==="#"));
 const big=grid("###","###","###");
 const expected=[
   [0,0,"canto_noroeste"],[1,0,"borda_norte"],[2,0,"canto_nordeste"],
   [0,1,"borda_oeste"],[1,1,"centro"],[2,1,"borda_leste"],
   [0,2,"canto_sudoeste"],[1,2,"borda_sul"],[2,2,"canto_sudeste"]
 ];
 for(const [x,y,role] of expected){
   const result=A.resolve(big,x,y,C.ROLES);
   assert.equal(result.role,role);assert.equal(result.primary,EXPECTED[role]);
   assert.equal(result.usedFallback,false);
 }
 const diagonals=[
   ["interno_noroeste",grid(".##","###","###")],
   ["interno_nordeste",grid("##.","###","###")],
   ["interno_sudoeste",grid("###","###",".##")],
   ["interno_sudeste",grid("###","###","##.")]
 ];
 for(const [role,map] of diagonals){
   const r=A.resolve(map,1,1,C.ROLES);
   assert.equal(r.primary,"C02_L02");
   assert.deepStrictEqual(r.overlays,[EXPECTED[role]]);
   assert.equal(r.missing.length,0);
 }
 for(const role of A.EXTRA)assert.strictEqual(C.ROLES[role],null);
});
test("a renderização aplica as coordenadas do atlas sem rotação a todos os terrenos",()=>{
 const sprites={};
 for(const entry of C.TERRAIN_KEYS)
   sprites["terrain_"+entry]={complete:true,naturalWidth:176,naturalHeight:112,key:entry};
 const calls=[],ctx={fillStyle:"",fillRect(){},drawImage(image,sx,sy,sw,sh,dx,dy,dw,dh){
   calls.push({image:image.key,sx,sy,sw,sh,dx,dy,dw,dh});
 }};
 const world={width:12,height:3,seed:23,
   biomeMap:"ggffssiiwwpp".repeat(3)};
 const under=()=>{};
 B.draw(ctx,sprites,world,12,3,32,under);
 assert.equal(calls.length>0,true,"render não usou atlas");
 for(const p of calls){
   assert.equal(p.sw,16);assert.equal(p.sh,16);
   assert.equal(p.dw,32);assert.equal(p.dh,32);
   assert.ok(p.sx%16===0&&p.sy%16===0);
 }
 for(const id of Object.values(C.BIOME_ATLAS))
   assert.ok(calls.some(x=>x.image===id),"não desenhou o terreno "+id);
});
test("o editor abre com o padrão oficial mesmo que existam rascunhos locais",()=>{
 const html=fs.readFileSync(path.join(__dirname,"..","terrain-editor.html"),"utf8");
 assert.match(html,/const OFFICIAL=window\.TillfolkTerrainCatalog\.ROLES/);
 assert.match(html,/roles=\{\.\.\.OFFICIAL\}/);
 assert.match(html,/id="reset-roles"/);
 assert.doesNotMatch(html,/roles=saved\?JSON\.parse\(saved\)/);
});
