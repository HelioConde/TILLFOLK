const {test,expect}=require('@playwright/test');
const screenSizes=[
 {width:1600,height:900},{width:1366,height:768},
 {width:1125,height:790},{width:1024,height:768},
 {width:800,height:900},{width:390,height:844}
];
test('TILLFOLK: menu visível em todas as resoluções',async({page})=>{
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  for(const view of screenSizes){
    await page.setViewportSize(view);
    await page.waitForTimeout(250);
    const nav=page.locator('#menu .title-navigation');
    await expect(nav).toBeVisible();
    await expect(page.locator('#new-game')).toBeVisible();
    const limits=await page.evaluate(()=>{
      const menu=document.querySelector('#menu');
      const nav=menu.querySelector('.title-navigation').getBoundingClientRect();
      const first=menu.querySelector('#new-game').getBoundingClientRect();
      return {navLeft:nav.left,navRight:nav.right,navTop:nav.top,
        firstLeft:first.left,firstRight:first.right,
        viewportWidth:innerWidth,htmlWidth:document.documentElement.scrollWidth};
    });
    expect(limits.navLeft).toBeGreaterThanOrEqual(0);
    expect(limits.firstLeft).toBeGreaterThanOrEqual(0);
    expect(limits.navRight).toBeLessThanOrEqual(view.width+1);
    expect(limits.firstRight).toBeLessThanOrEqual(view.width+1);
    expect(limits.htmlWidth).toBeLessThanOrEqual(view.width+1);
    await page.screenshot({path:'screenshots/menu-'+view.width+'x'+view.height+'.png',fullPage:true,animations:'disabled'});
  }
  await page.setViewportSize({width:1125,height:790});
  await page.locator('#new-game').click();
  await expect(page.locator('#mode-dialog')).toBeVisible();
  await page.screenshot({path:'screenshots/modos-1125x790.png',animations:'disabled'});
  await page.locator('[data-game-mode="survival"]').click();
  await expect(page.locator('#starter-dialog')).toBeVisible();
  await page.screenshot({path:'screenshots/recrutamento-1125x790.png',animations:'disabled'});
});
test('Foco de teclado e movimento reduzido',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await page.locator('#new-game').focus();
  await expect(page.locator('#new-game')).toBeFocused();
  const focus=await page.locator('#new-game').evaluate(el=>getComputedStyle(el).outlineStyle);
  expect(focus).not.toBe('none');
});