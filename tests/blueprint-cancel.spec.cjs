"use strict";
const {test,expect}=require("@playwright/test");
const {reloadWithSave}=require("./helpers/save-fixture.cjs");
const URL="http://127.0.0.1:4173/";

async function start(page,width,height){
 await page.setViewportSize({width,height});
 await page.goto(URL,{waitUntil:"networkidle"});
 await page.locator("#new-game").click();
 await page.locator('[data-game-mode="relaxed"]').click();
 await page.locator("#starter-confirm").click();
 await expect(page.locator("body")).toHaveClass(/play-session/);
 await page.locator('[data-speed="0"]').click();
}
async function rightClickCell(page,x,y){
 await page.locator("#world").evaluate((canvas,cell)=>{
   const box=canvas.getBoundingClientRect();
   canvas.dispatchEvent(new MouseEvent("contextmenu",{
     bubbles:true,cancelable:true,button:2,
     clientX:box.left+(cell.x+.5)*box.width/(canvas.width/32),
     clientY:box.top+(cell.y+.5)*box.height/(canvas.height/32)
   }));
 },{x,y});
}
const save=page=>page.evaluate(()=>JSON.parse(localStorage.getItem("tillfolk-v01")));
async function select(page,layer){
 await page.locator('[data-tool="construir"]').click();
 await page.locator('[data-build-layer="'+layer+'"]').click();
}
test("baú pode ser cancelado com botão direito, devolvendo materiais entregues",async({page})=>{
 test.setTimeout(90000);
 const errors=[];page.on("pageerror",error=>errors.push(error.message));
 await start(page,1366,768);
 const state=await reloadWithSave(page,s=>{
   s.orders=[{id:"96-60:buildChest",type:"buildChest",x:96,y:60,delivered:{twigs:5}},
     {id:"97-60:buildWell",type:"buildWell",x:97,y:60}];
   s.workers.forEach(w=>{w.task=null;w.progress=0;});
   // Um entregador pode estar levando itens sem possuir a tarefa final.
   s.workers[0].haul={orderId:"96-60:buildChest",phase:"deliver",kind:"twigs",
     cargo:2,qty:2,limit:2,destination:{x:96,y:60},source:{type:"stock",x:96,y:60}};
   s.workers[0].inventory.carrying={kind:"twigs",qty:2};
   s.groundItems=[];
   s.sessionSpeed=0;
 });
 await select(page,"chest");
 await rightClickCell(page,96,60);
 const final=await save(page);
 expect(final.orders.some(o=>o.type==="buildChest")).toBe(false);
 expect(final.orders.some(o=>o.type==="buildWell")).toBe(true);
 expect(final.groundItems.filter(i=>i.x===96&&i.y===60&&i.kind==="twigs")
   .reduce((n,i)=>n+i.qty,0)).toBeGreaterThanOrEqual(5);
 expect(final.groundItems.filter(i=>i.kind==="twigs")
   .reduce((n,i)=>n+i.qty,0)).toBe(7,"5 entregues + 2 em transporte");
 expect(final.workers[0].haul).toBeNull();
 expect(final.workers[0].inventory.carrying).toBeNull();
 await expect(page.locator("#build-status")).toContainText("cancelada");
 await page.screenshot({path:"screenshots/blueprint-cancel-bau-desktop.png",animations:"disabled",timeout:60000});
 expect(errors).toEqual([]);
});
test("poço bloqueado por pesquisa pode ser cancelado sem criar obra nova",async({page})=>{
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await start(page,390,844);
 await reloadWithSave(page,s=>{
   s.orders=[{id:"97-60:buildWell",type:"buildWell",x:97,y:60,delivered:{wood:2}}];
   s.sessionSpeed=0;
   s.groundItems=[];
 });
 await select(page,"well");
 await rightClickCell(page,97,60);
 const result=await save(page);
 expect(result.orders).toHaveLength(0);
 expect(result.groundItems.filter(i=>i.kind==="wood"&&i.x===97&&i.y===60)
   .reduce((n,i)=>n+i.qty,0)).toBe(2);
 await expect(page.locator("#build-status")).toContainText("cancelada");
 await page.screenshot({path:"screenshots/blueprint-cancel-poco-mobile.png",animations:"disabled"});
 expect(errors).toEqual([]);
});
test("foguete cancela pelo canto 3x3 sem remover uma cabana no mesmo terreno",async({page})=>{
 await start(page,1366,768);
 const staged=await reloadWithSave(page,s=>{
   // Salvar o anchor no spawn protegido: a migração elimina ordens na água.
   // A sobreposição intencional testa o filtro de camada sem construir nada.
   const x=Math.floor(s.spawn.x),y=Math.floor(s.spawn.y);
   s.orders=[
     {id:x+"-"+y+":buildHome",type:"buildHome",x,y},
     {id:x+"-"+y+":buildRocket",type:"buildRocket",x,y,stage:0}
   ];
   s.sessionSpeed=0;
 });
 const x=Math.floor(staged.spawn.x),y=Math.floor(staged.spawn.y);
 expect((await save(page)).orders.map(o=>o.type)).toEqual(["buildHome","buildRocket"]);
 await select(page,"rocket");
 await rightClickCell(page,x+2,y+2);
 expect((await save(page)).orders.map(o=>o.type)).toEqual(["buildHome"]);
});
test("cabana pode ser cancelada pelo canto do footprint 2x2",async({page})=>{
 test.setTimeout(75000);
 await start(page,1366,768);
 const staged=await reloadWithSave(page,s=>{
   const x=Math.floor(s.spawn.x),y=Math.floor(s.spawn.y);
   s.orders=[{id:x+"-"+y+":buildHome",type:"buildHome",x,y}];
   s.sessionSpeed=0;
 });
 const x=Math.floor(staged.spawn.x),y=Math.floor(staged.spawn.y);
 expect((await save(page)).orders.map(o=>o.type)).toEqual(["buildHome"]);
 await select(page,"home");
 await rightClickCell(page,x+1,y+1);
 expect((await save(page)).orders).toHaveLength(0);
});
test("botão direito em terreno sem blueprint não cria construção",async({page})=>{
 await start(page,390,844);
 await select(page,"chest");
 const before=await save(page);
 await rightClickCell(page,80,48);
 const after=await save(page);
 expect(after.orders).toEqual(before.orders);
 expect(after.chests).toEqual(before.chests);
 await expect(page.locator("#construction-panel")).toBeHidden();
});
