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
  // 100% -> 75% -> 50%. O terceiro clique seria inválido (mínimo 50%).
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

test("Desfazer último arrasto remove só novas ordens e preserva o save",async({page})=>{
  test.setTimeout(90000);
  const errors=[];page.on("pageerror",error=>errors.push(error.message));
  await start(page);
  const initial=await snap(page);
  const cx=Math.floor(initial.spawn.x),cy=Math.floor(initial.spawn.y);
  const x=cx-5,y=cy-3;
  await reloadWithSave(page,s=>{
    s.minutes=360;s.sessionSpeed=0;
    const within=(a,b)=>a>=x&&a<x+4&&b>=y&&b<y+3;
    s.world.objects=s.world.objects.filter(o=>!within(o.x,o.y)&&!(o.x===cx+5&&o.y===cy-2));
    for(let yy=y;yy<y+3;yy++)for(let xx=x;xx<x+4;xx++)
      s.world.objects.push({x:xx,y:yy,kind:"twig",variant:0,age:0});
    s.world.objects.push({x:cx+5,y:cy-2,kind:"twig",variant:0,age:0});
    s.orders=[{id:(cx+5)+"-"+(cy-2)+":clear",type:"clear",x:cx+5,y:cy-2}];
    s.workers.forEach(w=>{w.task=null;w.route=[];w.routeTask=null;w.progress=0;});
  });
  if(await page.locator("#menu").isVisible())await page.locator("#continue").click();
  const original=(await snap(page)).orders.map(o=>o.id);
  expect(original).toHaveLength(1);
  await expect(page.locator("#undo-area-orders")).toBeDisabled();
  await page.locator("#orders-btn").click();
  await page.locator('[data-order-type="clear"]').click();
  await dragTiles(page,{x,y},{x:x+3,y:y+2});
  const staged=await snap(page);
  expect(staged.orders.length).toBeGreaterThan(original.length);
  expect(staged.orders.some(o=>o.id===original[0])).toBe(true);
  await expect(page.locator("#undo-area-orders")).toBeEnabled();
  await page.screenshot({path:"screenshots/ordens-desfazer-antes-1600x900.png",animations:"disabled"});
  await page.locator("#undo-area-orders").click();
  const after=await snap(page);
  expect(after.orders.map(o=>o.id)).toEqual(original);
  expect(after.groundItems).toEqual(initial.groundItems);
  await expect(page.locator("#undo-area-orders")).toBeDisabled();
  await page.setViewportSize({width:390,height:844});
  await expect(page.locator("#undo-area-orders")).toBeVisible();
  await page.screenshot({path:"screenshots/ordens-desfazer-mobile-390x844.png",animations:"disabled"});
  await page.reload({waitUntil:"load"});
  expect((await snap(page)).orders.map(o=>o.id)).toEqual(original);
  expect(errors).toEqual([]);
});
