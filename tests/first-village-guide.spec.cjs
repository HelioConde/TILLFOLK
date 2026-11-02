"use strict";
const {test,expect}=require("@playwright/test");
const URL="http://127.0.0.1:4173/";
async function start(page,viewport){
 await page.setViewportSize(viewport);
 await page.goto(URL,{waitUntil:"networkidle"});
 await page.locator("#new-game").click();
 await page.locator('[data-game-mode="relaxed"]').click();
 await page.locator("#starter-confirm").click();
 await expect(page.locator("body")).toHaveClass(/play-session/);
}
async function showPostTutorial(page){
 return page.evaluate(()=>{
   const raw=localStorage.getItem("tillfolk-v01"),saved=JSON.parse(raw);
   const demo=structuredClone(saved);
   demo.crafting.station={x:96,y:60};
   demo.crafting.equipment.hoe=true;
   demo.homes=[{x:96,y:60}];demo.firstHarvest=true;demo.chests=[];
   demo.colonyLife=demo.colonyLife||{};demo.colonyLife.researchLevel=0;
   demo.food=8;
   const ul=document.querySelector("#tutorial-next-goals");
   const steps=window.TillfolkFirstVillage.render(demo,window.TillfolkProgression,ul);
   document.querySelector("#tutorial-done-dialog").showModal();
   return {ids:steps.map(s=>s.id),before:raw,after:localStorage.getItem("tillfolk-v01")};
 });
}
test("conclusão mostra metas reais e abre a Jornada no desktop",async({page})=>{
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await start(page,{width:1366,height:768});
 const r=await showPostTutorial(page);
 expect(r.ids).toEqual(["chest","research1","food12"]);
 expect(r.after).toBe(r.before);
 await expect(page.locator("#tutorial-next-goals li")).toHaveCount(3);
 await expect(page.locator("#tutorial-next-goals")).toContainText("Construir um baú");
 await page.screenshot({path:"screenshots/tutorial-proxima-vila-desktop.png",animations:"disabled"});
 await page.locator("#tutorial-open-journey").click();
 await expect(page.locator("#tutorial-done-dialog")).toBeHidden();
 await expect(page.locator("#progression-dialog")).toBeVisible();
 await expect(page.locator("#progression-dialog")).toContainText("Construir um baú");
 expect(errors).toEqual([]);
});
test("modal é navegável e permite continuar a partida no celular",async({page})=>{
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await start(page,{width:390,height:844});
 await showPostTutorial(page);
 const dialog=page.locator("#tutorial-done-dialog");
 await expect(dialog).toBeVisible();
 await expect(dialog.locator("#tutorial-next-goals li")).toHaveCount(3);
 await page.screenshot({path:"screenshots/tutorial-proxima-vila-mobile.png",animations:"disabled"});
 await page.locator("#tutorial-continue-game").click();
 await expect(dialog).toBeHidden();
 await expect(page.locator("body")).toHaveClass(/play-session/);
 expect(errors).toEqual([]);
});
