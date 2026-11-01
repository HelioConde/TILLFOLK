"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm");
const context={window:{}};
for(const file of ["src/space-program.js","src/logistics.js","src/task-orders.js","src/progression.js"])
  vm.runInNewContext(fs.readFileSync(file,"utf8"),context,{filename:file});
const Space=context.window.TillfolkSpace;
const Logistics=context.window.TillfolkLogistics;
const Orders=context.window.TillfolkOrders;
const Progression=context.window.TillfolkProgression;
Orders.setBounds(32,32);
function world(){return {width:32,height:32,seed:1,biomeMap:Array(1024).fill("g"),water:[],objects:[]};}
function colony(){
  const team=Array.from({length:5},(_,i)=>({id:i+1,name:"Colono "+(i+1),
    x:3+i,y:3,health:100,satiety:100,inventory:{tools:{}}}));
  const state={day:20,world:world(),workers:team,plots:[],orders:[],
    homes:team.map((w,i)=>({x:21,y:2+3*i,residentId:w.id})),
    chests:[],wells:[],workstations:[{x:2,y:2}],
    crafting:{station:{x:2,y:2},equipment:{}},
    inventory:{wood:200,stone:200,grass:200,mushroom:80,herbs:80},
    food:90,water:45,colonyLife:{researchLevel:4,researchPoints:50},
    progression:{discovered:{f:{day:2},s:{day:3},i:{day:4},
      w:{day:5},p:{day:6}},achievements:{},chapters:{}}};
  Space.normalize(state);return state;
}
test("mundo sem foguete começa em zero; save legado mantém identidade do estado",()=>{
  const s=colony(),reference=s.rocket;
  assert.equal(Space.normalize(s),reference);
  assert.equal(s.rocket.stage,0);
  assert.equal(Space.ready(s),"Conclua todas as quatro etapas da construção.");
  assert.equal(Progression.read(s,"rocketLaunch"),false);
});
test("foguete fica bloqueado antes de explorar cinco regiões ou pesquisar",()=>{
  const s=colony();s.colonyLife.researchLevel=3;
  assert.match(Space.unlock(s),/quatro pesquisas/);
  s.colonyLife.researchLevel=4;delete s.progression.discovered.p;
  assert.match(Space.unlock(s),/cinco continentes/);
  assert.match(Space.canOrder(s,9,9,0),/cinco continentes/);
});
test("a plataforma 3x3 não ocupa água, rocha, casa ou canteiro",()=>{
  const s=colony();
  assert.equal(Space.siteValid(s,9,9),true);
  s.world.water.push({x:10,y:10});
  assert.equal(Space.siteValid(s,9,9),false);
  s.world.water.length=0;
  s.world.objects.push({x:11,y:11,kind:"tree"});
  assert.equal(Space.siteValid(s,9,9),false);
  s.world.objects.length=0;
  s.plots.push({x:10,y:10,tilled:true});
  assert.equal(Space.siteValid(s,9,9),false);
});
test("etapas preservam custo da logística, ordem e avanço por construção",()=>{
  const s=colony();
  for(let stage=0;stage<4;stage++){
    const pending=Orders.add(s.orders,"buildRocket",9,9,null,null,s);
    assert.ok(pending.order,"não criou ordem "+stage+": "+pending.error);
    assert.equal(pending.order.stage,stage);
    assert.deepEqual(JSON.stringify(Logistics.costFor(pending.order)),
      JSON.stringify(Space.stageCost(stage)));
    const source=Logistics.remaining(pending.order);
    assert.ok(Object.keys(source).length>0);
    assert.equal(Orders.status(pending.order,null,null,s).state,"ready");
    // O trabalhador pode chegar à área da obra sem torná-la inválida.
    s.workers[0].x=9.5;s.workers[0].y=9.5;
    assert.ok(Space.finish(s,pending.order).error,"não construir sem entrega física");
    pending.order.delivered={...Space.stageCost(stage)};
    assert.equal(Logistics.complete(pending.order),true);
    const result=Space.finish(s,pending.order);
    assert.equal(result.stage,stage+1);
    assert.equal(Orders.status(pending.order,null,null,s).state,"done");
  }
  assert.equal(s.rocket.stage,4);
  assert.equal(s.rocket.site.x,9);
  assert.equal(s.rocket.site.y,9);
});
test("lançamento requer cinco colonos, casas, abastecimento e equipe saudável",()=>{
  const s=colony();s.rocket={version:1,stage:4,site:{x:9,y:9},launched:false,crew:[]};
  s.workers.length=4;
  assert.match(Space.ready(s),/cinco colonos/);
  s.workers.push({id:5,name:"Colono 5",x:7,y:3,health:100,satiety:100});
  s.food=29;assert.match(Space.ready(s),/30 alimentos/);
  s.food=90;s.water=19;assert.match(Space.ready(s),/20 águas/);
  s.water=45;s.workers[0].health=10;s.workers[1].health=10;
  assert.match(Space.ready(s),/quatro colonos saudáveis/);
});
test("lançamento consome suprimentos, embarca quatro e deixa um suporte em terra",()=>{
  const s=colony();s.rocket={version:1,stage:4,site:{x:9,y:9},launched:false,crew:[]};
  const result=Space.launch(s);
  assert.equal(result.success,true);
  assert.equal(result.crew.length,4);
  assert.equal(s.rocket.launched,true);
  assert.equal(s.rocket.launchDay,20);
  assert.equal(s.workers.length,1);
  assert.equal(s.food,60);
  assert.equal(s.water,25);
  assert.equal(Progression.read(s,"rocketLaunch"),true);
  assert.ok(Space.launch(s).error);
  assert.equal(Space.normalize(s).crew.length,4);
});
