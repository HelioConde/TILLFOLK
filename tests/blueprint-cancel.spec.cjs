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
 const errors=[];page.on("pageerror",error=>errors.push(error.message));
 await start(page,1366,768);
 const state=await reloadWithSave(page,s=>{
   s.orders=[{id:"96-60:buildChest",type:"buildChest",x:96,y:60,delivered:{twigs:5}},
     {id:"97-60:buildWell",type:"buildWell",x:97,y:60}];
   s.workers.forEach(w=>{w.task=null;w.progress=0;});
   s.groundItems=[];
   s.sessionSpeed=0;
 });
 await select(page,"chest");
 await rightClickCell(page,96,60);
 const final=await save(page);
 expect(final.orders.some(o=>o.type==="buildChest")).toBe(false);
 expect(final.orders.some(o=>o.type==="buildWell")).toBe(true);
 expect(final.groundItems.filter(i=>i.x===96&&i.y===60&&i.kind==="twigs")
   .reduce((n,i)=>n+i.qty,0)).toBe(5);
 await expect(page.locator("#build-status")).toContainText("cancelada");
 await page.screenshot({path:"screenshots/blueprint-cancel-bau-desktop.png",animations:"disabled"});
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
test("foguete cancela pelo canto da área 3x3; cabana pelo canto 2x2",async({page})=>{
 await start(page,1366,768);
 await reloadWithSave(page,s=>{
   s.orders=[
     {id:"90-55:buildHome",type:"buildHome",x:90,y:55},
     {id:"100-65:buildRocket",type:"buildRocket",x:100,y:65,stage:0}
   ];
   s.sessionSpeed=0;
 });
 await select(page,"rocket");
 await rightClickCell(page,102,67);
 expect((await save(page)).orders.map(o=>o.type)).toEqual(["buildHome"]);
 await page.locator('[data-build-layer="home"]').click();
 await rightClickCell(page,91,56);
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
