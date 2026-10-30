const {test,expect}=require('@playwright/test');
const base='http://127.0.0.1:4173/';
async function startGame(page){
  await page.goto(base,{waitUntil:'networkidle'});
  await page.locator('#new-game').click();
  await page.locator('[data-game-mode="relaxed"]').click();
  await page.locator('#starter-confirm').click();
  await expect(page.locator('#world')).toBeVisible();
}
async function clickTile(page,x,y,button='left'){
  await page.locator('#world').evaluate((canvas,{x,y,button})=>{
    const r=canvas.getBoundingClientRect();
    const pointX=r.left+(x+.5)*r.width/28;
    const pointY=r.top+(y+.5)*r.height/18;
    canvas.dispatchEvent(new MouseEvent(button==='right'?'contextmenu':'click',{
      bubbles:true,cancelable:true,button:button==='right'?2:0,
      clientX:pointX,clientY:pointY
    }));
  },{x,y,button});
}
const house=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('tillfolk-v01')).house);

test('Casa em camadas: construir, apagar, desfazer e manter save sem banco',async({page})=>{
  const jsErrors=[],assetErrors=[];
  page.on('pageerror',e=>jsErrors.push(String(e)));
  page.on('response',r=>{if(r.status()>=400&&/\.(png|js|css)(\?|$)/i.test(r.url()))assetErrors.push(r.url());});
  await page.setViewportSize({width:1600,height:900});
  await startGame(page);
  await page.locator('[data-tool="construir"]').click();
  await expect(page.locator('#construction-panel')).toBeVisible();
  const first=await house(page);
  expect(first.floor.length).toBe(15);
  expect(first.anchor).toBe('4-7');
  await clickTile(page,9,8);
  expect((await house(page)).floor).toContain('9-8');
  await page.screenshot({path:'screenshots/casa-construcao-1600x900.png',animations:'disabled'});
  await page.locator('#build-undo').click();
  expect((await house(page)).floor).not.toContain('9-8');
  await clickTile(page,9,8);
  await clickTile(page,4,7,'right');
  expect((await house(page)).floor).toContain('4-7');
  await expect(page.locator('#build-status')).toContainText('fundação original');
  await page.locator('[data-build-layer="roof"]').click();
  await page.screenshot({path:'screenshots/casa-telhado-1600x900.png',animations:'disabled'});
  await page.locator('#build-roof').click();
  expect((await house(page)).roofHidden).toBe(true);
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#continue').click();
  expect((await house(page)).floor).toContain('9-8');
  expect((await house(page)).roofHidden).toBe(true);
  await page.locator('[data-tool="construir"]').click();
  await page.locator('#build-erase').click();
  await clickTile(page,9,8);
  expect((await house(page)).floor).not.toContain('9-8');
  expect(jsErrors).toEqual([]);
  expect(assetErrors).toEqual([]);
});
test('Editor touch, teclado e compatibilidade com salvamento antigo',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await startGame(page);
  await page.keyboard.press('b');
  await expect(page.locator('#construction-panel')).toBeVisible();
  await page.waitForTimeout(120);
  // No celular, o editor precisa apontar para a casa, nao apenas para a horta.
  const focus=await page.evaluate(()=>{
    const rect=document.querySelector('#world').getBoundingClientRect();
    const worldX=6.5*32/896;
    return rect.left+rect.width*worldX;
  });
  expect(focus).toBeGreaterThan(65);
  expect(focus).toBeLessThan(325);
  await page.locator('[data-build-layer="walls"]').click();
  await expect(page.locator('[data-build-layer="walls"]')).toHaveAttribute('aria-pressed','true');
  await page.screenshot({path:'screenshots/casa-construcao-mobile-390x844.png',animations:'disabled'});
  await page.keyboard.press('Escape');
  await expect(page.locator('#construction-panel')).toBeHidden();
  await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('tillfolk-v01'));delete s.house;localStorage.setItem('tillfolk-v01',JSON.stringify(s));});
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#continue').click();
  const old=await house(page);
  expect(old.floor.length).toBe(15);
  expect(old.door).toBe('6-9');
});
