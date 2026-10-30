"use strict";
/* Casa de TILLFOLK: portabilidade web da arquitetura em camadas de
   Slime-Harvest/scripts/building/house_builder.gd. Sem assets novos. */
(() => {
  const TILE = 32, WIDTH = 28, HEIGHT = 18, MAX_FLOORS = 25;
  let doorOpenness=0,doorTimestamp=0;
  const key = (x,y) => x + "-" + y;
  const decode = value => value.split("-").map(Number);
  const inside = (x,y) => x >= 2 && x < WIDTH-2 && y >= 2 && y < HEIGHT-2;
  const neighbors = [[0,-1],[0,1],[-1,0],[1,0]];
  const contains = (list,x,y) => list.includes(key(x,y));

  function initial() {
    const floor = [], walls = [], roof = [];
    for (let y=7;y<=9;y++) for (let x=4;x<=8;x++) floor.push(key(x,y));
    for (let x=4;x<=8;x++) {
      walls.push(key(x,7));
      if (x!==6) walls.push(key(x,9));
    }
    walls.push(key(4,8),key(8,8));
    for (let y=5;y<=7;y++) for (let x=3;x<=9;x++) roof.push(key(x,y));
    return {version:1,anchor:key(4,7),door:key(6,9),floor,walls,roof,roofHidden:false};
  }

  function normalize(value) {
    if (!value || typeof value !== "object") return initial();
    const fallback = initial();
    const read = (name,max) => {
      if (!Array.isArray(value[name])) return fallback[name];
      return [...new Set(value[name].filter(v => {
        if (typeof v !== "string" || !/^\d{1,2}-\d{1,2}$/.test(v)) return false;
        const [x,y]=decode(v);
        return inside(x,y);
      }))].slice(0,max);
    };
    const floor=read("floor",MAX_FLOORS);
    if (!floor.length || !floor.includes(fallback.anchor)) return fallback;
    const walls=read("walls",100).filter(v=>v!==fallback.door);
    const roof=read("roof",120);
    return {version:1,anchor:fallback.anchor,door:fallback.door,floor,walls,roof,roofHidden:!!value.roofHidden};
  }

  function touchesFloor(house,x,y,rangeX=1,rangeY=1) {
    return house.floor.some(v => {
      const [fx,fy]=decode(v);
      return Math.abs(fx-x)<=rangeX && Math.abs(fy-y)<=rangeY;
    });
  }
  function connected(floor) {
    if (!floor.length) return false;
    const all=new Set(floor),seen=new Set([floor[0]]),queue=[floor[0]];
    for(let i=0;i<queue.length;i++){
      const [x,y]=decode(queue[i]);
      for(const [dx,dy] of neighbors){
        const candidate=key(x+dx,y+dy);
        if(all.has(candidate)&&!seen.has(candidate)){seen.add(candidate);queue.push(candidate);}
      }
    }
    return seen.size===all.size;
  }
  function occupied(house,x,y) {
    return contains(house.floor,x,y) || contains(house.walls,x,y) || contains(house.roof,x,y);
  }
  function edit(input,layer,x,y,erase=false,isOccupied=()=>false) {
    const house=normalize(input);
    if (!["floor","walls","roof"].includes(layer)) return {error:"Selecione piso, parede ou telhado."};
    if (!inside(x,y)) return {error:"Deixe dois blocos livres nas bordas do mapa."};
    const id=key(x,y),list=house[layer],exists=list.includes(id);
    if (erase) {
      if (!exists) return {error:"Não há peça desta camada neste espaço."};
      if (layer==="floor" && id===house.anchor) return {error:"A fundação original da casa não pode ser removida."};
      const next={...house,[layer]:list.filter(v=>v!==id)};
      if (layer==="floor") {
        if (!connected(next.floor)) return {error:"O piso da casa precisa continuar conectado."};
        if (next.walls.some(v=>{const [wx,wy]=decode(v);return !touchesFloor(next,wx,wy);}) ||
            next.roof.some(v=>{const [rx,ry]=decode(v);return !touchesFloor(next,rx,ry,1,3);}))
          return {error:"Retire primeiro as paredes e o telhado que dependem deste piso."};
        if (id===house.door) return {error:"A entrada da casa precisa permanecer livre."};
      }
      return {house:next};
    }
    if (exists) return {error:"Esta peça já está colocada."};
    if (layer==="floor") {
      if (house.floor.length>=MAX_FLOORS) return {error:"Madeira esgotada: limite de 25 peças de piso."};
      if (!neighbors.some(([dx,dy])=>contains(house.floor,x+dx,y+dy)))
        return {error:"Expanda a casa encostando o piso na fundação existente."};
      if (isOccupied(x,y)) return {error:"O terreno está ocupado por cultivo, árvore, objeto ou trabalhador."};
    } else {
      if (id===house.door && layer==="walls") return {error:"A entrada deve ficar livre de paredes."};
      if (!touchesFloor(house,x,y,1,layer==="roof"?3:1))
        return {error:"Construa esta camada perto do piso da casa."};
      if (layer==="walls" && contains(house.floor,x,y) && y===9 && x===6)
        return {error:"Não bloqueie a porta de entrada."};
      if (list.length>=(layer==="roof"?120:100)) return {error:"Limite de peças desta camada atingido."};
    }
    return {house:{...house,[layer]:[...list,id]}};
  }

  function draw(ctx,sprites,part,raw,options={}) {
    const house=normalize(raw);
    const building=!!options.building,layer=options.layer||"floor";
    const floor=new Set(house.floor),wall=new Set(house.walls),roof=new Set(house.roof);
    // O mesmo atlas 16x16 de paredes/assoalho do Slime-Harvest, sem escalas fracionadas.
    for(const id of floor) {
      const [x,y]=decode(id);
      part(sprites.walls,16,16,16,16,x*TILE,y*TILE,TILE,TILE);
    }
    for(const id of wall) {
      const [x,y]=decode(id);
      const left=wall.has(key(x-1,y)),right=wall.has(key(x+1,y));
      const up=wall.has(key(x,y-1)),down=wall.has(key(x,y+1));
      const sx=(!left&&right)?0:(!right&&left)?32:16;
      const sy=(!up&&down)?0:(!down&&up)?32:16;
      part(sprites.walls,sx,sy,16,16,x*TILE,y*TILE,TILE,TILE);
      // Uma janela usa um recorte real do mesmo atlas, nunca um retângulo desenhado.
      if(y===9 && (x===4||x===8))part(sprites.walls,0,0,16,16,x*TILE,y*TILE,TILE,TILE);
    }
    const [doorX,doorY]=decode(house.door);
    if(floor.has(house.door)) {
      // Animação da porta já existente no pacote: seis frames (aberta -> fechada).
      const residents=Array.isArray(options.workers)?options.workers:[];
      const nearby=residents.some(w=>Math.hypot(w.x-doorX-.5,w.y-doorY-.5)<2);
      const target=nearby?1:0;
      const now=performance.now();
      const elapsed=doorTimestamp?Math.min(.08,(now-doorTimestamp)/1000):0;
      doorTimestamp=now;
      doorOpenness+=Math.sign(target-doorOpenness)*Math.min(Math.abs(target-doorOpenness),elapsed*3);
      const frame=5-Math.round(doorOpenness*5);
      part(sprites.door,frame*16,0,16,32,doorX*TILE,doorY*TILE-TILE,TILE,TILE*2);
      if(!building) {
        part(sprites.furniture,0,16,16,16,(doorX-2)*TILE,(doorY+1)*TILE,24,24);
        part(sprites.chest,0,0,32,32,(doorX+2)*TILE,(doorY+1)*TILE,30,30);
      }
    }
    // No editor, a cobertura se recolhe ao pintar piso/parede.
    const showRoof = (building && layer==="roof") || (!building && !house.roofHidden);
    if(showRoof && roof.size) {
      const rows=house.roof.map(v=>decode(v)[1]),top=Math.min(...rows),bottom=Math.max(...rows);
      const ridge=Math.round((top+bottom)/2);
      ctx.save();
      if(building)ctx.globalAlpha=.83;
      for(const id of roof) {
        const [x,y]=decode(id);
        const left=roof.has(key(x-1,y)),right=roof.has(key(x+1,y));
        const up=roof.has(key(x,y-1)),down=roof.has(key(x,y+1));
        const atlasX=!left?0:!right?2:1;
        const atlasY=!up?0:!down?4:y===ridge?2:y<ridge?1:3;
        part(sprites.roof,atlasX*16,atlasY*16,16,16,x*TILE,y*TILE,TILE,TILE);
      }
      ctx.restore();
    }
    if(building && Number.isInteger(options.previewX)&&Number.isInteger(options.previewY)){
      const x=options.previewX*TILE,y=options.previewY*TILE,ok=options.previewValid;
      ctx.save();
      ctx.fillStyle=ok?"#b5eb7780":"#f27c6688";
      ctx.strokeStyle=ok?"#fff5ac":"#ffb0a0";
      ctx.lineWidth=2;ctx.fillRect(x+2,y+2,TILE-4,TILE-4);
      ctx.strokeRect(x+1,y+1,TILE-2,TILE-2);
      ctx.restore();
    }
  }
  window.TillfolkHouse={initial,normalize,edit,draw,occupied,contains,MAX_FLOORS};
})();
