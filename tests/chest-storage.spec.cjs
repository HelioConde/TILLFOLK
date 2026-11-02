"use strict";
const {test,expect}=require("@playwright/test");
const {reloadWithSave}=require("./helpers/save-fixture.cjs");
const URL="http://127.0.0.1:4173/";
const save=page=>page.evaluate(()=>JSON.parse(localStorage.getItem("tillfolk-v01")));

async function start(page,viewport={width:1366,height:768}){
  await page.setViewportSize(viewport);
  await page.goto(URL,{waitUntil:"load"});
  await page.locator("#new-game").click();
  await page.locator('[data-game-mode="relaxed"]').click();
  await page.locator("#starter-confirm").click();
  await expect(page.locator("body")).toHaveClass(/play-session/);
}
async function reloadScenario(page,mutate){
  await reloadWithSave(page,s=>{
    s.minutes=360;s.sessionSpeed=0;s.orders=[];
    s.workers.forEach(w=>{w.task=null;w.haul=null;w.resting=false;w.atRest=false;w.energy=100;});
    mutate(s);
  });
  if(await page.locator("#menu").isVisible())await page.locator("#continue").click();
}
async function freeTile(page){
 return page.evaluate(()=>{
  const s=JSON.parse(localStorage.getItem("tillfolk-v01"));
  const objects=new Set(s.world.objects.map(o=>o.x+","+o.y));
  const water=new Set(s.world.water.map(o=>o.x+","+o.y));
  const cx=Math.floor(s.spawn.x),cy=Math.floor(s.spawn.y);
  for(let radius=3;radius<=14;radius++)for(let y=cy-radius;y<=cy+radius;y++)
    for(let x=cx-radius;x<=cx+radius;x++){
      const p=s.plots.find(p=>p.x===x&&p.y===y);
      if(p&&!p.tilled&&!p.seeded&&!p.dirty&&!p.produce&&!p.selected&&
         !objects.has(x+","+y)&&!water.has(x+","+y)&&
         window.TillfolkWild.terrainAt(s.world,x,y)?.buildable&&
         !s.workers.some(w=>Math.floor(w.x)===x&&Math.floor(w.y)===y))
        return {x,y};
    }
  return null;
 });
}
async function clickTile(page,x,y){
 await page.locator("#world").evaluate((canvas,{x,y})=>{
   const r=canvas.getBoundingClientRect();
   canvas.dispatchEvent(new MouseEvent("click",{bubbles:true,cancelable:true,
     clientX:r.left+r.width*(x+.5)/(canvas.width/32),
     clientY:r.top+r.height*(y+.5)/(canvas.height/32)}));
 },{x,y});
}

test("blueprint de baú não recolhe pilhas nem cria depósito invisível",async({page})=>{
  test.setTimeout(60000);
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await start(page);
  const tile=await freeTile(page);expect(tile).toBeTruthy();
  await reloadScenario(page,s=>{
    s.inventory.twigs=0;s.inventory.grass=0;
    s.groundItems.push({id:997,x:tile.x+2,y:tile.y+2,kind:"stone",qty:25});
    s.nextDropId=998;s.chests=[];
  });
  await page.locator('[data-tool="construir"]').click();
  await page.locator('[data-build-layer="chest"]').click();
  await clickTile(page,tile.x,tile.y);
  const before=await save(page);
  expect(before.orders.some(o=>o.type==="buildChest"&&o.x===tile.x&&o.y===tile.y)).toBe(true);
  expect(before.chests).toHaveLength(0);
  expect(before.groundItems.find(i=>i.id===997)?.qty).toBe(25);
  await page.locator('[data-speed="6"]').click();
  await page.waitForTimeout(1600);
  const after=await save(page);
  expect(after.chests).toHaveLength(0);
  expect(after.groundItems.find(i=>i.id===997)?.qty).toBe(25);
  expect(after.workers.some(w=>w.haul?.orderId===null)).toBe(false);
  await page.screenshot({path:"screenshots/chest-blueprint-no-invisible-storage.png",animations:"disabled"});
  expect(errors).toEqual([]);
});

test("baú concluído é visível, pede autorização e salva a opção sem mover recursos",async({page})=>{
  test.setTimeout(60000);
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await start(page,{width:1366,height:768});
  const tile=await freeTile(page);expect(tile).toBeTruthy();
  await reloadScenario(page,s=>{
    // Um baú concluído de save antigo não possuía a flag autoCollect.
    s.chests=[{x:tile.x,y:tile.y,items:{wood:4}}];
    s.groundItems=[{id:999,x:tile.x+2,y:tile.y+2,kind:"twigs",qty:7}];
    s.nextDropId=1000;
  });
  await expect(page.locator("body")).toHaveClass(/play-session/);
  const canvasRect=await page.locator("#world").evaluate(el=>{
    const r=el.getBoundingClientRect();
    return {w:r.width,h:r.height,canvasW:el.width,canvasH:el.height};
  });
  expect(canvasRect.w).toBeGreaterThan(0);
  expect(canvasRect.h).toBeGreaterThan(0);
  const recovered=await save(page);
  expect(recovered.chests).toHaveLength(1);
  expect(recovered.chests[0].x).toBe(tile.x);
  expect(recovered.chests[0].y).toBe(tile.y);
  await clickTile(page,tile.x,tile.y);
  expect(errors).toEqual([]);
  await expect(page.locator("#chest-dialog")).toBeVisible();
  await expect(page.locator("#chest-items")).toContainText("4 wood");
  await expect(page.locator("#chest-collect-status")).toContainText("Desligada");
  expect((await save(page)).groundItems.find(i=>i.id===999)?.qty).toBe(7);
  const toggle=page.locator("#chest-auto-toggle");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed","true");
  expect((await save(page)).chests[0].autoCollect).toBe(true);
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed","false");
  expect((await save(page)).chests[0].autoCollect).toBe(false);
  expect((await save(page)).groundItems.find(i=>i.id===999)?.qty).toBe(7);
  await page.setViewportSize({width:390,height:844});
  await expect(page.locator("#chest-dialog")).toBeVisible();
  await page.screenshot({path:"screenshots/chest-storage-opt-in-mobile.png",animations:"disabled"});
  await page.locator("#chest-dialog .modal-x").click();
  await page.reload({waitUntil:"load"});
  if(await page.locator("#menu").isVisible())await page.locator("#continue").click();
  const restored=await save(page);
  expect(restored.chests[0].autoCollect).toBe(false);
  expect(restored.chests[0].items.wood).toBe(4);
  expect(restored.groundItems.find(i=>i.id===999)?.qty).toBe(7);
  expect(errors).toEqual([]);
});
