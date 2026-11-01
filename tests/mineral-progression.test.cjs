"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm");
const context={window:{}};
for(const file of ["src/mineral-progression.js","src/terrain-autotile.js",
  "src/terrain-catalog.js","src/biomes.js","src/wild-world.js","src/crafting.js",
  "src/logistics.js","src/task-orders.js","src/space-program.js"])
  vm.runInNewContext(fs.readFileSync(file,"utf8"),context,{filename:file});
const M=context.window.TillfolkMinerals,W=context.window.TillfolkWild;
const C=context.window.TillfolkCrafting,L=context.window.TillfolkLogistics;
const Space=context.window.TillfolkSpace;
test("seis áreas geram os recursos exclusivos e cascalho inicial sem invadir rios",()=>{
  for(const seed of [7,13,719,1129]){
    const world=W.create(seed,192,120);
    const before=new Map(world.objects.map(o=>[o.x+","+o.y,o.kind]));
    const count=world.objects.length;
    const r=M.populate(world);
    assert.ok(r.counts.gravel>=18,"cascalho inicial ausente");
    for(const zone of Object.values(M.ZONES)){
      if(zone.index===1)continue;
      assert.ok(r.counts[zone.resource]>=18,"faltou minério "+zone.resource);
      const items=world.objects.filter(o=>o.mineral===zone.resource);
      assert.ok(items.every(o=>world.biomeMap[o.y*192+o.x]===
        Object.entries(M.ZONES).find(([,v])=>v.resource===zone.resource)[0]));
    }
    for(const o of world.objects.filter(o=>o.mineral||o.kind==="pebble"))
      assert.equal(W.waterAt(world,o.x,o.y),false);
    for(const [key,kind] of before){
      const [x,y]=key.split(",").map(Number);
      assert.equal(W.at(world,x,y)?.kind,kind,"objeto antigo apagado");
    }
    assert.ok(world.objects.length>count);
    assert.equal(M.populate(world).added,0,"minérios renasceram após reload");
  }
});
test("picareta exige graveto e cascalho; sem minerais avançados grátis",()=>{
  assert.deepEqual(JSON.stringify(C.recipe("axe").cost),
    JSON.stringify({twigs:4,gravel:2}));
  assert.ok(!C.recipe("axe").cost.wood);
  assert.deepEqual(JSON.stringify(C.recipe("pickaxe").cost),
    JSON.stringify({twigs:5,gravel:4}));
  const state={workers:[{inventory:{tools:{pickaxe:true}}}],crafting:C.normalize(null)};
  assert.equal(M.missingTool(state,{kind:"boulder",mineral:"bronze"}),null);
  assert.match(M.missingTool(state,{kind:"boulder",mineral:"iron"}),/bronze/);
  state.workers[0].inventory.tools.bronzePickaxe=true;
  assert.equal(M.missingTool(state,{kind:"boulder",mineral:"iron"}),null);
  assert.match(M.missingTool(state,{kind:"boulder",mineral:"gold"}),/ferro/);
  state.workers[0].inventory.tools.ironPickaxe=true;
  assert.equal(M.missingTool(state,{kind:"boulder",mineral:"gold"}),null);
  assert.equal(M.missingTool(state,{kind:"boulder",mineral:"diamond"}),null);
  assert.match(M.missingTool(state,{kind:"boulder",mineral:"bauxite"}),/diamante/);
  state.workers[0].inventory.tools.diamondPickaxe=true;
  assert.equal(M.missingTool(state,{kind:"boulder",mineral:"bauxite"}),null);
});
test("coleta de depósitos preserva mineral correto e porções físicas",()=>{
  const world=W.create(219,192,120);M.populate(world);
  const ore=world.objects.find(o=>o.mineral==="bauxite");
  assert.ok(ore);const qty=ore.amount;
  const result=W.clear(world,ore.x,ore.y);
  assert.ok(result.resource.includes("Bauxita"));
  assert.equal(result.remaining,false);
  assert.equal(W.at(world,ore.x,ore.y),null);
  assert.equal(qty,5);
});
test("liga de alumínio precisa da bauxita e não é minada pronta",()=>{
  const recipe=C.recipe("aluminumAlloy"),circuit=C.recipe("goldCircuit");
  assert.equal(recipe.type,"material");
  assert.deepEqual(JSON.stringify(recipe.cost),JSON.stringify({bauxite:3,iron:1}));
  assert.deepEqual(JSON.stringify(recipe.output),JSON.stringify({kind:"aluminumAlloy",qty:2}));
  assert.equal(circuit.cost.gold,3);
  assert.ok(Object.values(M.ZONES).every(zone=>zone.resource!=="aluminumAlloy"));
  const state={inventory:{bauxite:3,iron:1},workers:[],
    crafting:C.normalize({station:{x:10,y:10},equipment:{}}),
    colonyLife:{researchLevel:4}};
  const a=C.craft(state,"aluminumAlloy");
  assert.equal(a.material.kind,"aluminumAlloy");
  assert.equal(state.inventory.bauxite,0);
  assert.equal(state.inventory.iron,0);
  assert.equal(C.has(state,"aluminumAlloy"),false);
  assert.ok(C.craft(state,"aluminumAlloy").error,"liga sem recursos deveria ser impossível");
});
test("foguete precisa do último continente: casco motor suporte de vida usam liga",()=>{
  for(const stage of [1,2,3])assert.ok(Space.stageCost(stage).aluminumAlloy>=10);
  assert.equal(Space.stageCost(0).aluminumAlloy,undefined);
  assert.ok(Space.stageCost(2).goldCircuit>=4);
  assert.ok(Space.stageCost(2).diamond>=4);
});
test("saves anteriores preservam objetos e progresso da extração",()=>{
  const world=W.create(20,192,120),obj=world.objects.slice(0,8).map(o=>({x:o.x,y:o.y}));
  const state={world,day:6,minerals:{discovered:{bronze:{day:3}}}};
  M.normalize(state);
  M.populate(world,obj);
  assert.ok(state.minerals.discovered.bronze);
  assert.equal(M.discover(state,"bronze"),false);
  assert.equal(M.discover(state,"iron"),true);
  assert.equal(M.discover(state,"iron"),false);
  assert.equal(state.minerals.discovered.iron.day,6);
});
