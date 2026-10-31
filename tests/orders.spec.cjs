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
  await expect(page.locator('[data-order-type]')).toHaveCount(7);
  await page.screenshot({path:'screenshots/ordens-paleta-mobile-390x844.png',animations:'disabled'});
  await page.locator('[data-order-type="water"]').click();
  await expect(page.locator('#orders-panel')).toBeHidden();
  await tile(page,13,11);
  expect((await snap(page)).orders.map(x=>x.type)).toEqual(['water']);
  await page.locator('[data-tool="remover"]').click();
  await tile(page,13,11);
  expect((await snap(page)).orders).toEqual([]);
});
