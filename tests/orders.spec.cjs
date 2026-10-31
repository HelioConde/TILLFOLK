const {test,expect}=require('@playwright/test');
const BASE='http://127.0.0.1:4173/';
const snap=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('tillfolk-v01')));
async function start(page){
  await page.goto(BASE,{waitUntil:'networkidle'});
  await page.locator('#new-game').click();
  await page.locator('[data-game-mode="relaxed"]').click();
  await page.locator('#starter-confirm').click();
  await expect(page.locator('#world')).toBeVisible();
}
async function choose(page,type){
  await page.locator('#orders-btn').click();
  await page.locator('[data-order-type="'+type+'"]').click();
}
async function tile(page,x,y){
  await page.locator('#world').evaluate((canvas,{x,y})=>{
    const rect=canvas.getBoundingClientRect();
    canvas.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,
      clientX:rect.left+rect.width*(x+.5)/28,clientY:rect.top+rect.height*(y+.5)/18}));
  },{x,y});
}
test('O jogador decide cada etapa: arar não cria fertilizar, semear ou regar',async({page})=>{
  const errors=[],missing=[];
  page.on('pageerror',error=>errors.push(String(error)));
  page.on('response',response=>{if(response.status()>=400&&/\.(js|css|png)(\?|$)/.test(response.url()))missing.push(response.url());});
  await page.setViewportSize({width:1600,height:900});
  await start(page);
  expect((await snap(page)).orders).toEqual([]);
  // O centro da clareira é livre por definição do gerador de terreno.
  await tile(page,13,11);
  let state=await snap(page);
  expect(state.orders).toEqual([{id:'13-11:till',type:'till',x:13,y:11}]);
  await expect(page.locator('#task-count')).toHaveText('1');
  await page.screenshot({path:'screenshots/ordens-somente-arar-desktop.png',animations:'disabled'});
  // Simula o estado após concluir a etapa, sem adicionar novas ordens.
  await page.evaluate(()=>{
    const key='tillfolk-v01',s=JSON.parse(localStorage.getItem(key));
    s.plots.find(p=>p.x===13&&p.y===11).tilled=true;
    localStorage.setItem(key,JSON.stringify(s));
  });
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#continue').click();
  await expect(page.locator('#task-count')).toHaveText('0');
  state=await snap(page);
  const p=state.plots.find(p=>p.x===13&&p.y===11);
  expect(p.tilled).toBe(true);
  expect(p.fertilized).toBe(false);
  expect(p.seeded).toBe(false);
  expect(p.watered).toBe(false);
  expect(state.orders).toEqual([]);
  await choose(page,'sow');
  await tile(page,13,11);
  expect((await snap(page)).orders.map(o=>o.type)).toEqual(['sow']);
  await page.locator('#open-tasks').click();
  await expect(page.locator('#tasks')).toContainText('Semear');
  await page.locator('#tasks [data-task-group="waiting"] summary').click();
  await page.locator('[data-cancel-order="13-11:sow"]').click();
  expect((await snap(page)).orders).toEqual([]);
  expect(errors).toEqual([]);
  expect(missing).toEqual([]);
});
test('Fila manual aceita ordens futuras, aguarda pré-requisitos e salva no localStorage',async({page})=>{
  await page.setViewportSize({width:1600,height:900});
  await start(page);
  const tree=await page.evaluate(()=>{
    const s=JSON.parse(localStorage.getItem('tillfolk-v01'));
    return s.world.objects.find(o=>o.kind==='tree'&&s.plots.some(p=>p.x===o.x&&p.y===o.y));
  });
  expect(tree).toBeTruthy();
  await choose(page,'till');
  await tile(page,tree.x,tree.y);
  await choose(page,'clear');
  await tile(page,tree.x,tree.y);
  let s=await snap(page);
  expect(s.orders.map(x=>x.type)).toEqual(['till','clear']);
  await page.locator('#open-tasks').click();
  await expect(page.locator('#tasks')).toContainText('Aguardando ordem de limpeza');
  await page.screenshot({path:'screenshots/ordens-fila-prerequisitos.png',animations:'disabled'});
  await page.locator('#drawer-close').click();
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#continue').click();
  s=await snap(page);
  expect(s.orders).toHaveLength(2);
  expect(s.orders.map(x=>x.type)).toEqual(['till','clear']);
  // O jogador não solicitou outras etapas; nem um reload pode criá-las.
  expect(s.orders.some(o=>['fertilize','sow','water','harvest','carry'].includes(o.type))).toBe(false);
});
test('Saves anteriores não são interpretados como ordem para cultivo automático',async({page})=>{
  await start(page);
  await page.evaluate(()=>{
    const key='tillfolk-v01',s=JSON.parse(localStorage.getItem(key));
    delete s.orders;
    const p=s.plots.find(p=>p.x===13&&p.y===11);
    p.selected=true;p.tilled=true;p.fertilized=false;p.seeded=false;
    localStorage.setItem(key,JSON.stringify(s));
  });
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#continue').click();
  const s=await snap(page);
  expect(s.orders).toEqual([]);
  expect(s.plots.find(p=>p.x===13&&p.y===11).tilled).toBe(true);
  await expect(page.locator('#task-count')).toHaveText('0');
});
test('Mobile: paleta de sete ordens e cancelamento de uma tarefa',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await start(page);
  await page.locator('#orders-btn').click();
  await expect(page.locator('#orders-panel')).toBeVisible();
  await expect(page.locator('[data-order-type]')).toHaveCount(10);
  await page.screenshot({path:'screenshots/ordens-paleta-mobile-390x844.png',animations:'disabled'});
  await page.locator('[data-order-type="water"]').click();
  await expect(page.locator('#orders-panel')).toBeHidden();
  await tile(page,13,11);
  expect((await snap(page)).orders.map(x=>x.type)).toEqual(['water']);
  await page.locator('[data-tool="remover"]').click();
  await tile(page,13,11);
  expect((await snap(page)).orders).toEqual([]);
});

test('Muitas ordens bloqueadas são agrupadas e um trabalhador ocioso explica a causa',async({page})=>{
  await page.setViewportSize({width:1366,height:768});
  await start(page);
  await page.evaluate(()=>{
    const s=JSON.parse(localStorage.getItem('tillfolk-v01'));
    // Ambas as pessoas continuam respeitando o traço negativo de Limpar.
    s.workers.forEach(w=>{w.neg=[...new Set([...w.neg,'clear'])];w.task=null;});
    const possible=s.world.objects.filter(o=>o.kind==='grass'||o.kind==='tree').slice(0,15);
    s.orders=possible.map(o=>({id:o.x+'-'+o.y+':clear',type:'clear',x:o.x,y:o.y}));
    for(const p of s.plots.filter(p=>p.x>8&&p.y>6).slice(0,12)){
      s.orders.push({id:p.x+'-'+p.y+':sow',type:'sow',x:p.x,y:p.y});
    }
    localStorage.setItem('tillfolk-v01',JSON.stringify(s));
  });
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#continue').click();
  await page.locator('#open-tasks').click();
  const waiting=page.locator('#tasks [data-task-group="waiting"]');
  await expect(waiting).toBeVisible();
  await expect(waiting).not.toHaveAttribute('open','');
  await expect(waiting.locator('summary')).toContainText('aguardando');
  await waiting.locator('summary').click();
  await expect(waiting).toHaveAttribute('open','');
  await expect(waiting).toContainText('Nenhum colono pode executar');
  await page.waitForTimeout(900);
  await expect(waiting).toHaveAttribute('open','');
  await page.screenshot({path:'screenshots/fila-bloqueada-e-ociosos.png',animations:'disabled'});
  await page.locator('#open-workers').click();
  await expect(page.locator('.worker-job').first()).toContainText('Restrições impedem');
  await expect(page.locator('.worker-status').first()).toContainText('Aguardando');
  // Remover a proibição de um trabalhador recupera a execução na próxima rodada.
  await page.evaluate(()=>{
    const s=JSON.parse(localStorage.getItem('tillfolk-v01'));
    s.workers[0].neg=s.workers[0].neg.filter(type=>type!=='clear');
    localStorage.setItem('tillfolk-v01',JSON.stringify(s));
  });
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#continue').click();
  await expect.poll(async()=>{
    const s=await snap(page);
    return s.workers.some(w=>w.task&&w.task.endsWith(':clear'));
  },{timeout:9000}).toBe(true);
});

test('Ordens sem recurso ficam agrupadas, sem obrigar tarefas automáticas extras',async({page})=>{
  await start(page);
  await choose(page,'sow');
  await tile(page,13,11);
  await page.locator('#open-tasks').click();
  await expect(page.locator('#tasks .task-list-summary')).toContainText('aguardando');
  await expect(page.locator('#tasks [data-task-group="waiting"]')).toBeVisible();
  await page.locator('#tasks [data-task-group="waiting"] summary').click();
  await expect(page.locator('#tasks [data-task-group="waiting"]')).toContainText('Aguardando arar o solo');
  expect((await snap(page)).orders).toHaveLength(1);
});
