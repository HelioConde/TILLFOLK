"use strict";
const {test,expect}=require("@playwright/test");
const {reloadWithSave}=require("./helpers/save-fixture.cjs");
const URL="http://127.0.0.1:4173/";

test("clique direito cancela ordem sobre o colono antes de abrir inventário",async({page})=>{
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.setViewportSize({width:1366,height:768});
  await page.goto(URL,{waitUntil:"networkidle"});
  await page.locator("#new-game").click();
  await page.locator('[data-game-mode="relaxed"]').click();
  await page.locator("#starter-confirm").click();
  const initial=await page.evaluate(()=>JSON.parse(localStorage.getItem("tillfolk-v01")));
  const x=Math.floor(initial.spawn.x),y=Math.floor(initial.spawn.y);
  await reloadWithSave(page,s=>{
    s.orders=[{id:x+"-"+y+":till",type:"till",x,y}];
    const worker=s.workers[0];
    worker.x=x+.5;worker.y=y+.5;
    worker.task=null;worker.haul=null;worker.route=[];worker.routeTask=null;
    worker.resting=false;
    s.minutes=360;s.sessionSpeed=0;
  });
  if(await page.locator("#menu").isVisible())await page.locator("#continue").click();
  const before=await page.evaluate(()=>JSON.parse(localStorage.getItem("tillfolk-v01")));
  expect(before.orders.some(o=>o.x===x&&o.y===y&&o.type==="till")).toBe(true);
  expect(Math.hypot(before.workers[0].x-x-.5,before.workers[0].y-y-.5)).toBeLessThan(.85);
  async function rightClick(){
    await page.locator("#world").evaluate((canvas,p)=>{
      const r=canvas.getBoundingClientRect();
      canvas.dispatchEvent(new MouseEvent("contextmenu",{
        bubbles:true,cancelable:true,button:2,
        clientX:r.left+(p.x+.5)*r.width/(canvas.width/32),
        clientY:r.top+(p.y+.5)*r.height/(canvas.height/32)
      }));
    },{x,y});
  }
  await rightClick();
  const after=await page.evaluate(()=>JSON.parse(localStorage.getItem("tillfolk-v01")));
  expect(after.orders.some(o=>o.x===x&&o.y===y)).toBe(false);
  await expect(page.locator("#worker-inventory-dialog")).toBeHidden();
  // Retomar o save também valida que o cancelamento persistiu.
  // A UI de atualização pode reconstruir o canvas entre interações.
  await page.goto(URL,{waitUntil:"load"});
  if(await page.locator("#menu").isVisible())await page.locator("#continue").click();
  await expect(page.locator("#world")).toHaveCount(1);
  const persisted=await page.evaluate(()=>JSON.parse(localStorage.getItem("tillfolk-v01")));
  expect(persisted.orders.some(o=>o.x===x&&o.y===y)).toBe(false);
  // Sem ordem, o clique direito continua abrindo o inventário do colono.
  await rightClick();
  await expect(page.locator("#worker-inventory-dialog")).toBeVisible();
  expect(errors).toEqual([]);
});
