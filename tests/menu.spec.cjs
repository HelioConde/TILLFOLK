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
  await page.locator('#continue').click();
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
  await page.locator('#continue').click();
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
  await page.mouse.click(location.cx,location.cy);
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
      roofBeforeWindows:calls.findIndex(c=>c.asset==='roof')<calls.findIndex(c=>c.asset==='walls'&&c.sx===48&&c.sy===32)};
  });
  expect(result.stats.stretched).toBe(0);
  expect(result.stats.walls).toBe(20);
  expect(result.windows.map(w=>[w.dx,w.dy])).toEqual([[64,224],[128,224]]);
  expect(result.doors.map(d=>[d.dx,d.dy])).toEqual([[96,224]]);
  expect(result.roofMin).toBe(48);
  expect(result.roofMax).toBe(208);
  expect(result.rooftopCount).toBe(36);
  expect(result.allUniform).toBe(true);
  expect(result.roofBeforeWindows).toBe(true);
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
