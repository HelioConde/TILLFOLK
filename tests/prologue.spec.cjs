const {test,expect}=require("@playwright/test");
const BASE="http://127.0.0.1:4173/";
const snap=page=>page.evaluate(()=>JSON.parse(localStorage.getItem("tillfolk-v01")));
async function newFarm(page){
  await page.goto(BASE,{waitUntil:"networkidle"});
  await page.locator("#new-game").click();
  await page.locator('[data-game-mode="relaxed"]').click();
  await page.locator("#starter-confirm").click();
  await expect(page.locator("#world")).toBeVisible();
}
async function clickTile(page,x,y){
  await page.locator("#world").evaluate((canvas,p)=>{
    const r=canvas.getBoundingClientRect();
    canvas.dispatchEvent(new MouseEvent("click",{bubbles:true,
      clientX:r.left+(p.x+.5)*r.width/(canvas.width/32),
      clientY:r.top+(p.y+.5)*r.height/(canvas.height/32)}));
  },{x,y});
}

test("Início sem ferramentas: coleta manual acessível e missão visível",async({page})=>{
  await page.setViewportSize({width:1366,height:768});
  await newFarm(page);
  const s=await snap(page);
  expect(s.inventory.wood).toBe(0);
  expect(s.inventory.twigs).toBe(0);
  expect(Object.values(s.tools).every(v=>!v)).toBe(true);
  expect(s.animals).toEqual([]);
  expect(s.prologue.stage).toBe(0);
  for(const [kind,min] of [["twig",12],["pebble",9],["grass",12]]){
    expect(s.world.objects.filter(o=>o.starterResource&&o.kind===kind).length).toBeGreaterThanOrEqual(min);
  }
  await expect(page.locator("#prologue-card")).toBeVisible();
  await expect(page.locator("#prologue-title")).toContainText("O vale começa");
  await page.locator("#prologue-open").click();
  await expect(page.locator("#prologue-details")).toBeVisible();
  await expect(page.locator("#prologue-description")).toContainText("mãos");
  const plot=s.plots.find(p=>p.x===40&&p.y===25);
  expect(plot).toBeTruthy();
  const noHoe=await page.evaluate(p=>window.TillfolkOrders.status({type:"till",x:p.x,y:p.y},p,null,
    JSON.parse(localStorage.getItem("tillfolk-v01"))),plot);
  expect(noHoe.reason).toContain("enxada");
  const twig=s.world.objects.find(o=>o.kind==="twig"&&o.starterResource);
  await clickTile(page,twig.x,twig.y);
  expect((await snap(page)).orders).toContainEqual({id:twig.x+"-"+twig.y+":clear",type:"clear",x:twig.x,y:twig.y});
  await page.screenshot({path:"screenshots/tutorial-primeira-missao-1366x768.png",animations:"disabled"});
});

test("Coleta realmente concluída incrementa gravetos sem inventar tarefa",async({page})=>{
  test.setTimeout(45000);
  await newFarm(page);
  const s=await snap(page),twig=s.world.objects.find(o=>o.kind==="twig"&&o.starterResource);
  expect(twig).toBeTruthy();
  await clickTile(page,twig.x,twig.y);
  await page.locator('[data-speed="6"]').click();
  await expect.poll(async()=> (await snap(page)).inventory.twigs,{timeout:28000,intervals:[250,500]}).toBeGreaterThan(0);
  const after=await snap(page);
  expect(after.prologue.stats.twig).toBeGreaterThan(0);
  expect(after.orders.some(o=>o.id===twig.x+"-"+twig.y+":clear")).toBe(false);
  expect(after.tools.axe).toBe(0);
});

test("Oficina cria cinco ferramentas com custo, desbloqueia ordens e persiste",async({page})=>{
  await newFarm(page);
  await page.evaluate(()=>{
    const s=JSON.parse(localStorage.getItem("tillfolk-v01"));
    s.inventory.twigs=12;s.inventory.stone=10;s.inventory.wood=3;
    localStorage.setItem("tillfolk-v01",JSON.stringify(s));
  });
  await page.reload({waitUntil:"networkidle"});
  await page.locator("#continue").click();
  await page.locator("#workshop-open").click();
  await expect(page.locator("#workshop-dialog")).toBeVisible();
  for(const tool of ["axe","pickaxe","hoe","shovel","bucket"]){
    await page.locator('[data-craft-tool="'+tool+'"]').click();
    await expect(page.locator('[data-craft-tool="'+tool+'"]')).toBeDisabled();
  }
  const state=await snap(page);
  expect(Object.values(state.tools)).toEqual([1,1,1,1,1]);
  expect(state.inventory.twigs).toBe(4);
  expect(state.inventory.stone).toBe(3);
  expect(state.inventory.wood).toBe(1);
  await page.screenshot({path:"screenshots/tutorial-oficina-desktop.png",animations:"disabled"});
  await page.locator("#workshop-dialog .modal-x").click();
  await page.reload({waitUntil:"networkidle"});
  await page.locator("#continue").click();
  expect((await snap(page)).tools).toEqual(state.tools);
});

test("Campanha termina na cabana e nunca gera missões infinitas",async({page})=>{
  await newFarm(page);
  const reached=await page.evaluate(()=>{
    const api=window.TillfolkPrologue,s=JSON.parse(localStorage.getItem("tillfolk-v01"));
    s.tools=Object.fromEntries(Object.keys(api.RECIPES).map(k=>[k,1]));
    const counts={twig:3,pebble:2,grass:3,seed:1,wood:8,till:1,sow:1,water:1,harvest:1,carry:1,buildHome:1};
    for(const [key,count] of Object.entries(counts))api.event(s,key,count);
    localStorage.setItem("tillfolk-v01",JSON.stringify(s));
    return api.snapshot(s);
  });
  expect(reached.done).toBe(true);
  expect(reached.stage).toBe(reached.total);
  await page.reload({waitUntil:"networkidle"});
  await page.locator("#continue").click();
  await expect(page.locator("#prologue-title")).toContainText("aprendeu a sobreviver");
  await expect(page.locator("#prologue-goals")).toContainText("10 missões concluídas");
  expect((await snap(page)).prologue.done).toBe(true);
});

test("Salvar antigo conserva ferramentas desbloqueadas e não reinicia prólogo",async({page})=>{
  await newFarm(page);
  await page.evaluate(()=>{
    const s=JSON.parse(localStorage.getItem("tillfolk-v01"));
    delete s.tools;delete s.prologue;
    s.inventory.wood=15;
    localStorage.setItem("tillfolk-v01",JSON.stringify(s));
  });
  await page.reload({waitUntil:"networkidle"});
  await page.locator("#continue").click();
  const s=await snap(page);
  expect(s.inventory.wood).toBe(15);
  expect(s.prologue.done).toBe(true);
  expect(Object.values(s.tools).every(v=>v===1)).toBe(true);
});

test("UI mobile: missão pode expandir e oficina não corta a tela",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await newFarm(page);
  await page.locator("#prologue-open").click();
  await expect(page.locator("#prologue-details")).toBeVisible();
  await page.screenshot({path:"screenshots/tutorial-primeira-missao-390x844.png",animations:"disabled"});
  await page.locator("#workshop-open").click();
  await expect(page.locator("#workshop-dialog")).toBeVisible();
  const box=await page.locator("#workshop-dialog").boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x+box.width).toBeLessThanOrEqual(391);
  await page.screenshot({path:"screenshots/tutorial-oficina-390x844.png",animations:"disabled"});
});
