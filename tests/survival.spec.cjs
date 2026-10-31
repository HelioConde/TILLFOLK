const {test,expect}=require("@playwright/test");
const BASE="http://127.0.0.1:4173/";
const SAVE_KEY="tillfolk-v01";

async function createSeedSave(browser){
  const context=await browser.newContext({viewport:{width:1366,height:768}});
  const page=await context.newPage();
  await page.goto(BASE,{waitUntil:"networkidle"});
  await expect(page.locator("#help-dialog")).toBeHidden();
  await page.locator("#new-game").click();
  await page.locator('[data-game-mode="survival"]').click();
  await page.locator("#starter-confirm").click();
  await expect(page.locator("#menu")).toBeHidden();
  const save=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY);
  await context.close();
  return save;
}

async function openSavedGame(browser,save,viewport){
  const context=await browser.newContext({viewport});
  await context.addInitScript(({key,data})=>{
    if(localStorage.getItem(key)===null)localStorage.setItem(key,JSON.stringify(data));
    localStorage.setItem("tillfolk-session-mode","play");
  },{key:SAVE_KEY,data:save});
  const page=await context.newPage();
  const errors=[],missing=[];
  page.on("pageerror",error=>errors.push(error.message));
  page.on("response",response=>{
    if(response.status()>=400&&/\.(js|css|png)(\?|$)/i.test(response.url()))missing.push(response.url());
  });
  await page.goto(BASE,{waitUntil:"networkidle"});
  return {context,page,errors,missing};
}

test("saves legados migram sem alterar mundo, recursos ou trabalhadores",async({browser})=>{
  const original=await createSeedSave(browser);
  original.workers.forEach((worker,index)=>{worker.name="Colono personalizado "+(index+1);});
  const oldSave=structuredClone(original);
  delete oldSave.survivalVersion;
  delete oldSave.gameOver;
  delete oldSave.deaths;
  delete oldSave.startingColonists;
  for(const worker of oldSave.workers){
    delete worker.satiety;
    delete worker.health;
    delete worker.hungerState;
    delete worker.starvationMinutes;
    delete worker.lastMealDay;
  }
  const {context,page}=await openSavedGame(browser,oldSave,{width:1366,height:768});
  await expect(page.locator("#menu")).toBeHidden();
  const migrated=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY);
  expect(migrated.survivalVersion).toBe(1);
  expect(migrated.world.seed).toBe(original.world.seed);
  expect(migrated.food).toBe(original.food);
  expect(migrated.workers.map(worker=>worker.name)).toEqual(original.workers.map(worker=>worker.name));
  expect(migrated.workers.every(worker=>worker.satiety===100&&worker.health===100)).toBe(true);
  expect(migrated.deaths).toEqual([]);
  await context.close();
});

test("consome estoque real quando um colono faminto procura refeição",async({browser})=>{
  const save=await createSeedSave(browser);
  save.food=1;
  save.workers[0].satiety=29;
  save.workers[0].hungerState="hungry";
  save.workers[1].satiety=100;
  save.workers[1].hungerState="fed";
  const {context,page,errors}=await openSavedGame(browser,save,{width:1366,height:768});
  await expect(page.locator("#survival-population")).toBeVisible();
  await expect(page.locator("#survival-consumption-count")).toHaveText("2.0");
  await expect(page.locator("#survival-food-count")).toHaveText("0");
  await expect(page.locator("#survival-days-count")).toHaveText("0.0");
  await page.reload({waitUntil:"networkidle"});
  const afterMeal=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY);
  expect(afterMeal.food).toBe(0);
  expect(afterMeal.workers[0].satiety).toBeGreaterThan(90);
  expect(afterMeal.food).toBeGreaterThanOrEqual(0);
  await expect(page.locator("#survival-alert")).toHaveClass(/critical/);
  expect(errors).toEqual([]);
  await context.close();
});

test("pausa e velocidades 1x/3x/6x persistem com save de sobrevivência",async({browser})=>{
  const save=await createSeedSave(browser);
  save.food=0;
  save.workers.forEach(worker=>{worker.satiety=55;worker.hungerState="fed";});
  const {context,page}=await openSavedGame(browser,save,{width:1366,height:768});
  await page.locator('[data-speed="0"]').click();
  await expect(page.locator('[data-speed="0"]')).toHaveAttribute("aria-pressed","true");
  const savedSatiety=await page.evaluate(key=>
    JSON.parse(localStorage.getItem(key)).workers.map(worker=>worker.satiety),SAVE_KEY);
  await page.waitForTimeout(300);
  let paused=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY);
  expect(paused.sessionSpeed).toBe(0);
  expect(paused.workers.map(worker=>worker.satiety)).toEqual(savedSatiety);
  await page.reload({waitUntil:"networkidle"});
  await expect(page.locator('[data-speed="0"]')).toHaveAttribute("aria-pressed","true");
  for(const speed of [1,3,6]){
    await page.locator(`[data-speed="${speed}"]`).click();
    await expect(page.locator(`[data-speed="${speed}"]`)).toHaveAttribute("aria-pressed","true");
    const stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).sessionSpeed,SAVE_KEY);
    expect(stored).toBe(speed);
  }
  await context.close();
});

test("Game Over persiste após reload e reiniciar cria uma colônia válida",async({browser})=>{
  const save=await createSeedSave(browser);
  save.food=0;
  save.deaths=[];
  save.gameOver=false;
  save.workers.forEach(worker=>{
    worker.satiety=0;
    worker.hungerState="starving";
    worker.starvationMinutes=4320;
    worker.health=0.001;
  });
  const {context,page}=await openSavedGame(browser,save,{width:1366,height:768});
  await expect(page.locator("[data-gameover-dialog]")).toBeVisible();
  await expect(page.locator("[data-gameover-dialog]")).toContainText("A Colônia Falhou");
  let finalSave=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY);
  expect(finalSave.gameOver).toBe(true);
  expect(finalSave.workers).toHaveLength(0);
  expect(finalSave.deaths).toHaveLength(2);
  await page.reload({waitUntil:"networkidle"});
  await expect(page.locator("[data-gameover-dialog]")).toBeVisible();
  finalSave=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY);
  expect(finalSave.deaths).toHaveLength(2);
  await page.locator("#gameover-restart").click();
  await expect(page.locator("#menu")).toBeHidden();
  const restarted=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY);
  expect(restarted.gameOver).toBe(false);
  expect(restarted.workers).toHaveLength(2);
  expect(restarted.food).toBe(8);
  await context.close();
});

test("HUD e cartões individuais cabem no desktop e no mobile",async({browser})=>{
  const save=await createSeedSave(browser);
  const {context,page,missing}=await openSavedGame(browser,save,{width:1366,height:768});
  await expect(page.locator("#survival-population-count")).toHaveText("2");
  await expect(page.locator("#survival-food-count")).toHaveText("8");
  await expect(page.locator("#survival-days-count")).toHaveText("4.0");
  await expect(page.locator("#survival-population")).toBeVisible();
  let dimensions=await page.evaluate(()=>({
    width:document.documentElement.scrollWidth,
    viewport:innerWidth
  }));
  expect(dimensions.width).toBeLessThanOrEqual(dimensions.viewport+1);
  await page.screenshot({path:"test-results/survival-desktop-1366x768.png",animations:"disabled"});
  await page.setViewportSize({width:1600,height:900});
  await expect(page.locator("#survival-population")).toBeVisible();
  dimensions=await page.evaluate(()=>({
    width:document.documentElement.scrollWidth,
    viewport:innerWidth
  }));
  expect(dimensions.width).toBeLessThanOrEqual(dimensions.viewport+1);
  await page.screenshot({path:"test-results/survival-desktop-1600x900.png",animations:"disabled"});
  await page.setViewportSize({width:390,height:844});
  await expect(page.locator("#survival-population")).toBeVisible();
  await expect(page.locator("#survival-food")).toBeVisible();
  await expect(page.locator("#open-workers")).toBeVisible();
  dimensions=await page.evaluate(()=>({
    width:document.documentElement.scrollWidth,
    viewport:innerWidth
  }));
  expect(dimensions.width).toBeLessThanOrEqual(dimensions.viewport+1);
  await page.locator("#open-workers").click();
  await expect(page.locator(".worker")).toHaveCount(2);
  await expect(page.locator(".worker-bar.hunger-bar")).toHaveCount(2);
  await expect(page.locator(".worker-bar.health-bar")).toHaveCount(2);
  await page.screenshot({path:"test-results/survival-mobile-390x844.png",animations:"disabled"});
  expect(missing).toEqual([]);
  await context.close();
});
