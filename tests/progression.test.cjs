"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const vm=require("node:vm"),fs=require("node:fs");
const context={window:{}};
for(const file of ["src/progression.js","src/colony-life.js"])
  vm.runInNewContext(fs.readFileSync(file,"utf8"),context,{filename:file});
const P=context.window.TillfolkProgression,Life=context.window.TillfolkColonyLife;
const worker=(name,x=2,y=2)=>({name,x,y,inventory:{tools:{}},satiety:100});
function state(){
  const w=8,h=8,cells=Array(w*h).fill("g");
  const biomes=[["f",1,1],["s",4,1],["i",6,2],["w",1,6],["p",6,6]];
  for(const [id,x,y] of biomes)cells[y*w+x]=id;
  const s={day:1,firstHarvest:false,mode:"survival",
    world:{width:w,height:h,biomeMap:cells.join(""),water:[],seed:123},
    workers:[worker("Sim")],homes:[],chests:[],wells:[],workstations:[],
    crafting:{station:null,equipment:{}},colonyLife:{researchLevel:0,researchPoints:0},
    food:8,inventory:{},tutorial:{active:false,stats:{}},orders:[]};
  Life.normalize(s);P.normalize(s);
  return s;
}
test("jornada inicia sem conquistas e sem pontos grátis",()=>{
  const s=state();
  assert.equal(P.status(s).total,0);
  assert.equal(P.status(s).current.index,0);
  assert.equal(P.advance(s).length,0);
  assert.equal(s.colonyLife.researchPoints,0);
});
test("ações reais concluem objetivos permanentes e só premiam uma vez",()=>{
  const s=state();
  s.crafting.station={x:3,y:3};s.workers[0].inventory.tools.hoe=true;
  s.firstHarvest=true;
  const events=P.advance(s);
  assert.ok(events.find(e=>e.type==="chapter"&&e.chapter===0));
  assert.equal(P.status(s).chapters[0].done,3);
  const points=s.colonyLife.researchPoints;
  assert.ok(points>=8);
  assert.equal(P.advance(s).length,0);
  assert.equal(s.colonyLife.researchPoints,points);
  s.workers[0].inventory.tools.hoe=false;s.firstHarvest=false;
  assert.equal(P.status(s).chapters[0].complete,true);
});
test("pesquisas têm requisitos reais e ficam disponíveis na ordem correta",()=>{
  const s=state();
  s.crafting.station={x:3,y:3};
  s.colonyLife.researchPoints=99;
  assert.equal(Life.research(s).level,1);
  assert.match(Life.research(s).error,/colheita/i);
  s.firstHarvest=true;
  assert.match(Life.research(s).error,/cabana/i);
  s.homes=[{x:2,y:3,residentId:1}];
  assert.equal(Life.research(s).level,2);
  assert.match(Life.research(s).error,/poço/i);
  s.wells.push({x:3,y:2});
  assert.match(Life.research(s).error,/continente/i);
  s.workers[0].x=1.5;s.workers[0].y=1.5;
  P.advance(s);
  assert.equal(Life.research(s).level,3);
  assert.match(Life.research(s).error,/três continentes/i);
  s.workers[0].x=4.5;s.workers[0].y=1.5;P.advance(s);
  s.workers[0].x=6.5;s.workers[0].y=2.5;P.advance(s);
  assert.match(Life.research(s).error,/terceiro colono/i);
  s.workers.push(worker("Mone"),worker("Luna"));
  assert.equal(Life.research(s).level,4);
});
test("visitar novos biomas em terra firme dá descoberta e conhecimento uma única vez",()=>{
  const s=state();
  s.workers[0].x=1.5;s.workers[0].y=1.5;
  const one=P.advance(s);
  assert.ok(one.some(e=>e.type==="discovery"&&e.name==="Bosque"));
  assert.equal(P.discoveredCount(s),1);
  assert.equal(P.advance(s).length,0);
  s.world.water.push({x:4,y:1});
  s.workers[0].x=4.5;s.workers[0].y=1.5;
  assert.equal(P.advance(s).filter(e=>e.type==="discovery").length,0,
    "cruzar água não é explorar continente");
  s.world.water.length=0;
  assert.ok(P.advance(s).some(e=>e.name==="Deserto"));
});
test("save legado reconhece o progresso existente sem premiar duas vezes",()=>{
  const s=state();
  s.crafting.station={x:3,y:3};
  s.workers[0].inventory.tools.hoe=true;s.firstHarvest=true;
  s.homes=[{x:3,y:3},{x:4,y:4}];s.chests=[{x:4,y:2}];
  s.colonyLife.researchLevel=2;s.colonyLife.researchPoints=7;
  delete s.progression;
  P.advance(s,{backfill:true});
  assert.equal(s.colonyLife.researchPoints,7);
  assert.equal(P.status(s).chapters[0].complete,true);
  assert.equal(P.advance(s).length,0);
  const restored=JSON.parse(JSON.stringify(s));
  P.normalize(restored);
  assert.equal(P.status(restored).chapters[0].complete,true);
  assert.equal(restored.colonyLife.researchPoints,7);
});
test("cinco continentes reconhecidos sem destruir a partida; pesquisas não são resetadas",()=>{
  const s=state();s.colonyLife.researchLevel=4;
  for(const [x,y] of [[1,1],[4,1],[6,2],[1,6],[6,6]]){
    s.workers[0].x=x+.5;s.workers[0].y=y+.5;P.advance(s);
  }
  assert.equal(P.discoveredCount(s),5);
  assert.equal(s.colonyLife.researchLevel,4);
  assert.equal(P.status(s).chapters[4].objectives.find(x=>x.id==="exploreAll").done,true);
});
