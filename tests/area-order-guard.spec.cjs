"use strict";
const {test,expect}=require("@playwright/test");
const {reloadWithSave}=require("./helpers/save-fixture.cjs");
const URL="http://127.0.0.1:4173/";
const snap=page=>page.evaluate(()=>JSON.parse(localStorage.getItem("tillfolk-v01")));
async function start(page){
  await page.setViewportSize({width:1600,height:900});
  await page.goto(URL,{waitUntil:"load"});
  await page.locator("#new-game").click();
  await page.locator('[data-game-mode="relaxed"]').click();
  await page.locator("#starter-confirm").click();
  await expect(page.locator("body")).toHaveClass(/play-session/);
  await page.locator('[data-speed="0"]').click();
}
async function dragTiles(page,from,to){
  const points=await page.locator("#world").evaluate((canvas,p)=>{
    const r=canvas.getBoundingClientRect();
    const point=cell=>({x:r.left+(cell.x+.5)*r.width/(canvas.width/32),
      y:r.top+(cell.y+.5)*r.height/(canvas.height/32)});
    return {a:point(p.from),b:point(p.to)};
  },{from,to});
  await page.mouse.move(points.a.x,points.a.y);
  await page.mouse.down();
  await page.mouse.move(points.b.x,points.b.y,{steps:10});
  await page.mouse.up();
}
test("tutorial não aceita arrasto gigante que criaria centenas de ordens",async({page})=>{
  test.setTimeout(75000);
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await start(page);
  const s=await snap(page);
  expect(s.workstations).toHaveLength(0);
  expect(s.orders).toHaveLength(0);
  const x=Math.floor(s.spawn.x),y=Math.floor(s.spawn.y);
  // 8 x 7 tiles: muito acima do teto 24 enquanto não existe oficina.
  await dragTiles(page,{x:x-6,y:y-5},{x:x+1,y:y+1});
  await expect(page.locator("#toast")).toContainText("Limite atual: 24");
  const after=await snap(page);
  expect(after.orders).toEqual([]);
  expect(after.groundItems).toEqual(s.groundItems);
  await page.screenshot({path:"screenshots/area-tutorial-limite-24-1600x900.png",animations:"disabled"});
  expect(errors).toEqual([]);
});
test("zoom 50% agrupa ordens e mantém sua quantidade e saves",async({page})=>{
  test.setTimeout(75000);
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await start(page);
  await reloadWithSave(page,s=>{
    s.sessionSpeed=0;s.minutes=360;
    const cx=s.spawn.x,cy=s.spawn.y;
    const objects=s.world.objects.filter(o=>Math.abs(o.x-cx)<23&&Math.abs(o.y-cy)<16).slice(0,36);
    if(objects.length<12)throw new Error("Fixture sem objetos suficientes perto do spawn");
    s.orders=objects.map(o=>({id:o.x+"-"+o.y+":clear",type:"clear",x:o.x,y:o.y}));
  });
  if(await page.locator("#menu").isVisible())await page.locator("#continue").click();
  const before=await snap(page);
  expect(before.orders.length).toBeGreaterThanOrEqual(12);
  await page.locator("#zoom-out").click();
  await page.locator("#zoom-out").click();
  await page.locator("#zoom-out").click();
  await expect(page.locator("#zoom-value")).toContainText("50%");
  await page.waitForTimeout(600); // animação da câmera até zoom real
  await page.screenshot({path:"screenshots/ordens-agrupadas-50-percent-1600x900.png",animations:"disabled"});
  const after=await snap(page);
  expect(after.orders).toEqual(before.orders);
  expect(after.groundItems).toEqual(before.groundItems);
  expect(errors).toEqual([]);
});
