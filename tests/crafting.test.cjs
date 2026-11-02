"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const vm=require("node:vm"),fs=require("node:fs");
const context={window:{}};
for(const file of ["src/crafting.js","src/task-orders.js"]){
  vm.runInNewContext(fs.readFileSync(file,"utf8"),context,{filename:file});
}
const C=context.window.TillfolkCrafting,O=context.window.TillfolkOrders;
const state=()=>({
  inventory:{twigs:0,wood:0,grass:0,stone:0,gravel:0},
  crafting:C.normalize(null),workstations:[],orders:[],world:{water:[]}
});
const plot={x:10,y:10,dirty:false,tilled:false,seeded:false,watered:false,produce:false,growth:0};
test("a primeira bancada requer muitos gravetos e não nasce pronta",()=>{
  const s=state();assert.equal(s.crafting.station,null);
  assert.equal(Object.keys(s.crafting.equipment).length,C.RECIPES.filter(r=>r.type!=="material").length);
  assert.ok(Object.values(s.crafting.equipment).every(value=>value===false));
  assert.equal(C.STATION_COST,10);
  assert.equal(C.canBuild(s),false);
  assert.equal(O.status({type:"buildStation",x:10,y:10},plot,null,s).state,"blocked");
  s.inventory.twigs=10;
  assert.equal(C.canBuild(s),true);
  assert.equal(O.status({type:"buildStation",x:10,y:10},plot,null,s).state,"ready");
});
test("grama e gravetos são recolhidos à mão, árvore precisa de machado",()=>{
  const s=state();
  assert.equal(C.blocked(s,"clear",{kind:"grass"}),null);
  assert.equal(C.blocked(s,"clear",{kind:"twig"}),null);
  assert.match(C.blocked(s,"clear",{kind:"tree"}),/machado/);
  assert.match(C.blocked(s,"clear",{kind:"stump"}),/pá/);
  assert.match(C.blocked(s,"clear",{kind:"boulder"}),/picareta/);
  assert.match(O.status({type:"till",x:10,y:10},plot,null,s).reason,/enxada/);
  assert.match(O.status({type:"clear",x:10,y:10},plot,{kind:"tree"},s).reason,/machado/);
});
test("fabricar consome recursos, persiste ferramenta e libera a ordem",()=>{
  const s=state();s.inventory.twigs=20;s.inventory.gravel=2;
  assert.match(C.craft(s,"axe").error,/Work Station/);
  s.crafting.station={x:10,y:10};
  assert.equal(C.craft(s,"axe").item.key,"axe");
  assert.equal(s.inventory.twigs,16);
  assert.equal(s.inventory.gravel,0);
  assert.equal(C.has(s,"axe"),true);
  assert.equal(C.blocked(s,"clear",{kind:"tree"}),null);
  assert.equal(C.requiredTool("clear",{kind:"ridge"}),null);
  assert.equal(C.blocked(s,"clear",{kind:"ridge"}),null);
  assert.equal(O.status({type:"clear",x:10,y:10},plot,{kind:"tree"},s).state,"ready");
  assert.match(C.craft(s,"axe").error,/já foi fabricado/);
  assert.equal(C.normalize(s.crafting).equipment.axe,true);
});
test("a enxada usa o recorte correto do atlas, antes confundido com machado de pedra",()=>{
  const hoe=C.itemFrame("hoe");
  assert.equal(hoe.x,32);
  assert.equal(hoe.y,0);
  assert.equal(hoe.w,16);
  assert.equal(hoe.h,16);
  assert.notDeepEqual(hoe,C.itemFrame("axe"));
  assert.equal(C.itemFrame("stoneAxe"),null);
  assert.equal(C.RECIPES.find(recipe=>recipe.key==="hoe").name,"Enxada");
});
test("o regador continua bloqueado até ser fabricado",()=>{
  const s=state();s.crafting.station={x:10,y:10};
  assert.match(C.blocked(s,"water"),/regador/);
  s.inventory.twigs=4;s.inventory.gravel=2;s.inventory.grass=1;
  assert.equal(C.craft(s,"wateringCan").item.key,"wateringCan");
  assert.equal(C.blocked(s,"water"),null);
});
test("machado de pedra é equipamento inicial: basta coletar gravetos e cascalho",()=>{
  const s=state();s.crafting.station={x:10,y:10};
  s.tutorial={active:true,stats:{}};s.inventory.twigs=12;s.inventory.gravel=2;
  assert.equal(C.craft(s,"axe").item.key,"axe");
});
test("machado antigo é migrado para machado comum sem perder ferramentas do save",()=>{
  assert.equal(C.recipe("stoneAxe"),null);
  assert.equal(C.itemFrame("stoneAxe"),null);
  assert.equal(C.RECIPES.some(item=>item.key==="stoneAxe"),false);
  const legacy=C.normalize({station:{x:10,y:10},equipment:{stoneAxe:true}});
  assert.equal(legacy.equipment.axe,true);
  assert.equal(Object.hasOwn(legacy.equipment,"stoneAxe"),false);
  const worker={inventory:{tools:{stoneAxe:true},items:{}}};
  C.normalizeWorker(worker);
  assert.equal(worker.inventory.tools.axe,true);
  assert.equal(Object.hasOwn(worker.inventory.tools,"stoneAxe"),false);
});
test("ferramentas são individuais e a fila de fabricação sobrevive ao save",()=>{
  const s=state();s.crafting.station={x:10,y:10};
  const first={id:1,inventory:{tools:{},items:{}}};
  const second={id:2,inventory:{tools:{},items:{}}};
  C.normalizeWorker(first);C.normalizeWorker(second);
  s.workers=[first,second];s.inventory.twigs=16;s.inventory.gravel=4;
  assert.match(C.blocked(s,"till"),/enxada/);
  const craft=C.craft(s,"hoe",first);
  assert.equal(craft.item.key,"hoe");
  assert.equal(C.has(s,"hoe",first),true);
  assert.equal(C.has(s,"hoe",second),false);
  assert.equal(C.blocked(s,"till",null,first),null);
  assert.match(C.blocked(s,"till",null,second),/enxada/);
  const queued={type:"craftTool",recipe:"hoe",x:10,y:10};
  assert.equal(O.status(queued,plot,null,s).state,"ready");
  const orderId=O.id("craftTool",10,10,"hoe");
  const restored=O.normalize([{...queued,id:orderId}]);
  assert.equal(restored.length,1);
  assert.equal(restored[0].recipe,"hoe");
  assert.equal(restored[0].id,orderId);
});
test("migração de saves antigos preserva ferramentas antes ilimitadas",()=>{
  assert.equal(C.normalize(null,true).equipment.pickaxe,true);
  assert.equal(C.normalize(null).equipment.pickaxe,false);
});

test("save legado mantém ferramenta sem destinatário e transfere na contratação",()=>{
  const s=state();
  const restricted={id:1,neg:["clear"],inventory:{tools:{axe:true},items:{}}};
  s.workers=[restricted];
  C.reconcileEquipment(s);
  assert.equal(restricted.inventory.tools.axe,true,
    "Não apagar item quando todos os colonos são incompatíveis");
  assert.equal(C.has(s,"axe",restricted),false,"Não equipar ferramenta proibida");
  const newcomer={id:2,neg:[],inventory:{tools:{},items:{}}};
  C.normalizeWorker(newcomer);
  s.workers.push(newcomer);
  C.reconcileEquipment(s);
  assert.equal(restricted.inventory.tools.axe,false);
  assert.equal(newcomer.inventory.tools.axe,true);
  C.reconcileEquipment(s);
  assert.equal(newcomer.inventory.tools.axe,true,"Não duplicar item ao conciliar novamente");
});
test("ferramenta legada sem colono apto não desaparece após nova conciliação",()=>{
  const s=state();
  const restricted={id:1,neg:["till"],inventory:{tools:{hoe:true},items:{}}};
  s.workers=[restricted];
  for(let i=0;i<3;i++)C.reconcileEquipment(s);
  assert.equal(restricted.inventory.tools.hoe,true);
  assert.equal(C.has(s,"hoe",restricted),false);
});
test("contratação religa reconciliação de ferramentas preservadas",()=>{
  const game=require("node:fs").readFileSync("src/game.js","utf8");
  const hire=game.slice(game.indexOf("  function hire(i){"),game.indexOf("  let plotCache="));
  assert.match(hire,/Crafting\.reconcileEquipment\(state\);/);
});

test("fabricação direta é atômica: pilhas no chão não permitem estoque negativo",()=>{
  const s=state();s.crafting.station={x:10,y:10};
  s.inventory.twigs=2;s.inventory.gravel=2;
  // O inventário não possui 4 gravetos, embora o chão possua estoque físico.
  context.window.TillfolkLogistics={available:()=>100};
  const before=JSON.stringify(s.inventory);
  assert.match(C.craft(s,"axe").error,/estoque/);
  assert.equal(JSON.stringify(s.inventory),before);
  assert.equal(C.has(s,"axe"),false);
  delete context.window.TillfolkLogistics;
});
