const {test,expect}=require("@playwright/test");
const ROOT="http://127.0.0.1:4173/";
test("todas as 11 missões reaparecem corretamente após salvar, recarregar e continuar",async({page})=>{
  test.setTimeout(115000);
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto(ROOT,{waitUntil:"networkidle"});
  await page.locator("#new-game").click();
  await page.locator('[data-game-mode="relaxed"]').click();
  await page.locator("#starter-confirm").click();
  await page.locator('[data-speed="0"]').click();
  await page.addInitScript(()=>{
    const raw=sessionStorage.getItem("__tillfolkMissionFixture");
    if(!raw)return;
    localStorage.setItem("tillfolk-v01",raw);
    sessionStorage.removeItem("__tillfolkMissionFixture");
  });
  const steps=await page.evaluate(()=>window.TillfolkMissions.STEPS.map(s=>({key:s.key,title:s.title})));
  expect(steps.map(s=>s.key)).toEqual([
    "workstation","hoe","grass","seed","till","sow",
    "wateringCan","water","harvest","carry","axe"
  ]);
  for(let index=0;index<steps.length;index++){
    await page.evaluate(({index,steps})=>{
      const state=JSON.parse(localStorage.getItem("tillfolk-v01"));
      state.tutorial={active:true,step:index,finished:false,version:5,
        stats:Object.fromEntries(steps.map((s,i)=>[s.key,i<index?1:0]))};
      if(index>=1){
        state.crafting.station={x:40,y:25};
        state.workstations=[{x:40,y:25}];
      }else{
        state.crafting.station=null;state.workstations=[];
      }
      state.firstHarvest=index>=10;
      state.inventory.twigs=index===0?0:60;
      state.inventory.grass=60;
      sessionStorage.setItem("__tillfolkMissionFixture",JSON.stringify(state));
    },{index,steps});
    await page.reload({waitUntil:"networkidle"});
    await expect(page.locator("body")).toHaveClass(/play-session/);
    await expect(page.locator("#mission-card")).toBeVisible();
    await expect(page.locator("#mission-chapter")).toHaveText("MISSÃO "+(index+1)+" / "+steps.length);
    await expect(page.locator("#mission-title")).toHaveText(steps[index].title);
    await expect(page.locator("#mission-count")).toHaveText("0 / 1");
    const save=await page.evaluate(()=>JSON.parse(localStorage.getItem("tillfolk-v01")));
    expect(save.tutorial.step).toBe(index);
    expect(save.tutorial.finished).toBe(false);
  }
  expect(errors).toEqual([]);
});
