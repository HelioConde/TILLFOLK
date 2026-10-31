async function continueIfMenuVisible(page){
  if(await page.locator('#menu').isVisible())await page.locator('#continue').click();
  await expect(page.locator('#menu')).toBeHidden();
}
const {test,expect}=require('@playwright/test');
const screenSizes=[
 {width:1600,height:900},{width:1366,height:768},
 {width:1125,height:790},{width:1024,height:768},
 {width:800,height:900},{width:390,height:844},{width:1366,height:600}
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
      const last=menu.querySelector('#title-exit').getBoundingClientRect();
      return {navLeft:nav.left,navRight:nav.right,navTop:nav.top,
        firstLeft:first.left,firstRight:first.right,lastBottom:last.bottom,
        viewportWidth:innerWidth,htmlWidth:document.documentElement.scrollWidth};
    });
    expect(limits.navLeft).toBeGreaterThanOrEqual(0);
    expect(limits.firstLeft).toBeGreaterThanOrEqual(0);
    expect(limits.navRight).toBeLessThanOrEqual(view.width+1);
    expect(limits.firstRight).toBeLessThanOrEqual(view.width+1);
    expect(limits.htmlWidth).toBeLessThanOrEqual(view.width+1);
    if(view.width>850) expect(limits.lastBottom).toBeLessThanOrEqual(view.height+1);
    await page.screenshot({path:'screenshots/menu-'+view.width+'x'+view.height+'.png',fullPage:false,animations:'disabled'});
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

test('Cena jogável: fotografar mundo, movimentação e atlas dos colonos', async ({page}) => {
  await page.setViewportSize({width:1366,height:768});
  const errors=[];
  page.on('pageerror',err=>errors.push(String(err)));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await page.locator('#new-game').click();
  await page.locator('[data-game-mode="relaxed"]').click();
  await page.locator('#starter-confirm').click();
  await expect(page.locator('#menu')).toBeHidden();
  await expect(page.locator('#world')).toBeVisible();
  await page.waitForTimeout(3200);
  await page.screenshot({path:'screenshots/jogo-1366x768.png',animations:'disabled'});
  await page.setViewportSize({width:1600,height:900});
  await page.waitForTimeout(400);
  await page.screenshot({path:'screenshots/jogo-1600x900.png',animations:'disabled'});
  // O jogo é fullscreen por padrão; os painéis abrem em uma gaveta.
  await expect(page.locator('body')).toHaveClass(/play-session/);
  await expect(page.locator('.sidebar')).toBeHidden();
  await page.screenshot({path:'screenshots/jogo-imersivo-1600x900.png',animations:'disabled'});
  await page.locator('#open-workers').click();
  await expect(page.locator('body')).toHaveClass(/drawer-open/);
  await expect(page.locator('.sidebar')).toBeVisible();
  await page.screenshot({path:'screenshots/jogo-gestao-1600x900.png',animations:'disabled'});
  await page.locator('#drawer-close').click();
  await expect(page.locator('.sidebar')).toBeHidden();
  await page.locator('#world').click({position:{x:570,y:340}});
  await page.waitForTimeout(600);
  await page.screenshot({path:'screenshots/jogo-cultivo-1600x900.png',animations:'disabled'});
  const asset=await page.evaluate(async()=>{
    const image=new Image(); image.src='./public/assets/sprout-lands/characters/worker-variants.png';
    await image.decode();
    const tile=48, cols=Math.min(8,Math.floor(image.width/tile)), rows=Math.min(16,Math.floor(image.height/tile));
    const board=document.createElement('canvas');board.width=cols*tile*3;board.height=rows*tile*3;
    const cx=board.getContext('2d');cx.imageSmoothingEnabled=false;
    for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)cx.drawImage(image,x*tile,y*tile,tile,tile,x*tile*3,y*tile*3,tile*3,tile*3);
    board.id='atlas-debug';board.style.cssText='position:fixed;top:0;left:0;z-index:99999;max-width:none;width:'+board.width+'px;height:'+board.height+'px';
    document.body.appendChild(board);
    return {width:image.width,height:image.height,cols,rows};
  });
  await page.locator('#atlas-debug').screenshot({path:'screenshots/atlas-personagens.png'});
  await page.locator('#atlas-debug').evaluate(el=>el.remove());
  expect(asset.cols).toBeGreaterThan(1);
  expect(errors).toEqual([]);
});

test('Fazenda jogável: capturas do HUD, sprites e fluxo de cultivo',async({page})=>{
  const assetErrors=[];
  page.on('response',response=>{
    if(response.status()>=400&&/\\.(png|css|js|ttf|svg)(\\?|$)/i.test(response.url()))
      assetErrors.push(response.status()+' '+response.url());
  });
  await page.setViewportSize({width:1600,height:900});
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await page.locator('#new-game').click();
  await page.locator('[data-game-mode="survival"]').click();
  await expect(page.locator('#starter-dialog')).toBeVisible();
  await page.locator('#starter-confirm').click();
  await expect(page.locator('#menu')).toBeHidden();
  await expect(page.locator('#world')).toBeVisible();
  await page.waitForTimeout(3200);
  const pixels=await page.locator('#world').evaluate(canvas=>{
    const ctx=canvas.getContext('2d');
    const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    let nonzero=0,bright=0;
    for(let i=0;i<data.length;i+=160){if(data[i+3]>0)nonzero++;if(data[i]>110)bright++;}
    return {nonzero,bright};
  });
  expect(pixels.nonzero).toBeGreaterThan(100);
  expect(pixels.bright).toBeGreaterThan(100);
  await page.screenshot({path:'screenshots/jogo-1600x900.png',animations:'disabled'});
  const canvas=page.locator('#world');
  const r=await canvas.boundingBox();
  await page.mouse.click(r.x+r.width*(15.5/28),r.y+r.height*(11.5/18));
  await expect(page.locator('#task-count')).not.toHaveText('0');
  await page.screenshot({path:'screenshots/jogo-tarefa-1600x900.png',animations:'disabled'});
  for(const view of [{width:1125,height:790},{width:390,height:844}]){
    await page.setViewportSize(view);
    await page.waitForTimeout(400);
    await expect(page.locator('#world')).toBeVisible();
    await page.screenshot({path:'screenshots/jogo-'+view.width+'x'+view.height+'.png',animations:'disabled'});
  }
  expect(assetErrors).toEqual([]);
});


test('Menu acessível: foco isolado, retorno e continuar usando armazenamento local',async({page})=>{
  await page.setViewportSize({width:1125,height:790});
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await expect(page.locator('.app-shell')).toHaveAttribute('inert','');
  await page.locator('#new-game').click();
  await page.locator('[data-game-mode="relaxed"]').click();
  await page.locator('#starter-confirm').click();
  await expect(page.locator('#menu')).toBeHidden();
  await expect(page.locator('.app-shell')).not.toHaveAttribute('inert','');
  await page.locator('#menu-btn').click();
  await expect(page.locator('.app-shell')).toHaveAttribute('inert','');
  await expect(page.locator('#new-game')).toBeFocused();
  await expect(page.locator('#continue')).toBeEnabled();
  await page.reload({waitUntil:'networkidle'});
  await expect(page.locator('#continue')).toBeEnabled();
  await continueIfMenuVisible(page);
  await expect(page.locator('#menu')).toBeHidden();
});

test('Movimento reduzido e preferência de animação persistida',async({page})=>{
  await page.setViewportSize({width:1024,height:768});
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await page.locator('#title-settings').click();
  await page.locator('#title-motion').uncheck();
  await expect(page.locator('#menu')).toHaveClass(/no-title-motion/);
  await expect(page.locator('#title-motion')).toHaveAttribute('aria-checked','false');
  await page.locator('#title-settings-dialog .modal-x').click();
  await page.reload({waitUntil:'networkidle'});
  await expect(page.locator('#menu')).toHaveClass(/no-title-motion/);
  await expect(page.locator('#title-fullscreen')).toHaveAttribute('aria-pressed','false');
});


test('Desktop: ferramentas e canvas visíveis sem rolagem no modo normal',async({page})=>{
  for(const view of [{width:1600,height:900},{width:1366,height:768}]){
    await page.setViewportSize(view);
    await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
    await page.locator('#new-game').click();
    await page.locator('[data-game-mode="relaxed"]').click();
    await page.locator('#starter-confirm').click();
    await expect(page.locator('#menu')).toBeHidden();
    await expect(page.locator('.tooltray')).toBeVisible();
    await page.waitForTimeout(350);
    const layout=await page.evaluate(()=>{
      const rect=(s)=>document.querySelector(s).getBoundingClientRect();
      const tools=rect('.tooltray'),canvas=rect('#world'),map=rect('.canvas-scroll');
      return {toolBottom:tools.bottom,mapBottom:map.bottom,canvasWidth:canvas.width,
        canvasHeight:canvas.height,viewHeight:innerHeight,viewWidth:innerWidth};
    });
    expect(layout.toolBottom).toBeLessThanOrEqual(view.height+2);
    expect(layout.mapBottom).toBeLessThanOrEqual(view.height+2);
    expect(layout.canvasWidth).toBeGreaterThan(300);
    expect(layout.canvasHeight).toBeGreaterThan(180);
    expect(Math.abs(layout.canvasWidth/layout.canvasHeight-896/576)).toBeLessThan(.025);
    await page.screenshot({path:'screenshots/jogo-ajustado-'+view.width+'x'+view.height+'.png',animations:'disabled'});
  }
});


test('Atlas visual: cultivos, árvores, objetos e ações dos colonos',async({page})=>{
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  const sheets=[
    ['cultivos','farming/crops.png'],
    ['coleta','environment/forageables.png'],
    ['arvores','environment/trees-and-bushes.png'],
    ['acoes','characters/worker-actions.png'],
    ['irrigacao','characters/watering-effects.png']
  ];
  for(const [name,file] of sheets){
    const dimensions=await page.evaluate(async filename=>{
      const img=new Image();img.src='./public/assets/sprout-lands/'+filename;
      await img.decode();
      const canvas=document.createElement('canvas');
      const factor=Math.min(3,1100/img.width,900/img.height);
      canvas.width=Math.round(img.width*factor);canvas.height=Math.round(img.height*factor);
      canvas.id='asset-inspection';canvas.style.cssText='position:fixed;top:0;left:0;z-index:99999;pointer-events:none;image-rendering:pixelated;max-width:none;width:'+canvas.width+'px;height:'+canvas.height+'px';
      const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
      ctx.fillStyle='#d9d8c0';ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(img,0,0,canvas.width,canvas.height);
      document.body.appendChild(canvas);
      return {width:img.width,height:img.height};
    },file);
    expect(dimensions.width).toBeGreaterThan(0);
    await page.locator('#asset-inspection').screenshot({path:'screenshots/atlas-'+name+'.png'});
    await page.locator('#asset-inspection').evaluate(el=>el.remove());
  }
});

test('Celular: a horta é o foco inicial da nova fazenda',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await page.locator('#new-game').click();
  await page.locator('[data-game-mode="relaxed"]').click();
  await page.locator('#starter-confirm').click();
  await expect(page.locator('#world')).toBeVisible();
  await page.waitForTimeout(500);
  // No modo fullscreen não existe mais scrollLeft: pan é aplicado ao canvas.
  const position=await page.evaluate(()=>{
    const view=document.querySelector('.canvas-scroll').getBoundingClientRect();
    const map=document.querySelector('#world').getBoundingClientRect();
    return {viewWidth:view.width,viewHeight:view.height,mapWidth:map.width,mapHeight:map.height,
      coversView:map.left<=view.left+1&&map.right>=view.right-1&&
        map.top<=view.top+1&&map.bottom>=view.bottom-1};
  });
  expect(position.viewWidth).toBe(390);
  expect(position.mapWidth).toBeGreaterThanOrEqual(position.viewWidth);
  expect(position.mapHeight).toBeGreaterThanOrEqual(position.viewHeight);
  expect(position.coversView).toBe(true);
  await page.screenshot({path:'screenshots/jogo-mobile-inicio-390x844.png',animations:'disabled'});
});


// Captura de regressão: somente sprites originais de /public/assets/sprout-lands.
test('Ações reais dos trabalhadores — quadros do atlas local e captura',async({page})=>{
  await page.setViewportSize({width:1600,height:900});
  const failures=[];
  page.on('pageerror',error=>failures.push(error.message));
  page.on('response',response=>{
    if(response.status()>=400 && /worker-actions|worker-variants/.test(response.url()))
      failures.push('Sprite indisponível: '+response.url());
  });
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  const frames=await page.evaluate(async()=>{
    const files=['characters/worker-actions.png','characters/worker-variants.png','characters/watering-effects.png'];
    return await Promise.all(files.map(async file=>{
      const image=new Image();
      image.src='./public/assets/sprout-lands/'+file;
      await image.decode();
      return {file,width:image.naturalWidth,height:image.naturalHeight};
    }));
  });
  expect(frames[0].width).toBe(96);
  expect(frames[0].height).toBe(576);
  expect(frames[1].width).toBeGreaterThan(95);
  expect(frames[2].width).toBe(432);
  expect(frames[2].height).toBe(144);
  await page.locator('#new-game').click();
  await page.locator('[data-game-mode="relaxed"]').click();
  await page.locator('#starter-confirm').click();
  await expect(page.locator('#worker-count')).toHaveText('2');
  await page.locator('[data-speed="6"]').click();
  await page.waitForTimeout(3800);
  await page.screenshot({path:'screenshots/colonos-trabalhando-1600x900.png',animations:'disabled'});
  await page.locator('#world').screenshot({path:'screenshots/colonos-trabalhando-mapa.png',animations:'disabled'});
  expect(failures).toEqual([]);
});


test('Casa usa atlas original e telhas sem alongamento',async({page})=>{
  await page.setViewportSize({width:1600,height:900});
  const errors=[];
  page.on('response',response=>{
    if(response.status()>=400 && /wood-(roof|walls|door)\.png/.test(response.url()))
      errors.push(response.status()+' '+response.url());
  });
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await expect(page.locator('#menu')).toBeVisible();
  const dims=await page.evaluate(async()=>{
    const names=['wood-roof.png','wood-walls.png','wood-door.png'];
    return await Promise.all(names.map(async name=>{
      const img=new Image();
      img.src='./public/assets/sprout-lands/structures/'+name;
      await img.decode();
      return [name,img.naturalWidth,img.naturalHeight];
    }));
  });
  expect(dims).toEqual([
    ['wood-roof.png',112,80],
    ['wood-walls.png',80,48],
    ['wood-door.png',288,32]
  ]);
  const fs=require('node:fs');
  fs.mkdirSync('screenshots',{recursive:true});
  const png=await page.locator('#title-scene').evaluate(
    canvas=>canvas.toDataURL('image/png').split(',')[1]);
  fs.writeFileSync('screenshots/casa-canvas-960x540.png',Buffer.from(png,'base64'));
  await page.screenshot({path:'screenshots/casa-menu-1600x900.png',animations:'disabled'});
  const menuCode=fs.readFileSync('src/menu-scene.js','utf8');
  expect(menuCode).toContain('builder.draw(ctx,{roof:imgs.roof,walls:imgs.walls,door:imgs.door}');
  const builderCode=fs.readFileSync('src/house-renderer.js','utf8');
  expect(builderCode).toContain('const ridge=Math.floor((height-1)/2)');
  expect(errors).toEqual([]);
});


test('Terreno selvagem: nenhuma horta inicial, paisagem diversa e persistência',async({page})=>{
  await page.setViewportSize({width:1600,height:900});
  const problems=[];
  page.on('pageerror',error=>problems.push(error.message));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await page.locator('#new-game').click();
  await page.locator('[data-game-mode="relaxed"]').click();
  await page.locator('#starter-confirm').click();
  await expect(page.locator('#menu')).toBeHidden();
  await expect(page.locator('body')).toHaveClass(/play-session/);
  await expect(page.locator('.world-tag')).toContainText('VALE SELVAGEM');
  const snapshot=await page.evaluate(()=>{
    const state=JSON.parse(localStorage.getItem('tillfolk-v01'));
    const unique=[...new Set(state.world.objects.map(o=>o.kind))];
    const count=type=>state.world.objects.filter(o=>o.kind===type).length;
    const nearStart=state.world.objects.filter(o=>Math.hypot((o.x-13.6)/1.15,(o.y-9.5)/1.05)<3.75);
    return {version:state.world.version,seed:state.world.seed,objects:state.world.objects.length,
      water:state.world.water.length,types:unique,trees:count('tree'),
      stones:count('boulder'),mushrooms:count('mushroom'),
      flowers:count('flowers'),grass:count('grass'),
      plots:state.plots.length,selected:state.plots.filter(p=>p.selected).length,
      cultivated:state.plots.filter(p=>p.tilled||p.seeded).length,nearStart:nearStart.length};
  });
  expect(snapshot.version).toBe(1);
  expect(snapshot.objects).toBeGreaterThan(90);
  expect(snapshot.water).toBeGreaterThan(3);
  for(const count of [snapshot.trees,snapshot.stones,snapshot.mushrooms,snapshot.flowers,snapshot.grass])
    expect(count).toBeGreaterThan(5);
  expect(snapshot.selected).toBe(0);
  expect(snapshot.cultivated).toBe(0);
  expect(snapshot.nearStart).toBe(0);
  expect(problems).toEqual([]);
  await page.waitForTimeout(600);
  await page.screenshot({path:'screenshots/vale-selvagem-inicial-1600x900.png',animations:'disabled'});
  await page.reload({waitUntil:'networkidle'});
  await continueIfMenuVisible(page);
  const restored=await page.evaluate(()=>JSON.parse(localStorage.getItem('tillfolk-v01')));
  expect(restored.world.seed).toBe(snapshot.seed);
  expect(restored.world.objects.length).toBe(snapshot.objects);
});

test('Recursos da mata: geração determinística, coleta e regeneração',async({page})=>{
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  const checks=await page.evaluate(()=>{
    const wild=window.TillfolkWild;
    const a=wild.create(14142,28,18),b=wild.create(14142,28,18);
    const before=a.objects.length,tree=a.objects.find(o=>o.kind==='tree');
    const first=wild.clear(a,tree.x,tree.y);
    const stump=wild.at(a,tree.x,tree.y);
    const second=wild.clear(a,tree.x,tree.y);
    const gone=wild.at(a,tree.x,tree.y);
    const newFlowers=wild.regrow(a,6,28,18,[]);
    return {same:JSON.stringify(b)===JSON.stringify(wild.create(14142,28,18)),
      before,treeWasSolid:wild.blocked(b,tree.x,tree.y,28,18),
      first,stumpKind:stump?.kind,second,goneKind:gone?.kind||null,
      newFlowers,lastRegrownDay:a.lastRegrownDay};
  });
  expect(checks.same).toBe(true);
  expect(checks.before).toBeGreaterThan(90);
  expect(checks.treeWasSolid).toBe(true);
  expect(checks.first.remaining).toBe(true);
  expect(checks.stumpKind).toBe('stump');
  expect(checks.second.remaining).toBe(false);
  expect(checks.goneKind).toBeNull();
  expect(checks.lastRegrownDay).toBe(6);
});


test('Regressão real: olhar para esquerda/direita ao andar e trabalhar',async({page})=>{
  await page.setViewportSize({width:1100,height:700});
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  const results=await page.evaluate(async()=>{
    const source=await (await fetch('./src/game.js')).text();
    const walking=source.match(/const walkingRowFor=\{down:(\d+),up:(\d+),left:(\d+),right:(\d+)\}/);
    const actions=source.match(/const actionRowFor=\{down:(\d+),up:(\d+),left:(\d+),right:(\d+)\}/);
    if(!walking||!actions)throw new Error('Os dois mapas de direções devem existir');
    const mapping=(match)=>({down:+match[1],up:+match[2],left:+match[3],right:+match[4]});
    const walkingRows=mapping(walking),actionRows=mapping(actions);
    const load=async filename=>{
      const img=new Image();img.src='./public/assets/sprout-lands/characters/'+filename;
      await img.decode();return img;
    };
    const walkImg=await load('worker-variants.png'),actionImg=await load('worker-actions.png');
    // Este teste confere PIXELS e não apenas o índice da linha: o olho precisa
    // aparecer mais à esquerda na pose de esquerda e vice-versa, em AMBOS os atlas.
    const eyeX=(img,row)=>{
      const canvas=document.createElement('canvas');
      canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
      const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);
      const y=row*48+22;
      const d=ctx.getImageData(0,y,48,1).data;
      const color=(x,r,g,b)=>Math.abs(d[x*4]-r)<3&&Math.abs(d[x*4+1]-g)<3&&Math.abs(d[x*4+2]-b)<3;
      for(let x=1;x<47;x++){
        if(color(x,92,78,146)&&color(x-1,243,242,192)&&color(x+1,243,242,192))return x;
      }
      return -1;
    };
    const eyes={
      walkingLeft:eyeX(walkImg,walkingRows.left+4),
      walkingRight:eyeX(walkImg,walkingRows.right+4),
      actionLeft:eyeX(actionImg,actionRows.left),
      actionRight:eyeX(actionImg,actionRows.right)
    };
    const board=document.createElement('canvas');
    board.id='direction-atlas-qa';board.width=1040;board.height=245;
    board.style.cssText='position:fixed;z-index:99999;left:0;top:0;width:1040px;height:245px;image-rendering:pixelated;pointer-events:none';
    const ctx=board.getContext('2d');ctx.imageSmoothingEnabled=false;
    ctx.fillStyle='#203627';ctx.fillRect(0,0,board.width,board.height);
    const frames=[
      {label:'CAMINHA ESQUERDA',img:walkImg,row:walkingRows.left+4},
      {label:'CAMINHA DIREITA',img:walkImg,row:walkingRows.right+4},
      {label:'TRABALHA ESQUERDA',img:actionImg,row:actionRows.left},
      {label:'TRABALHA DIREITA',img:actionImg,row:actionRows.right}
    ];
    for(const [i,item] of frames.entries()){
      const x=i*260;
      ctx.fillStyle='#f2e9cf';ctx.font='bold 17px sans-serif';ctx.fillText(item.label,x+10,25);
      for(let frame=0;frame<2;frame++){
        ctx.drawImage(item.img,frame*48,item.row*48,48,48,
          x+6+frame*124,41,116,116);
      }
      ctx.fillText('Olho X='+eyes[Object.keys(eyes)[i]],x+10,197);
    }
    document.body.appendChild(board);
    return {walkingRows,actionRows,eyes};
  });
  expect(results.walkingRows).toEqual({down:0,up:1,left:3,right:2});
  expect(results.actionRows).toEqual({down:0,up:1,left:2,right:3});
  for(const x of Object.values(results.eyes))expect(x).toBeGreaterThan(0);
  expect(results.eyes.walkingLeft).toBeLessThan(results.eyes.walkingRight);
  expect(results.eyes.actionLeft).toBeLessThan(results.eyes.actionRight);
  await page.locator('#direction-atlas-qa').screenshot({
    path:'screenshots/direcoes-conferidas-caminhada-e-trabalho.png',animations:'disabled'
  });
});

test('Obstáculo da floresta: designar limpeza sem atravessar árvores',async({page})=>{
  await page.setViewportSize({width:1600,height:900});
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await page.locator('#new-game').click();
  await page.locator('[data-game-mode="relaxed"]').click();
  await page.locator('#starter-confirm').click();
  const location=await page.evaluate(()=>{
    const state=JSON.parse(localStorage.getItem('tillfolk-v01'));
    const rect=document.querySelector('#world').getBoundingClientRect();
    return state.world.objects.filter(o=>o.kind==='tree'||o.kind==='boulder')
      .map(o=>({x:o.x,y:o.y,cx:rect.left+(o.x+.5)*rect.width/28,cy:rect.top+(o.y+.5)*rect.height/18}))
      .filter(o=>o.cx>430&&o.cx<1250&&o.cy>180&&o.cy<685)
      .sort((a,b)=>Math.hypot(a.x-14,a.y-9)-Math.hypot(b.x-14,b.y-9))[0]||null;
  });
  expect(location).not.toBeNull();
  await page.locator("#orders-btn").click();
  await page.locator('[data-order-type="clear"]').click();
  // Clique diretamente na célula do Canvas: o HUD flutuante pode interceptar
  // coordenadas de tela, mas não deve alterar a designação da ordem.
  await page.locator('#world').evaluate((canvas,{x,y})=>{
    const rect=canvas.getBoundingClientRect();
    canvas.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,
      clientX:rect.left+(x+.5)*rect.width/28,
      clientY:rect.top+(y+.5)*rect.height/18}));
  },location);
  const selected=await page.evaluate(({x,y})=>{
    const state=JSON.parse(localStorage.getItem('tillfolk-v01'));
    return state.plots.find(p=>p.x===x&&p.y===y)?.selected;
  },location);
  expect(selected).toBe(true);
  await expect(page.locator('#task-count')).not.toHaveText('0');
  await page.screenshot({path:'screenshots/vale-limpeza-marcada-1600x900.png',animations:'disabled'});
});


test('Casa Slime-Harvest: 5 faixas originais, escala 2x, captura real',async({page})=>{
  await page.setViewportSize({width:1600,height:900});
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  const result=await page.evaluate(()=>{
    const h=window.TillfolkHouse;
    if(!h)throw new Error("Renderizador Slime-Harvest não carregou");
    return {
      center:Array.from({length:5},(_,row)=>h.roofAtlas(3,row)),
      left:Array.from({length:5},(_,row)=>h.roofAtlas(0,row)),
      right:Array.from({length:5},(_,row)=>h.roofAtlas(6,row)),
      dimensions:h.dimensions(2)
    };
  });
  expect(result.center).toEqual([[1,0],[1,1],[1,2],[1,3],[1,4]]);
  expect(result.left.map(t=>t[0])).toEqual([0,0,0,0,0]);
  expect(result.right.map(t=>t[0])).toEqual([2,2,2,2,2]);
  expect(result.dimensions).toEqual({width:224,height:256,cell:32});
  const fs=require('node:fs');
  fs.mkdirSync('screenshots',{recursive:true});
  const data=await page.locator('#title-scene').evaluate(c=>c.toDataURL('image/png').split(',')[1]);
  fs.writeFileSync('screenshots/slime-harvest-casa-canvas-960x540.png',Buffer.from(data,'base64'));
  await page.screenshot({path:'screenshots/slime-harvest-casa-menu-1600x900.png',animations:'disabled'});
});


test('Casa: janelas e porta alinhadas ao corpo reduzido e telhado sobreposto', async ({page})=>{
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  const result=await page.evaluate(async()=>{
    const roof=new Image(),walls=new Image(),door=new Image();
    roof.src='./public/assets/sprout-lands/structures/wood-roof.png';
    walls.src='./public/assets/sprout-lands/structures/wood-walls.png';
    door.src='./public/assets/sprout-lands/structures/wood-door.png';
    await Promise.all([roof.decode(),walls.decode(),door.decode()]);
    const calls=[];
    const ctx={
      imageSmoothingEnabled:true,
      drawImage(img,sx,sy,sw,sh,dx,dy,dw,dh){
        calls.push({asset:img===roof?'roof':img===walls?'walls':'door',sx,sy,sw,sh,dx,dy,dw,dh});
      }
    };
    const stats=window.TillfolkHouse.draw(ctx,{roof,walls,door},0,0,{scale:2});
    const windows=calls.filter(c=>c.asset==='walls'&&c.sx===48&&c.sy===32);
    const doors=calls.filter(c=>c.asset==='door');
    const rooftop=calls.filter(c=>c.asset==='roof');
    return {stats,windows,doors,rooftopCount:rooftop.length,
      roofMin:Math.min(...rooftop.map(c=>c.dy)),roofMax:Math.max(...rooftop.map(c=>c.dy+c.dh)),
      facadeMin:128,allUniform:calls.every(c=>c.dw*c.sh===c.dh*c.sw),
      roofBeforeWindows:calls.findIndex(c=>c.asset==='roof')<calls.findIndex(c=>c.asset==='walls'&&c.sx===48&&c.sy===32),
      roofOverWalls:calls.findIndex(c=>c.asset==='roof')>calls.findIndex(c=>c.asset==='walls'),
      windowsDrawnAboveRoof:calls.findLastIndex(c=>c.asset==='walls'&&c.sx===48&&c.sy===32)>calls.findLastIndex(c=>c.asset==='roof')};
  });
  expect(result.stats.stretched).toBe(0);
  expect(result.stats.walls).toBe(20);
  expect(result.windows.map(w=>[w.dx,w.dy])).toEqual([[64,160],[128,160]]);
  expect(result.doors.map(d=>[d.dx,d.dy,d.dw,d.dh])).toEqual([[96,160,32,32]]);
  expect(result.roofMin).toBe(64);
  expect(result.roofMax).toBe(192);
  expect(result.rooftopCount).toBe(36);
  expect(result.allUniform).toBe(true);
  expect(result.roofBeforeWindows).toBe(false);
  expect(result.roofOverWalls).toBe(true);
  expect(result.windowsDrawnAboveRoof).toBe(false);
  // Cobertura em primeiro plano E a janela começa exatamente onde termina
  // o último tile do beiral: não existem recortes nem sobreposição indevida.
  expect(result.windows.every(w=>w.dy===result.roofMax-32)).toBe(true);
});



test('Telhado em primeiro plano, sem recortes nas janelas e porta',async({page})=>{
  await page.setViewportSize({width:1366,height:768});
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  const detail=await page.evaluate(async()=>{
    const assets={};
    for(const name of ['roof','walls','door']){
      const image=new Image();
      image.src='./public/assets/sprout-lands/structures/wood-'+name+'.png';
      await image.decode();assets[name]=image;
    }
    const output=document.createElement('canvas');output.width=260;output.height=320;
    const ctx=output.getContext('2d');
    const order=[],original=ctx.drawImage.bind(ctx);
    ctx.drawImage=(...args)=>{order.push(args[0]===assets.roof?'roof':args[0]===assets.walls?'walls':'door');original(...args);};
    const stats=window.TillfolkHouse.draw(ctx,assets,8,8,{scale:2});
    return {stats,firstRoof:order.indexOf('roof'),lastWall:order.lastIndexOf('walls'),
      lastDoor:order.lastIndexOf('door'),lastDraw:order.at(-1),
      png:output.toDataURL('image/png').slice(0,30),
      clipReleased:(()=>{ctx.fillStyle='#ff0000';ctx.fillRect(0,0,2,2);
        return ctx.getImageData(0,0,1,1).data[0]===255;})()};
  });
  expect(detail.stats.stretched).toBe(0);
  expect(detail.stats.roof).toBe(35);
  // A cobertura vem depois das paredes-base, mas antes das janelas e porta.
  expect(detail.firstRoof).toBeGreaterThan(0);
  expect(detail.firstRoof).toBeGreaterThan(detail.lastWall);
  expect(detail.firstRoof).toBeGreaterThan(detail.lastDoor);
  expect(detail.lastDraw).toBe('roof');
  const source=require('node:fs').readFileSync('src/house-renderer.js','utf8');
  expect(source.includes('ctx.clip(roofMask')).toBe(false);
  expect(source.includes('if(canClip)ctx.restore()')).toBe(false);
  expect(detail.clipReleased).toBe(true);
  expect(detail.png).toMatch(/^data:image\/png;base64,/);
  await page.screenshot({path:'screenshots/casa-telhado-primeiro-plano-1366x768.png',animations:'disabled'});
});

test('Atlas selvagem: recortes completos e pranchas visuais de todas as variações',async({page})=>{
  const errors=[];
  page.on('pageerror',error=>errors.push(String(error)));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  const result=await page.evaluate(async()=>{
    const wild=window.TillfolkWild;
    const load=async path=>{
      const img=new Image();
      img.src='./public/assets/sprout-lands/environment/'+path;
      await img.decode();return img;
    };
    const trees=await load('trees-and-bushes.png');
    const rocks=await load('forageables.png');
    const rects=wild.atlasFrames;
    const groups=Object.entries(rects);
    const frameData=[],missing=[];
    for(const [kind,frames] of groups){
      const source= ['tree','thicket','log','stump'].includes(kind)?trees:rocks;
      const ctx=document.createElement('canvas').getContext('2d');
      for(const [i,[sx,sy,sw,sh]] of frames.entries()){
        if(sx<0||sy<0||sx+sw>source.naturalWidth||sy+sh>source.naturalHeight){
          missing.push(kind+' '+i+' sai da imagem');continue;
        }
        ctx.canvas.width=sw;ctx.canvas.height=sh;
        ctx.clearRect(0,0,sw,sh);
        ctx.drawImage(source,sx,sy,sw,sh,0,0,sw,sh);
        const data=ctx.getImageData(0,0,sw,sh).data;
        let opaque=0;
        for(let px=3;px<data.length;px+=4)if(data[px]>0)opaque++;
        frameData.push({kind,i,rect:[sx,sy,sw,sh],opaque});
        if(opaque<10)missing.push(kind+' '+i+' sem pixels de arte');
      }
    }
    const board=document.createElement('canvas');
    board.width=1200;board.height=1200;
    board.id='wild-art-audit';
    const ctx=board.getContext('2d');ctx.imageSmoothingEnabled=false;
    ctx.fillStyle='#d4d7b5';ctx.fillRect(0,0,board.width,board.height);
    const sprites={trees,rocks};
    const drawPart=(img,sx,sy,sw,sh,x,y,w,h)=>{
      ctx.drawImage(img,sx,sy,sw,sh,Math.round(x),Math.round(y),Math.round(w),Math.round(h));
    };
    for(const [row,[kind,frames]] of groups.entries()){
      const y=15+row*126;
      ctx.fillStyle='#284a36';ctx.font='bold 18px sans-serif';
      ctx.fillText(kind.toUpperCase(),10,y+20);
      for(let i=0;i<frames.length;i++){
        const cx=150+i*108;
        ctx.fillStyle=i%2?'#a9ce85':'#b6d890';ctx.fillRect(cx,y,100,102);
        wild.drawObject(ctx,{kind,variant:i,x:(cx+34)/32,y:(y+40)/32},sprites,32,drawPart);
        ctx.fillStyle='#193021';ctx.font='bold 13px monospace';
        ctx.fillText(kind+' '+i,cx+5,y+96);
      }
    }
    board.style.cssText='position:fixed;z-index:999999;left:0;top:0;width:1200px;height:1200px';
    document.body.appendChild(board);
    return {missing,frameData,treeWidth:trees.width,treeHeight:trees.height,
      rockWidth:rocks.width,rockHeight:rocks.height};
  });
  expect(result.missing).toEqual([]);
  expect(result.frameData.filter(f=>f.kind==='tree').length).toBe(7);
  expect(result.frameData.filter(f=>f.kind==='thicket').every(f=>f.rect[1]===48)).toBe(true);
  expect(result.frameData.filter(f=>f.kind==='tree').slice(0,6).map(f=>f.rect[0]))
    .toEqual([0,16,48,80,112,144]);
  expect(result.frameData.filter(f=>f.kind==='boulder'&&f.rect[2]===32)
    .every(f=>f.rect[3]===32)).toBe(true);
  await page.locator('#wild-art-audit').screenshot({path:'screenshots/atlas-objetos-celulas-completas.png'});
  expect(errors).toEqual([]);
});

test('Recrutamento v2: resumo legível, rodapé fixo e screenshots desktop/mobile',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  for(const size of [{width:1185,height:750},{width:900,height:650},{width:390,height:844}]){
    await page.setViewportSize(size);
    await page.locator('#new-game').click();
    await page.locator('[data-game-mode="relaxed"]').click();
    await expect(page.locator('#starter-dialog')).toBeVisible();
    await expect(page.locator('.starter-slot')).toHaveCount(2);
    await expect(page.locator('.starter-highlights')).toHaveCount(2);
    await expect(page.locator('.starter-chip-list')).toHaveCount(4);
    await expect(page.locator('#starter-confirm')).toBeVisible();
    const measured=await page.evaluate(()=>{
      const bounds=s=>document.querySelector(s).getBoundingClientRect();
      const dialog=bounds('#starter-dialog'),heading=bounds('.starter-heading'),footer=bounds('.starter-footer'),
        input=bounds('#farm-name'),cta=bounds('#starter-confirm');
      const cards=[...document.querySelectorAll('.starter-slot')].map(card=>{
        const r=card.getBoundingClientRect(),section=card.querySelector('.starter-highlights').getBoundingClientRect();
        return {cardHeight:r.height,summaryVisible:section.top>=r.top&&section.bottom<=r.bottom+1,sectionHeight:section.height};
      });
      const content=document.querySelector('.starter-content');
      return {dialogLeft:dialog.left,dialogRight:dialog.right,dialogTop:dialog.top,dialogBottom:dialog.bottom,
        headingHeight:heading.height,footerHeight:footer.height,
        footerBottom:footer.bottom,ctaBottom:cta.bottom,inputBottom:input.bottom,
        actionsDirection:getComputedStyle(document.querySelector('.starter-actions')).flexDirection,
        contentOverflow:getComputedStyle(content).overflowY,cardCount:cards.length,cards,
        pageWidth:document.documentElement.scrollWidth};
    });
    expect(measured.dialogLeft).toBeGreaterThanOrEqual(0);
    expect(measured.dialogRight).toBeLessThanOrEqual(size.width+1);
    expect(measured.dialogTop).toBeGreaterThanOrEqual(0);
    expect(measured.dialogBottom).toBeLessThanOrEqual(size.height+1);
    expect(measured.footerBottom).toBeLessThanOrEqual(size.height+1);
    expect(measured.ctaBottom).toBeLessThanOrEqual(measured.footerBottom+1);
    expect(measured.inputBottom).toBeLessThanOrEqual(measured.footerBottom+1);
    expect(measured.contentOverflow).toBe('auto');
    if(size.width===390){
      expect(measured.actionsDirection).toBe('row');
      expect(measured.footerHeight).toBeLessThan(195);
    }
    expect(measured.cards.every(c=>c.summaryVisible&&c.sectionHeight>40)).toBe(true);
    await page.screenshot({path:'screenshots/recrutamento-v2-'+size.width+'x'+size.height+'.png',animations:'disabled'});
    if(size.width===390){
      await page.locator('.starter-slot').nth(1).scrollIntoViewIfNeeded();
      await page.screenshot({path:'screenshots/recrutamento-v2-mobile-segundo-personagem.png',animations:'disabled'});
    }
    await page.locator('#starter-dialog .modal-x').click();
    await expect(page.locator('#starter-dialog')).toBeHidden();
  }
  await page.setViewportSize({width:1185,height:750});
  await page.locator('#new-game').click();
  await page.locator('[data-game-mode="survival"]').click();
  const before=await page.locator('.starter-name-input').first().inputValue();
  await page.locator('[data-reroll="0"]').click();
  await expect(page.locator('.starter-highlights')).toHaveCount(2);
  await expect(page.locator('.starter-activity-details')).toHaveCount(0);
  const firstSpecialty=page.locator('.starter-chip.specialty').first();
  await expect(firstSpecialty).toBeVisible();
  await firstSpecialty.hover();
  await expect(page.locator('#starter-specialty-tooltip')).toBeVisible();
  await expect(page.locator('#starter-specialty-tooltip')).toContainText(/segundos por ação/);
  await expect(page.locator('#starter-specialty-tooltip')).toContainText(/sem deslocamento/);
  await page.screenshot({path:'screenshots/recrutamento-especialidade-hover-1185x750.png',animations:'disabled'});
  await firstSpecialty.focus();
  await expect(page.locator('#starter-specialty-tooltip')).toBeVisible();
  await page.keyboard.press('Tab');
  const anotherSpecialtyFocused=await page.evaluate(()=>
    document.activeElement?.matches('.starter-chip.specialty')||false
  );
  if(anotherSpecialtyFocused)
    await expect(page.locator('#starter-specialty-tooltip')).toBeVisible();
  else
    await expect(page.locator('#starter-specialty-tooltip')).toBeHidden();
  const nextSpecialty=page.locator('.starter-chip.specialty').nth(1);
  await nextSpecialty.focus();
  await expect(page.locator('#starter-specialty-tooltip')).toHaveText(
    await nextSpecialty.getAttribute('data-specialty-tooltip')
  );
  await page.keyboard.press('Escape');
  await expect(page.locator('#starter-specialty-tooltip')).toBeHidden();
  await expect(page.locator('#starter-dialog')).toBeVisible();
  await page.locator('#farm-name').fill('Minha Fazenda de Teste');
  await page.locator('#starter-confirm').click();
  await expect(page.locator('#starter-dialog')).toBeHidden();
  await expect(page.locator('#farm-title')).toHaveText('Minha Fazenda de Teste');
  expect(errors).toEqual([]);
});

test('Recrutamento: tooltip de especialidade por hover, foco e toque',async({page,browser})=>{
  const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
  await page.setViewportSize({width:1185,height:750});
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await page.locator('#new-game').click();
  await page.locator('[data-game-mode="relaxed"]').click();
  await expect(page.locator('#starter-dialog')).toBeVisible();
  const tip=page.locator('#starter-specialty-tooltip');
  const chip=page.locator('.starter-chip.specialty').first();
  await expect(chip).toHaveAttribute('aria-expanded','false');
  await expect(page.locator('.starter-activity-details')).toHaveCount(0);
  await expect(tip).toBeHidden();
  await chip.hover();
  const expected=await chip.getAttribute('data-specialty-tooltip');
  await expect(tip).toHaveText(expected);
  const geometry=await tip.boundingBox();
  const dialogBounds=await page.locator('#starter-dialog').boundingBox();
  expect(geometry.x).toBeGreaterThanOrEqual(dialogBounds.x+8);
  expect(geometry.x+geometry.width).toBeLessThanOrEqual(dialogBounds.x+dialogBounds.width-8);
  expect(geometry.y).toBeGreaterThanOrEqual(0);
  expect(geometry.y+geometry.height).toBeLessThanOrEqual(750);
  await page.screenshot({path:'screenshots/tooltip-especialidade-desktop.png',animations:'disabled'});
  await page.mouse.move(0,0);
  await expect(tip).toBeHidden();
  await chip.focus();
  await expect(tip).toHaveText(expected);
  await page.keyboard.press('Escape');
  await expect(tip).toBeHidden();
  // Dispositivo touch real, para não confundir viewport estreita com emulação de toque.
  const mobile=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  try {
    const mPage=await mobile.newPage();
    mPage.on('pageerror',e=>pageErrors.push(e.message));
    await mPage.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
    await mPage.locator('#new-game').click();
    await mPage.locator('[data-game-mode="relaxed"]').click();
    const mTip=mPage.locator('#starter-specialty-tooltip');
    const target=mPage.locator('.starter-chip.specialty').first();
    await target.tap();
    await expect(mTip).toBeVisible();
    await expect(target).toHaveAttribute('aria-expanded','true');
    await mPage.screenshot({path:'screenshots/tooltip-especialidade-mobile-390x844.png',animations:'disabled'});
    await target.tap();
    await expect(mTip).toBeHidden();
    await expect(target).toHaveAttribute('aria-expanded','false');
    await mPage.locator('#starter-confirm').click();
    await expect(mPage.locator('#menu')).toBeHidden();
  } finally {
    await mobile.close();
  }
  expect(pageErrors).toEqual([]);
});


test('Tela inicial limpa: navegação, rodapé, créditos, som e tutorial',async({page})=>{
 for(const size of [{width:1366,height:768},{width:390,height:844}]){
   await page.setViewportSize(size);
   await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
   await expect(page.locator('#menu .title-cards')).toHaveCount(0);
   await expect(page.locator('.title-card-preview')).toHaveCount(0);
   await expect(page.locator('#new-game')).toBeVisible();
   const positions=await page.evaluate(()=>{
     const navigation=document.querySelector('#menu .title-navigation').getBoundingClientRect();
     const footer=document.querySelector('#menu .title-version').getBoundingClientRect();
     const menu=document.querySelector('#menu').getBoundingClientRect();
     return {navBottom:navigation.bottom,footerTop:footer.top,footerBottom:footer.bottom,
       menuHeight:menu.height,hasHorizontalOverflow:document.documentElement.scrollWidth>window.innerWidth+1};
   });
   expect(positions.navBottom).toBeLessThanOrEqual(positions.footerTop+2);
   expect(positions.footerBottom).toBeLessThanOrEqual(positions.menuHeight+3);
   expect(positions.hasHorizontalOverflow).toBe(false);
   await page.screenshot({path:'screenshots/menu-limpo-'+size.width+'x'+size.height+'.png',animations:'disabled'});
 }
 await page.setViewportSize({width:1366,height:768});
 await page.locator('#title-credits').click();
 await expect(page.locator('#title-credits-dialog')).toContainText('Hélio Conde');
 await expect(page.locator('#title-credits-dialog')).toContainText('Cup Nooble');
 await page.screenshot({path:'screenshots/creditos-v2.png'});
 await page.locator('#title-credits-dialog .modal-x').click();
 await page.locator('#title-settings').click();
 await page.locator('#title-sound').uncheck();
 await page.locator('#title-volume').evaluate(el=>{el.value='25';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await expect(page.locator('#title-sound-test')).toBeDisabled();
 await page.screenshot({path:'screenshots/configuracoes-som-v2.png'});
 await page.locator('#title-settings-dialog .modal-x').click();
 await page.reload({waitUntil:'networkidle'});
 await page.locator('#title-settings').click();
 await expect(page.locator('#title-sound')).not.toBeChecked();
 await expect(page.locator('#title-volume')).toHaveValue('25');
 await page.locator('#title-settings-dialog .modal-x').click();
 await page.locator('#help-btn').click();
 await expect(page.locator('.guide-step:not([hidden])')).toHaveCount(1);
 await expect(page.locator('.guide-art')).toHaveCount(6);
 await page.screenshot({path:'screenshots/tutorial-passo-1.png'});
 for(let i=1;i<6;i++)await page.locator('#help-next').click();
 await expect(page.locator('#guide-counter')).toHaveText('6 de 6');
 await expect(page.locator('#help-close')).toBeVisible();
 await page.screenshot({path:'screenshots/tutorial-passo-6.png'});
 await page.locator('#help-close').click();
 await expect(page.locator('#help-dialog')).toBeHidden();
});

test('Fazenda tranquila: árvores completas, poço inteiro e nenhum sprite cortado',async({page})=>{
  await page.setViewportSize({width:1366,height:768});
  await page.addInitScript(()=>{
    window.__relaxedFrames=[];
    const original=CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage=function(...args){
      if(this.canvas?.dataset?.preview==='mode-relaxed'&&args.length===9){
        const img=args[0];
        window.__relaxedFrames.push({
          src:img.currentSrc||img.src||'',sx:args[1],sy:args[2],sw:args[3],sh:args[4],
          dx:args[5],dy:args[6],dw:args[7],dh:args[8],
          imageWidth:img.naturalWidth||img.width,imageHeight:img.naturalHeight||img.height,
          canvasWidth:this.canvas.width,canvasHeight:this.canvas.height
        });
        if(window.__relaxedFrames.length>200)window.__relaxedFrames.splice(0,100);
      }
      return original.apply(this,args);
    };
  });
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await page.locator('#new-game').click();
  await expect(page.locator('#mode-dialog')).toBeVisible();
  await page.waitForFunction(()=>window.__relaxedFrames?.filter(f=>f.src.includes('trees-and-bushes')).length>=2);
  const frames=await page.evaluate(()=>window.__relaxedFrames);
  const trees=frames.filter(f=>f.src.includes('trees-and-bushes'));
  const wells=frames.filter(f=>f.src.includes('water-well'));
  const workers=frames.filter(f=>f.src.includes('worker-variants'));
  expect(trees.length).toBeGreaterThanOrEqual(2);
  expect(wells.length).toBeGreaterThanOrEqual(1);
  expect(workers.length).toBeGreaterThanOrEqual(1);
  for(const frame of trees){
    expect([frame.sx,frame.sy,frame.sw,frame.sh]).toEqual([16,0,32,32]);
  }
  for(const frame of [...trees,...wells,...workers]){
    expect(frame.imageWidth).toBeGreaterThanOrEqual(frame.sx+frame.sw);
    expect(frame.imageHeight).toBeGreaterThanOrEqual(frame.sy+frame.sh);
    expect(frame.sx).toBeGreaterThanOrEqual(0);
    expect(frame.sy).toBeGreaterThanOrEqual(0);
    expect(frame.dx).toBeGreaterThanOrEqual(0);
    expect(frame.dy).toBeGreaterThanOrEqual(0);
    expect(frame.dx+frame.dw).toBeLessThanOrEqual(frame.canvasWidth);
    expect(frame.dy+frame.dh).toBeLessThanOrEqual(frame.canvasHeight);
  }
  await page.locator('#mode-dialog').screenshot({
    path:'screenshots/fazenda-tranquila-sprites-corrigidos-1366x768.png',
    animations:'disabled'
  });
});


test('HUD pixel art: cabe na tela, mantém ações utilizáveis e captura estados',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1366,height:768});
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await page.locator('#new-game').click();
  await page.locator('[data-game-mode="relaxed"]').click();
  await page.locator('#starter-confirm').click();
  await expect(page.locator('body')).toHaveClass(/play-session/);
  await expect(page.locator('#hud-tool-name')).toHaveText('UNIVERSAL');
  await expect(page.locator('.tooltray')).toBeVisible();
  await page.waitForTimeout(400);
  const desktop=await page.evaluate(()=>{
    const box=s=>document.querySelector(s).getBoundingClientRect();
    const dock=box('.tooltray'),header=box('.topbar'),info=box('.hud-selection');
    const skins=getComputedStyle(document.querySelector('.tool span')).backgroundImage;
    return {dockLeft:dock.left,dockRight:dock.right,dockBottom:dock.bottom,
      hudTop:header.top,hudBottom:header.bottom,infoBottom:info.bottom,
      viewportWidth:innerWidth,viewportHeight:innerHeight,skin:skins,
      tools:[...document.querySelectorAll('.tool')].map(b=>({name:b.dataset.tool,
        visible:b.getBoundingClientRect().height>=58}))};
  });
  expect(desktop.dockLeft).toBeGreaterThanOrEqual(0);
  expect(desktop.dockRight).toBeLessThanOrEqual(desktop.viewportWidth);
  expect(desktop.dockBottom).toBeLessThanOrEqual(desktop.viewportHeight);
  expect(desktop.hudBottom).toBeLessThanOrEqual(90);
  expect(desktop.skin).toMatch(/data:image\/png|Square(?:%20|\\s)Buttons/);
  expect(desktop.tools.every(t=>t.visible)).toBe(true);
  await page.screenshot({path:'screenshots/hud-pixel-desktop-1366x768.png',animations:'disabled'});
  await page.locator('#orders-btn').click();
  await expect(page.locator('#orders-panel')).toBeVisible();
  await page.locator('[data-order-type="clear"]').click();
  await expect(page.locator('#hud-tool-name')).toHaveText('LIMPAR');
  await page.screenshot({path:'screenshots/hud-pixel-ordens-1366x768.png',animations:'disabled'});
  await page.locator('#open-workers').click();
  await expect(page.locator('#farm-sidebar')).toBeVisible();
  await page.screenshot({path:'screenshots/hud-pixel-equipe-1366x768.png',animations:'disabled'});
  await page.locator('#drawer-close').click();
  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(300);
  const mobile=await page.evaluate(()=>{
    const b=s=>document.querySelector(s).getBoundingClientRect();
    return {dock:b('.tooltray').toJSON(),header:b('.topbar').toJSON(),width:innerWidth,height:innerHeight,
      tools:[...document.querySelectorAll('.tool')].map(t=>t.getBoundingClientRect().toJSON())};
  });
  expect(mobile.dock.left).toBeGreaterThanOrEqual(-1);
  expect(mobile.dock.right).toBeLessThanOrEqual(mobile.width+1);
  expect(mobile.dock.bottom).toBeLessThanOrEqual(mobile.height+1);
  expect(mobile.tools.every(t=>t.left>=-1&&t.right<=mobile.width+1)).toBe(true);
  await page.screenshot({path:'screenshots/hud-pixel-mobile-390x844.png',animations:'disabled'});
  expect(errors).toEqual([]);
});


test('Sprout Lands UI: atlas original em botões, painel, slots e celular',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1366,height:768});
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await page.locator('#new-game').click();
  await page.locator('[data-game-mode="relaxed"]').click();
  await page.locator('#starter-confirm').click();
  await page.waitForFunction(()=>document.documentElement.classList.contains('sprout-inventory-ready')&&document.documentElement.classList.contains('sprout-sheet-ready'));
  const result=await page.evaluate(()=>{
    const style=s=>getComputedStyle(document.querySelector(s));
    const bounds=s=>document.querySelector(s).getBoundingClientRect();
    const slot=style('.tool.active span').backgroundImage;
    const button=style('.speed-wrap button.chosen').borderImageSource;
    const tooltip=style('.hud-selection').borderImageSource;
    const dock=bounds('.tooltray');
    return {slot,button,tooltip,dock:{left:dock.left,right:dock.right,bottom:dock.bottom},
      viewport:{width:innerWidth,height:innerHeight}};
  });
  expect(result.slot).toContain('data:image/png');
  expect(result.button).toContain('data:image/png');
  expect(result.tooltip).toMatch(/dialog(?:%20| )box(?:%20| )big\.png/);
  expect(result.dock.left).toBeGreaterThanOrEqual(0);
  expect(result.dock.right).toBeLessThanOrEqual(result.viewport.width+1);
  expect(result.dock.bottom).toBeLessThanOrEqual(result.viewport.height+1);
  await page.screenshot({path:'screenshots/sprout-ui-jogo-desktop-1366x768.png',animations:'disabled'});
  await page.locator('#open-workers').click();
  await page.screenshot({path:'screenshots/sprout-ui-equipe-1366x768.png',animations:'disabled'});
  await page.locator('#drawer-close').click();
  await page.locator('#orders-btn').click();
  await page.screenshot({path:'screenshots/sprout-ui-ordens-1366x768.png',animations:'disabled'});
  await page.locator('#orders-btn').click();
  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(250);
  const mobile=await page.evaluate(()=>{
    const r=document.querySelector('.tooltray').getBoundingClientRect();
    const tools=[...document.querySelectorAll('.tool')].map(t=>t.getBoundingClientRect());
    return {left:r.left,right:r.right,bottom:r.bottom,width:innerWidth,height:innerHeight,
      allToolsVisible:tools.every(t=>t.left>=-1&&t.right<=innerWidth+1)};
  });
  expect(mobile.left).toBeGreaterThanOrEqual(-1);
  expect(mobile.right).toBeLessThanOrEqual(mobile.width+1);
  expect(mobile.bottom).toBeLessThanOrEqual(mobile.height+1);
  expect(mobile.allToolsVisible).toBe(true);
  await page.screenshot({path:'screenshots/sprout-ui-jogo-mobile-390x844.png',animations:'disabled'});
  expect(errors).toEqual([]);
});


test('Menu vivo: lenhador derruba árvore, corta o toco, muda cresce e vacas passeiam',async({page})=>{
  const fs=require('node:fs');
  const failures=[];
  page.on('pageerror',error=>failures.push(String(error)));
  page.on('response',response=>{
    if(response.status()>=400&&/\/sprout-lands\//.test(response.url()))
      failures.push('Sprite ausente: '+response.url());
  });
  await page.setViewportSize({width:1366,height:768});
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>{
    const scene=window.TillfolkMenuScene;
    return scene && scene.assetHealth().ready===scene.assetHealth().total;
  });
  const info=await page.evaluate(()=>{
    const scene=window.TillfolkMenuScene;
    const times=[0,8500,13000,15000,17100,19200,22500,30000];
    return {
      frames:times.map(t=>scene.sample(t)),
      sourceFiles:Object.values(scene.sources),
      assets:scene.assetHealth(),
      cycle:scene.cycleMs
    };
  });
  const [initial,chopping,falling,stump,stumpChop,cleared,growing,regrown]=info.frames;
  expect(info.assets.failed).toEqual([]);
  expect(info.sourceFiles).not.toContain('structures/fences.png');
  expect(info.cycle).toBeGreaterThanOrEqual(28000);
  expect(chopping.logger.action).toBe('chop');
  expect(chopping.tree.phase).toBe('mature');
  expect(falling.tree.phase).toBe('falling');
  expect(stump.tree.phase).toBe('stump');
  expect(stumpChop.tree.phase).toBe('stump');
  expect(stumpChop.logger.action).toBe('stump-chop');
  expect(cleared.tree.phase).toBe('cleared');
  expect(cleared.tree.growth).toBe(0);
  expect(growing.tree.phase).toBe('growing');
  expect(growing.tree.growth).toBeGreaterThan(0);
  expect(growing.tree.growth).toBeLessThan(1);
  expect(regrown.tree.phase).toBe('mature');
  expect(initial.logger.x).not.toBe(chopping.logger.x);
  expect(initial.gardener.x).not.toBe(chopping.gardener.x);
  expect(initial.animals).toHaveLength(4);
  expect(initial.animals.filter(a=>a.kind==='cow')).toHaveLength(2);
  expect(initial.animals.filter(a=>a.kind==='chicken')).toHaveLength(2);
  expect(info.sourceFiles).toContain('animals/cow.png');
  expect(info.sourceFiles).toContain('animals/chicken.png');
  expect(initial.animals[0].x).not.toBe(chopping.animals[0].x);
  expect(initial.cropStage).not.toBe(growing.cropStage);
  fs.mkdirSync('screenshots',{recursive:true});
  const phases=[['lavoura',0],['lenhador',8500],['queda',13000],['toco',15000],['cortando-toco',17100],['terreno-limpo',19200],['reflorestamento',22500],['arvore-adulta',30000]];
  const images=[];
  for(const [name,ms] of phases){
    const base64=await page.evaluate(ms=>{
      window.TillfolkMenuScene.drawAt(ms);
      return document.querySelector('#title-scene').toDataURL('image/png').split(',')[1];
    },ms);
    fs.writeFileSync('screenshots/menu-vivo-'+name+'.png',Buffer.from(base64,'base64'));
    images.push(base64);
  }
  expect(new Set(images).size).toBeGreaterThanOrEqual(5);
  await page.screenshot({path:'screenshots/menu-vivo-desktop-1366x768.png',animations:'disabled'});
  // A opção de animação desativada deve congelar os pixels do Canvas.
  await page.locator('#title-settings').click();
  await page.locator('#title-motion').uncheck();
  await page.locator('#title-settings-dialog .modal-x').click();
  const frozen=await page.locator('#title-scene').evaluate(canvas=>canvas.toDataURL());
  await page.waitForTimeout(380);
  expect(await page.locator('#title-scene').evaluate(canvas=>canvas.toDataURL())).toBe(frozen);
  expect(failures).toEqual([]);
});

test('Menu: vacas acima da casa e tronco removido antes do novo crescimento',async({page})=>{
  const fs=require('node:fs');
  await page.setViewportSize({width:1366,height:768});
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>{
    const scene=window.TillfolkMenuScene;
    return scene&&scene.assetHealth().ready===scene.assetHealth().total;
  });
  const result=await page.evaluate(()=>{
    const scene=window.TillfolkMenuScene,canvas=document.querySelector('#title-scene');
    const frames=Array.from({length:37},(_,i)=>scene.sample(i*1000));
    const ctx=canvas.getContext('2d'),original=ctx.drawImage,draws=[];
    ctx.drawImage=function(img,...args){
      const src=img.currentSrc||img.src||'';
      if(src.includes('trees-and-bushes.png')||src.includes('/animals/'))draws.push({
        src,sx:args[0],sy:args[1],sw:args[2],sh:args[3],
        x:args[4],y:args[5],w:args[6],h:args[7]});
      return original.call(this,img,...args);
    };
    function capture(time){
      draws.length=0;
      scene.drawAt(time);
      return draws.slice();
    }
    const stump=capture(15000),cleared=capture(19200),sprout=capture(22500);
    ctx.drawImage=original;
    // A inspeção considera SOMENTE a árvore da obra (x≈841, y≈447).
    const local=entries=>entries.filter(d=>d.src.includes('trees-and-bushes.png')
      &&d.x>=816&&d.x<=865&&d.y>=389&&d.y<=470);
    return {frames,stump:local(stump),cleared:local(cleared),sprout:local(sprout),
      cowDraws:cleared.filter(d=>d.src.includes('/animals/cow.png')).length,
      chickenDraws:cleared.filter(d=>d.src.includes('/animals/chicken.png')).length};
  });
  expect(result.frames.every(f=>f.animals.length===4)).toBe(true);
  for(const frame of result.frames){
    const [cow1,cow2,chicken1,chicken2]=frame.animals;
    expect(cow1.kind).toBe('cow');
    expect(cow2.kind).toBe('cow');
    expect(chicken1.kind).toBe('chicken');
    expect(chicken2.kind).toBe('chicken');
    for(const animal of frame.animals){
      const w=animal.kind==='cow'?66:37;
      const h=animal.kind==='cow'?58:37;
      expect(animal.x).toBeGreaterThan(640);
      expect(animal.x+w).toBeLessThanOrEqual(960);
      expect(animal.y).toBeGreaterThanOrEqual(65);
      expect(animal.y+h).toBeLessThan(175);
    }
  }
  const stumpSprite=r=>r.sx===32&&r.sy===96&&r.sw===16&&r.sh===16;
  expect(result.stump.some(stumpSprite)).toBe(true);
  expect(result.cleared.some(stumpSprite)).toBe(false);
  expect(result.sprout.some(stumpSprite)).toBe(false);
  expect(result.cowDraws).toBeGreaterThanOrEqual(2);
  expect(result.chickenDraws).toBeGreaterThanOrEqual(2);
  fs.mkdirSync('screenshots',{recursive:true});
  for(const [name,time] of [['toco-em-corte',17100],['sem-toco',19200],['muda-sem-toco',22500],['vacas-acima-casa',5000]]){
    const base64=await page.evaluate(ms=>{
      window.TillfolkMenuScene.drawAt(ms);
      return document.querySelector('#title-scene').toDataURL('image/png').split(',')[1];
    },time);
    fs.writeFileSync('screenshots/menu-'+name+'.png',Buffer.from(base64,'base64'));
  }
  await page.screenshot({path:'screenshots/menu-vacas-acima-casa-desktop.png',animations:'disabled'});
});


test('Subtítulo do menu: contraste, legibilidade e seleção de texto',async({page})=>{
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  for(const view of [{width:1366,height:768},{width:390,height:844}]){
    await page.setViewportSize(view);
    const tagline=page.locator('#menu .title-navigation > .title-tagline');
    await expect(tagline).toBeVisible();
    await expect(tagline).toHaveText('Uma fazenda cresce melhor quando cada pessoa encontra seu talento.');
    const design=await tagline.evaluate(el=>{
      const css=getComputedStyle(el);
      const r=el.getBoundingClientRect();
      return {color:css.color,background:css.backgroundColor,fontSize:parseFloat(css.fontSize),
        textShadow:css.textShadow,left:r.left,right:r.right,width:r.width,height:r.height};
    });
    expect(design.color).toBe('rgb(255, 248, 220)');
    const rgba=design.background.match(/rgba?\(([^)]+)\)/);
    expect(rgba).not.toBeNull();
    const numbers=rgba[1].split(',').map(Number);
    expect(numbers[0]).toBeLessThan(40);
    expect(numbers[1]).toBeLessThan(50);
    expect(numbers[2]).toBeLessThan(40);
    expect(numbers[3]??1).toBeGreaterThanOrEqual(.9);
    expect(design.fontSize).toBeGreaterThanOrEqual(13);
    expect(design.textShadow).not.toBe('none');
    expect(design.left).toBeGreaterThanOrEqual(0);
    expect(design.right).toBeLessThanOrEqual(view.width+1);
    expect(design.height).toBeGreaterThan(35);
    await page.screenshot({path:'screenshots/menu-frase-legivel-'+view.width+'x'+view.height+'.png',animations:'disabled'});
  }
});

test('Homenagem à Simone: nomes brasileiros, apelidos e recrutamento',async({page})=>{
  const fs=require('node:fs');
  const code=fs.readFileSync('src/game.js','utf8');
  const match=code.match(/const names=(\[[\s\S]*?\]);/);
  expect(match).not.toBeNull();
  const pool=JSON.parse(match[1]);
  expect(pool.length).toBeGreaterThanOrEqual(35);
  expect(new Set(pool).size).toBe(pool.length);
  for(const name of ['Sim','Simo','Mone','Simone','Mônica','Luna','Manu','Flávia',
    'João','Ana','Maria','Simônica','Môniquinha','Zezinho']){
    expect(pool).toContain(name);
  }
  const generated=name=>{
    const parsed=/^(.+) (\d{2})$/.exec(name);
    expect(parsed).not.toBeNull();
    expect(pool).toContain(parsed[1]);
  };
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await page.locator('#new-game').click();
  await page.locator('[data-game-mode="relaxed"]').click();
  await expect(page.locator('.starter-name-input')).toHaveCount(2);
  const initial=await page.locator('.starter-name-input').evaluateAll(nodes=>nodes.map(n=>n.value));
  expect(initial).toHaveLength(2);
  expect(initial[0]).not.toBe(initial[1]);
  for(const name of initial)generated(name);
  await page.locator('#starter-reroll-all').click();
  const rerolled=await page.locator('.starter-name-input').evaluateAll(nodes=>nodes.map(n=>n.value));
  for(const name of rerolled)generated(name);
  // Renomeação manual continua permitida e preservada.
  await page.locator('.starter-name-input').first().fill('Minha Simone');
  await page.locator('.starter-name-input').first().dispatchEvent('change');
  await page.locator('#starter-confirm').click();
  const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('tillfolk-v01')));
  expect(state.workers[0].name).toBe('Minha Simone');
  generated(state.workers[1].name);
  expect(state.candidates.slice(0,3).map(c=>c.name)).toEqual(['Sim','Mônica','Manu']);
});

test('Homenagem a Simone: migrar só apelidos automáticos em saves antigos',async({page})=>{
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await page.locator('#new-game').click();
  await page.locator('[data-game-mode="relaxed"]').click();
  await page.locator('#starter-confirm').click();
  await page.evaluate(()=>{
    const key='tillfolk-v01',s=JSON.parse(localStorage.getItem(key));
    s.workers[0].name='Lua 88';
    s.workers[1].name='Eva 59';
    s.candidates=[{name:'Zeca 91',skills:[],neg:[],cost:70,color:'#fff2bd'},
      {name:'Simone',skills:[],neg:[],cost:80,color:'#ffcfc5'}];
    localStorage.setItem(key,JSON.stringify(s));
  });
  await page.reload({waitUntil:'networkidle'});
  await continueIfMenuVisible(page);
  const changed=await page.evaluate(()=>JSON.parse(localStorage.getItem('tillfolk-v01')));
  expect(changed.workers.map(w=>w.name)).toEqual(['Mone 88','Moni 59']);
  expect(changed.candidates.map(c=>c.name)).toEqual(['Moni 91','Simone']);
  expect(changed.workers.every(w=>w.skills&&w.neg)).toBe(true);
  await page.reload({waitUntil:'networkidle'});
  await continueIfMenuVisible(page);
  const again=await page.evaluate(()=>JSON.parse(localStorage.getItem('tillfolk-v01')));
  expect(again.workers.map(w=>w.name)).toEqual(changed.workers.map(w=>w.name));
});
