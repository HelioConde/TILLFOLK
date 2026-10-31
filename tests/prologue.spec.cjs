const {test,expect}=require("@playwright/test");
const BASE="http://127.0.0.1:4173/";
const snap=page=>page.evaluate(()=>JSON.parse(localStorage.getItem("tillfolk-v01")));
async function newFarm(page){
  await page.goto(BASE,{waitUntil:"networkidle"});
  await page.locator("#new-game").click();
  await page.locator('[data-game-mode="tutorial"]').click();
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
  await expect(page.locator("#prologue-card")).toBeHidden();
  await expect(page.locator("#workshop-hud-button")).toBeVisible();
  const saved=await snap(page);
  expect(saved.prologue.done).toBe(true);
  expect(saved.mode).toBe("survival");
  expect(saved.workers).toHaveLength(2);
  expect(saved.inventory.wood).toBe(0);
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
  await expect(page.locator("#tutorial-speech")).toBeVisible();
  await expect(page.locator("#tutorial-speech-text")).toContainText("gravat");
  await page.screenshot({path:"screenshots/tutorial-primeira-missao-390x844.png",animations:"disabled"});
  await page.locator("#prologue-open").click();
  await expect(page.locator("#prologue-dialog")).toBeVisible();
  await expect(page.locator("#prologue-dialog-description")).toContainText("gravetos");
  await page.screenshot({path:"screenshots/tutorial-missao-detalhes-390x844.png",animations:"disabled"});
  await page.locator("#prologue-dialog-craft").click();
  await expect(page.locator("#workshop-dialog")).toBeVisible();
  const box=await page.locator("#workshop-dialog").boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x+box.width).toBeLessThanOrEqual(391);
  await page.screenshot({path:"screenshots/tutorial-oficina-390x844.png",animations:"disabled"});
});


test("Menu apresenta Tutorial, Sobrevivência e Fazenda tranquila em tela pequena",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(BASE,{waitUntil:"networkidle"});
  await page.locator("#new-game").click();
  const modes=page.locator("#mode-dialog [data-game-mode]");
  await expect(modes).toHaveCount(3);
  await expect(page.locator('[data-game-mode="tutorial"]')).toContainText("Tutorial guiado");
  await expect(page.locator('[data-game-mode="survival"]')).toContainText("Sobrevivência");
  await expect(page.locator('[data-game-mode="relaxed"]')).toContainText("Fazenda tranquila");
  await page.screenshot({path:"screenshots/modos-tutorial-normal-390x844.png",animations:"disabled"});
  const dialog=await page.locator("#mode-dialog").boundingBox();
  expect(dialog.x).toBeGreaterThanOrEqual(0);
  expect(dialog.x+dialog.width).toBeLessThanOrEqual(391);
});

for(const gameMode of ["survival","relaxed"]){
  test("Modo normal "+gameMode+" não mostra missões nem falas e mantém oficina",async({page})=>{
    await page.goto(BASE,{waitUntil:"networkidle"});
    await page.locator("#new-game").click();
    await page.locator('[data-game-mode="'+gameMode+'"]').click();
    await page.locator("#starter-confirm").click();
    const before=await snap(page);
    expect(before.mode).toBe(gameMode);
    await expect(page.locator("#prologue-card")).toBeHidden();
    await expect(page.locator("#tutorial-speech")).toBeHidden();
    await expect(page.locator("#workshop-hud-button")).toBeVisible();
    await page.locator("#workshop-hud-button").click();
    await expect(page.locator("#workshop-dialog")).toBeVisible();
    await page.locator("#workshop-dialog .modal-x").click();
    await page.reload({waitUntil:"networkidle"});
    await page.locator("#continue").click();
    await expect(page.locator("#prologue-card")).toBeHidden();
    await expect(page.locator("#tutorial-speech")).toBeHidden();
    expect((await snap(page)).mode).toBe(gameMode);
  });
}

test("Última missão encerra guia, mantém a fazenda e troca para Sobrevivência",async({page})=>{
  await newFarm(page);
  const prior=await snap(page);
  // Todos os capítulos anteriores realizados; falta terminar a cabana.
  await page.evaluate(()=>{
    const api=window.TillfolkPrologue,s=JSON.parse(localStorage.getItem("tillfolk-v01"));
    s.tools=Object.fromEntries(Object.keys(api.RECIPES).map(id=>[id,1]));
    for(const [type,count] of Object.entries({
      twig:3,pebble:2,grass:3,seed:1,wood:8,till:1,sow:1,water:1,harvest:1,carry:1
    }))api.event(s,type,count);
    localStorage.setItem("tillfolk-v01",JSON.stringify(s));
  });
  await page.reload({waitUntil:"networkidle"});
  await page.locator("#continue").click();
  await expect(page.locator("#prologue-card")).toBeVisible();
  const before=await snap(page);
  expect(before.prologue.stage).toBe(9);
  // A migração de save completo também representa a conclusão atômica após
  // uma casa: após recarregar, não existe novo prólogo nem reset de estado.
  await page.evaluate(()=>{
    const api=window.TillfolkPrologue,s=JSON.parse(localStorage.getItem("tillfolk-v01"));
    api.event(s,"buildHome");
    s.homes.push({x:42,y:26,residentId:null,legacy:false});
    localStorage.setItem("tillfolk-v01",JSON.stringify(s));
  });
  await page.reload({waitUntil:"networkidle"});
  await page.locator("#continue").click();
  const after=await snap(page);
  expect(after.mode).toBe("survival");
  expect(after.prologue.done).toBe(true);
  expect(after.homes.some(h=>h.x===42&&h.y===26)).toBe(true);
  expect(after.workers.map(w=>w.id)).toEqual(prior.workers.map(w=>w.id));
  await expect(page.locator("#prologue-card")).toBeHidden();
  await expect(page.locator("#tutorial-speech")).toBeHidden();
  await expect(page.locator("#workshop-hud-button")).toBeVisible();
  await page.screenshot({path:"screenshots/tutorial-concluido-jogo-normal.png",animations:"disabled"});
});
