const {test,expect}=require("@playwright/test");
const url="http://127.0.0.1:4173/";
async function start(page){
  await page.goto(url,{waitUntil:"networkidle"});
  await page.locator("#new-game").click();
  await page.locator('[data-game-mode="relaxed"]').click();
  await page.locator("#starter-confirm").click();
  await expect(page.locator("body")).toHaveClass(/play-session/);
  await expect(page.locator("#world")).toBeVisible();
}
test("mundo novo preserva fauna selvagem e não concede animais de criação",async({page})=>{
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.setViewportSize({width:1366,height:768});await start(page);
  const state=await page.evaluate(()=>JSON.parse(localStorage.getItem("tillfolk-v01")));
  expect(state).not.toBeNull();
  expect(state.workers).toHaveLength(2);
  expect(state.animals.filter(animal=>animal.wild)).not.toHaveLength(0);
  expect(state.animals.filter(animal=>!animal.wild)).toHaveLength(0);
  expect(state.water).toBe(0);
  expect(state.food).toBe(8);
  expect(errors).toEqual([]);
  await page.screenshot({path:"screenshots/qa-p0-fauna-selvagem.png",animations:"disabled"});
});
test("IA só prioriza ordens existentes e descanso oferece fallback seguro",async({page})=>{
  await page.setViewportSize({width:390,height:844});await start(page);
  const proof=await page.evaluate(()=>{
    const AI=window.TillfolkTaskAssignment,Rest=window.TillfolkRestRouting;
    const worker={x:10,y:10,energy:80,health:100,personalPriority:{}};
    const orders=[{id:"colher",type:"harvest",priority:7,x:10,y:10},
      {id:"arar",type:"till",priority:7,x:10,y:10}];
    const state={food:0,workers:[{},{}],priorities:{}};
    const after=AI.rank(worker,orders,state).map(o=>o.id);
    const resting=Rest.choose(worker,{x:42,y:42},{x:5,y:5},
      (_fx,_fy,x,y)=>x===41?[]:[{x:x+.5,y:y+.5}]);
    return {after,original:orders.map(o=>o.id),resting:resting.kind,
      fallback:resting.fallback,x:worker.x,y:worker.y};
  });
  expect(proof.after).toEqual(["colher","arar"]);
  expect(proof.original).toEqual(["colher","arar"]);
  expect(proof.resting).toBe("camp");
  expect(proof.fallback).toBe(true);
  expect([proof.x,proof.y]).toEqual([10,10]);
  await page.screenshot({path:"screenshots/qa-p0-ia-mobile.png",animations:"disabled"});
});
