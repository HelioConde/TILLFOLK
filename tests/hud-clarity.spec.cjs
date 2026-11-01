const {test,expect}=require('@playwright/test');

async function startFarm(page){
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await page.locator('#new-game').click();
  await page.locator('[data-game-mode="relaxed"]').click();
  await page.locator('#starter-confirm').click();
  await expect(page.locator('body')).toHaveClass(/play-session/);
}

test('minimapa claro: regiões recolhidas, navegação e retorno ao centro',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width:1600,height:900});
  await startFarm(page);
  await expect(page.locator('#minimap')).toBeVisible();
  await expect(page.locator('#biome-details')).not.toHaveAttribute('open','');
  await expect(page.locator('#biome-legend')).toBeHidden();
  await expect(page.locator('#camera-home')).toBeVisible();
  await page.screenshot({path:'screenshots/hud-clareza-minimapa-fechado-1600x900.png',animations:'disabled'});

  await page.locator('#biome-details summary').click();
  await expect(page.locator('#biome-legend')).toBeVisible();
  await expect(page.locator('#biome-legend [data-visit-biome]')).toHaveCount(6);
  await page.screenshot({path:'screenshots/hud-clareza-regioes-abertas-1600x900.png',animations:'disabled'});

  await page.locator('#zoom-out').click();
  await expect(page.locator('#zoom-value')).toHaveText('75%');
  await page.locator('#camera-home').click();
  await expect(page.locator('#zoom-value')).toHaveText('100%');
  await page.locator('#biome-details summary').click();
  await expect(page.locator('#biome-legend')).toBeHidden();
  expect(errors).toEqual([]);
});

test('HUD compacto preserva ações e minimapa no celular',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width:390,height:844});
  await startFarm(page);
  await expect(page.locator('#minimap')).toBeHidden();
  await page.locator('#minimap-toggle').click();
  await expect(page.locator('#minimap')).toBeVisible();
  await expect(page.locator('#camera-home')).toBeVisible();
  const bounds=await page.evaluate(()=>{
    const rect=selector=>document.querySelector(selector).getBoundingClientRect();
    const camera=rect('#camera-ui'),tools=rect('.tooltray');
    return {cameraRight:camera.right,cameraBottom:camera.bottom,
      toolsLeft:tools.left,toolsRight:tools.right,toolsBottom:tools.bottom,
      viewportWidth:innerWidth,viewportHeight:innerHeight};
  });
  expect(bounds.cameraRight).toBeLessThanOrEqual(bounds.viewportWidth+1);
  expect(bounds.toolsLeft).toBeGreaterThanOrEqual(-1);
  expect(bounds.toolsRight).toBeLessThanOrEqual(bounds.viewportWidth+1);
  expect(bounds.toolsBottom).toBeLessThanOrEqual(bounds.viewportHeight+1);
  await page.screenshot({path:'screenshots/hud-clareza-mobile-390x844.png',animations:'disabled'});
  expect(errors).toEqual([]);
});
