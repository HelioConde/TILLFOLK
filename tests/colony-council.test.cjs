"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const Council=require("../src/colony-council.js");
const Life=(()=>{const vm=require("node:vm"),fs=require("node:fs"),ctx={window:{}};vm.runInNewContext(fs.readFileSync("src/colony-life.js","utf8"),ctx);return ctx.window.TillfolkColonyLife})();
function makeState(){return {day:1,food:8,world:{seed:7},tutorial:{active:true,finished:false},workers:[
  {name:"Mone",energy:55,morale:63},{name:"Simo",energy:94,morale:95}]};}
test("o tutorial não é interrompido por conselho",()=>{
 const s=makeState();assert.equal(Council.status(s).mode,"hidden");
 assert.equal(Council.normalize(s).nextDay,0);
 assert.equal(Council.decide(s,"ceia").ok,false);
 s.tutorial.finished=true;
 assert.equal(Council.status(s).mode,"waiting");
 assert.equal(Council.status(s).nextDay,2);
});
test("evento começa no dia seguinte e não tem prazo punitivo",()=>{
 const s=makeState();s.tutorial.finished=true;Council.status(s);
 s.day=2;assert.equal(Council.status(s).mode,"ready");
 s.day=5;assert.equal(Council.status(s).mode,"ready");
 assert.equal(s.food,8);
});
test("ceia tem custo real, respeita reserva e aumenta moral sem ultrapassar teto",()=>{
 const s=makeState();s.tutorial.finished=true;Council.status(s);s.day=2;
 const r=Council.decide(s,"ceia");
 assert.equal(r.ok,true);assert.equal(r.cost,4);
 assert.equal(s.food,4);assert.equal(s.workers[0].morale,75);
 assert.equal(s.workers[1].morale,100);
 assert.equal(s.workers[0].energy,58);
 assert.equal(s.workers[1].energy,97);
 assert.equal(s.council.nextDay,5);
});
test("lanche privilegia energia; não concede bônus duas vezes",()=>{
 const s=makeState();s.tutorial.finished=true;Council.status(s);s.day=2;
 assert.equal(Council.decide(s,"lanche").cost,2);
 assert.equal(s.food,6);assert.equal(s.workers[0].energy,67);
 assert.equal(s.workers[0].morale,67);
 assert.equal(Council.decide(s,"ceia").ok,false);
 assert.equal(s.food,6);assert.equal(s.council.meetings,1);
 s.day=5;assert.equal(Council.status(s).mode,"ready");
});
test("escassez desabilita refeições, mas sempre permite guardar alimento",()=>{
 const s=makeState();s.tutorial.finished=true;Council.status(s);s.day=2;s.food=3;
 const v=Council.status(s);
 assert.equal(v.options.find(o=>o.id==="ceia").enabled,false);
 assert.equal(v.options.find(o=>o.id==="lanche").enabled,false);
 assert.equal(v.options.find(o=>o.id==="guardar").enabled,true);
 assert.equal(Council.decide(s,"ceia").ok,false);
 const r=Council.decide(s,"guardar");
 assert.equal(r.ok,true);assert.equal(s.food,3);assert.equal(s.workers[0].morale,63);
});
test("o save preserva uma decisão e nunca dispara refeições retroativas",()=>{
 const s=makeState();s.tutorial.finished=true;Council.status(s);s.day=2;
 Council.decide(s,"ceia");
 const restored=JSON.parse(JSON.stringify(s));Council.normalize(restored);
 assert.equal(restored.council.nextDay,5);
 assert.equal(Council.status(restored).mode,"waiting");
 assert.equal(Council.decide(restored,"lanche").ok,false);
 assert.equal(restored.food,4);
});
test("saves antigos e valores inválidos são normalizados sem recompensas",()=>{
 const s=makeState();s.day=21;s.tutorial.finished=true;
 s.council={nextDay:"not-a-number",meetings:-500,lastChoice:"<script>",lastDay:NaN};
 const before=s.food,view=Council.status(s);
 assert.equal(view.nextDay,22);assert.equal(view.mode,"waiting");
 assert.equal(s.council.lastChoice,null);
 assert.equal(s.council.meetings,0);assert.equal(s.food,before);
});
test("a previsão é reproduzível e usa o clima real do dia seguinte",()=>{
 const s=makeState();const expected=Life.weatherLabels[Life.weather(2,s.world.seed)];
 assert.ok(Council.forecast(s,Life).includes(expected));
});
test("o cartão informa custos e se oculta no tutorial; o aviso aponta a vida da colônia",()=>{
 const s=makeState(),notice={hidden:true,textContent:""},
 panel={hidden:true,dataset:{},innerHTML:""};
 Council.render(s,notice,panel,Life,true);
 assert.equal(notice.hidden,true);assert.equal(panel.hidden,true);
 s.tutorial.finished=true;Council.render(s,notice,panel,Life,true);
 assert.equal(panel.hidden,false);assert.match(panel.innerHTML,/Próximo conselho/);
 s.day=2;Council.render(s,notice,panel,Life,true);
 assert.equal(notice.hidden,false);
 assert.match(panel.innerHTML,/data-council-choice="ceia"/);
 assert.match(panel.innerHTML,/Custo: 4 alimentos/);
 Council.render(s,notice,panel,Life,false);
 assert.equal(notice.hidden,true);assert.equal(panel.hidden,true);
});
