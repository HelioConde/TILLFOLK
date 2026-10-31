const {test,expect}=require("@playwright/test");
const URL="http://127.0.0.1:4173/";
const snapshot=page=>page.evaluate(()=>JSON.parse(localStorage.getItem("tillfolk-v01")));

async function beginFarm(page){
  await page.goto(URL,{waitUntil:"networkidle"});
  await expect(page.locator("#menu")).toBeVisible();
  await page.locator("#new-game").click();
  await page.locator('[data-game-mode="relaxed"]').click();
  await page.locator("#starter-confirm").click();
  await expect(page.locator("#menu")).toBeHidden();
  await expect(page.locator("#world")).toBeVisible();
}

test("sem save abre menu, mas atualizar uma partida aberta retorna ao jogo",async({page})=>{
  const errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.goto(URL,{waitUntil:"networkidle"});
  await expect(page.locator("#menu")).toBeVisible();
  await expect(page.locator("#continue")).toBeDisabled();
  await beginFarm(page);
  await page.locator('[data-speed="0"]').click();
  const before=await snapshot(page);
  expect(before.sessionSpeed).toBe(0);
  await page.reload({waitUntil:"networkidle"});
  await expect(page.locator("#menu")).toBeHidden();
  await expect(page.locator("body")).toHaveClass(/play-session/);
  await expect(page.locator("#world")).toBeVisible();
  await expect(page.locator('[data-speed="0"]')).toHaveAttribute("aria-pressed","true");
  const after=await snapshot(page);
  expect(after.world.seed).toBe(before.world.seed);
  expect(after.farmName).toBe(before.farmName);
  expect(after.workers.map(w=>w.name)).toEqual(before.workers.map(w=>w.name));
  expect(after.tutorial.step).toBe(before.tutorial.step);
  expect(after.day).toBe(before.day);
  expect(after.minutes).toBeCloseTo(before.minutes,1);
  await page.screenshot({path:"screenshots/sessao-recarregou-no-jogo.png",animations:"disabled"});
  expect(errors).toEqual([]);
});

test("uma nova aba também encontra a fazenda em andamento",async({page})=>{
  await beginFarm(page);
  const before=await snapshot(page);
  await page.close();
  const opened=await page.context().newPage();
  await opened.goto(URL,{waitUntil:"networkidle"});
  await expect(opened.locator("#menu")).toBeHidden();
  await expect(opened.locator("#world")).toBeVisible();
  const after=await snapshot(opened);
  expect(after.world.seed).toBe(before.world.seed);
  await opened.close();
});

test("retornar ao menu é respeitado no reload; Continuar reativa retomada automática",async({page})=>{
  await beginFarm(page);
  await expect(page.locator("#mission-card")).toBeVisible();
  const before=await snapshot(page);
  await page.locator("#menu-btn").click();
  await expect(page.locator("#game-options-dialog")).toBeVisible();
  await page.locator("#game-return-title").click();
  await expect(page.locator("#menu")).toBeVisible();
  await expect(page.locator("#mission-card")).toBeHidden();
  await expect(page.locator("#mission-card")).toHaveAttribute("hidden","");
  await page.screenshot({path:"screenshots/menu-sem-missao-sobreposta.png",animations:"disabled"});
  expect(await page.evaluate(()=>localStorage.getItem("tillfolk-session-mode"))).toBe("menu");
  await page.reload({waitUntil:"networkidle"});
  await expect(page.locator("#menu")).toBeVisible();
  await expect(page.locator("#mission-card")).toBeHidden();
  await expect(page.locator("#continue")).toBeEnabled();
  await page.locator("#continue").click();
  await expect(page.locator("#menu")).toBeHidden();
  await expect(page.locator("#mission-card")).toBeVisible();
  expect((await snapshot(page)).world.seed).toBe(before.world.seed);
  expect(await page.evaluate(()=>localStorage.getItem("tillfolk-session-mode"))).toBe("play");
  await page.reload({waitUntil:"networkidle"});
  await expect(page.locator("#menu")).toBeHidden();
});

test("salvamento antigo sem indicador de sessão retoma automaticamente",async({page})=>{
  await beginFarm(page);
  const initial=await snapshot(page);
  await page.evaluate(()=>localStorage.removeItem("tillfolk-session-mode"));
  await page.reload({waitUntil:"networkidle"});
  await expect(page.locator("#menu")).toBeHidden();
  expect((await snapshot(page)).world.seed).toBe(initial.world.seed);
});

test("save corrompido não é substituído por um mundo novo",async({page})=>{
  await page.goto(URL,{waitUntil:"networkidle"});
  await page.evaluate(()=>{
    localStorage.setItem("tillfolk-v01","{save-invalido");
    localStorage.setItem("tillfolk-session-mode","play");
  });
  await page.reload({waitUntil:"networkidle"});
  await expect(page.locator("#menu")).toBeVisible();
  expect(await page.evaluate(()=>localStorage.getItem("tillfolk-v01"))).toBe("{save-invalido");
  await page.locator("#continue").click();
  await expect(page.locator("#menu")).toBeVisible();
  expect(await page.evaluate(()=>localStorage.getItem("tillfolk-v01"))).toBe("{save-invalido");
});
