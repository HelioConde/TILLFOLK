"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.resolve(__dirname,"..");
const source=file=>fs.readFileSync(path.join(root,file),"utf8");
const context={window:{TillfolkExploration:{GEAR:{}}}};
vm.createContext(context);
for(const file of ["src/crafting.js","src/logistics.js","src/task-orders.js"])
  vm.runInContext(source(file),context,{filename:file});
const {TillfolkCrafting:C,TillfolkOrders:O}=context.window;
const makeWorker=(id,neg=[])=>({id,neg,skills:[],inventory:{tools:{},items:{}}});
const restricted=makeWorker(1,["till","carry"]);
const farmer=makeWorker(2,[]);
const state={workers:[restricted,farmer],crafting:{station:{x:5,y:5},equipment:{}},
  inventory:{twigs:30,gravel:20},groundItems:[],chests:[],nextDropId:1,
  spawn:{x:5,y:5}};
const craftOrder={id:"5-5:craftTool:hoe",type:"craftTool",recipe:"hoe",x:5,y:5};
assert.equal(C.canEquip(restricted,"hoe"),false,"Colono proibido de arar não equipa enxada");
assert.equal(C.canEquip(farmer,"hoe"),true);
assert.match(C.craft(state,"hoe",restricted,true).error,/Restrição vermelha/);
assert.equal(O.status(craftOrder,null,null,state).state,"ready");
assert.equal(C.craft(state,"hoe",farmer,true).error,undefined);
assert.equal(C.has(state,"hoe",farmer),true);
assert.equal(C.has(state,"hoe",restricted),false);
assert.equal(O.status(craftOrder,null,null,state).state,"done",
  "Não exigir ferramenta de colono que é proibido de utilizá-la");
assert.equal(O.status(craftOrder,null,null,{...state,workers:[restricted]}).state,"blocked",
  "Não deixar uma ordem eternamente tentando equipar pessoa incapaz");
for(const tool of ["axe","shovel","pickaxe","bronzePickaxe","ironPickaxe","diamondPickaxe"]){
  assert.equal(C.canEquip(makeWorker(3,["clear"]),tool),false,
    tool+" só pode ser usado por quem pode limpar");
}
assert.equal(C.canEquip(makeWorker(4,["water"]),"wateringCan"),false);
restricted.inventory.tools.hoe=true;
farmer.inventory.tools.hoe=false;
C.reconcileEquipment(state);
assert.equal(restricted.inventory.tools.hoe,false);
assert.equal(farmer.inventory.tools.hoe,true,"Save antigo preserva ferramenta com trabalhador apto");
const ground={...state,workers:[farmer],crafting:{station:null,equipment:{}},
  inventory:{twigs:0},groundItems:[{id:1,x:4,y:4,kind:"twigs",qty:12}]};
assert.equal(O.status({type:"buildStation",id:"5-5:buildStation",x:5,y:5},null,null,ground).state,"ready",
  "Materiais no chão também permitem iniciar a construção");
// O menu inicial é integrado ao jogo; testar isoladamente apenas suas
// funções puras de sorteio, sem simular canvas ou navegador.
const game=source("src/game.js");
const start=game.indexOf("  function sharedNegativeTraits(");
const end=game.indexOf("  // Os sprites Sprout Lands",start);
assert.ok(start>=0&&end>start,"Localizar rotina de seleção inicial");
let seed=0;
const candidate=()=>({name:"Nome"+(++seed),appearance:seed,skills:[],
  neg:seed%2===1?["till","carry"]:["till"]});
const starter=new Function("newCandidate","renderStarters","$",
  "let starters=[];\n"+game.slice(start,end)+
  "\nreturn {createStarterTeam,sharedNegativeTraits,getStarters:()=>starters};"
)(candidate,()=>{},()=>({showModal:()=>{}}));
starter.createStarterTeam();
const pair=starter.getStarters();
assert.equal(pair.length,2);
assert.deepEqual(starter.sharedNegativeTraits(pair[0],pair[1]),[]);
assert.match(game,/if\(w\.neg\?\.includes\("carry"\)\)return false;/,
  "Não iniciar transporte físico para trabalhador com proibição vermelha");
console.log("OK — ferramentas, salvamentos, materiais no chão e recrutamento inicial.");
