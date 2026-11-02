"use strict";
const {test,expect}=require("@playwright/test");
const {reloadWithSave}=require("./helpers/save-fixture.cjs");
const URL="http://127.0.0.1:4173/";
test("ordem de buscar água persiste após salvar e recarregar a lagoa",async({page})=>{
 const errors=[];page.on("pageerror",error=>errors.push(error.message));
 await page.goto(URL,{waitUntil:"load"});
 await page.locator("#new-game").click();
 await page.locator('[data-game-mode="relaxed"]').click();
 await page.locator("#starter-confirm").click();
 await expect(page.locator("#world")).toBeVisible();
 const original=await page.evaluate(()=>JSON.parse(localStorage.getItem("tillfolk-v01")));
 const w=original.world.water.find(p=>p.x>1&&p.y>1&&
   p.x<original.world.width-1&&p.y<original.world.height-1);
 expect(w).toBeTruthy();
 const key=w.x+"-"+w.y+":collectWater";
 await reloadWithSave(page,s=>{
   s.orders=[{id:key,type:"collectWater",x:w.x,y:w.y}];
   s.water=0;s.minutes=360;s.sessionSpeed=0;
 });
 if(await page.locator("#menu").isVisible())await page.locator("#continue").click();
 const restored=await page.evaluate(()=>JSON.parse(localStorage.getItem("tillfolk-v01")));
 expect(restored.world.water.some(p=>p.x===w.x&&p.y===w.y)).toBe(true);
 expect(restored.orders.some(o=>o.id===key&&o.type==="collectWater")).toBe(true);
 expect(restored.water).toBe(0,"a ordem não concede água até ser executada");
 expect(errors).toEqual([]);
});
