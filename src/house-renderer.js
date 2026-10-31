"use strict";
/* TILLFOLK — montagem de casa baseada em HelioConde/Slime-Harvest,
   scripts/building/house_builder.gd: _roof_atlas, _wall_atlas,
   _add_front_windows e _add_roof_chimney.
   Sem criar prédios automaticamente na área jogável. */
(() => {
  const TILE=16,ROOF_COLS=7,ROOF_ROWS=5,WALL_COLS=5,WALL_ROWS=4;

  function roofAtlas(col,row,width=ROOF_COLS,height=ROOF_ROWS){
    if(!Number.isInteger(col)||!Number.isInteger(row)||
       col<0||row<0||col>=width||row>=height)
      throw new RangeError("Célula do telhado inválida");
    const x=col===0?0:col===width-1?2:1;
    const ridge=Math.floor((height-1)/2);
    const y=row===0?0:row===height-1?4:row===ridge?2:row<ridge?1:3;
    return [x,y];
  }

  function wallAtlas(col,row,width=WALL_COLS,height=WALL_ROWS){
    if(!Number.isInteger(col)||!Number.isInteger(row)||
       col<0||row<0||col>=width||row>=height)
      throw new RangeError("Célula de parede inválida");
    return [col===0?0:col===width-1?2:1,
            row===0?0:row===height-1?2:1];
  }

  function dimensions(scale=2){
    const cell=TILE*scale;
    return {width:ROOF_COLS*cell,height:(ROOF_ROWS+WALL_ROWS-1)*cell,cell};
  }

  function draw(ctx,assets,x,y,{scale=2,roofVisible=true}={}){
    if(!Number.isInteger(scale)||scale<1||scale>6)
      throw new RangeError("Escala precisa ser um inteiro de 1 a 6");
    if(!ctx||typeof ctx.drawImage!=="function")
      throw new TypeError("Canvas 2D obrigatório");
    const cell=TILE*scale,originX=Math.round(x),originY=Math.round(y);
    const facadeX=originX+cell,facadeY=originY+(ROOF_ROWS-1)*cell;
    const stats={drawn:0,stretched:0,roof:0,walls:0,windows:0,doors:0,chimneys:0};
    ctx.imageSmoothingEnabled=false;

    function stamp(name,atlasX,atlasY,dx,dy,tilesWide=1,tilesHigh=1){
      const img=assets[name];
      if(!img||!img.complete||!img.naturalWidth)return;
      const sx=atlasX*TILE,sy=atlasY*TILE;
      const sw=tilesWide*TILE,sh=tilesHigh*TILE;
      if(sx+sw>img.naturalWidth||sy+sh>img.naturalHeight)return;
      const dw=sw*scale,dh=sh*scale;
      if(dw*sh!==dh*sw)stats.stretched++;
      ctx.drawImage(img,sx,sy,sw,sh,Math.round(dx),Math.round(dy),dw,dh);
      stats.drawn++;
    }

    // Fachada e chão/paredes como camadas independentes da cobertura.
    for(let row=0;row<WALL_ROWS;row++){
      for(let col=0;col<WALL_COLS;col++){
        const [sx,sy]=wallAtlas(col,row);
        stamp("walls",sx,sy,facadeX+col*cell,facadeY+row*cell);
        stats.walls++;
      }
    }
    // Janelas alinhadas na segunda fileira: acima do rodapé, sob o beiral.
    for(const col of [1,3]){
      stamp("walls",3,2,facadeX+col*cell,facadeY+2*cell);
      stats.windows++;
    }
    // AutomaticDoor do Slime-Harvest utiliza o frame 5, em (80,0).
    stamp("door",5,0,facadeX+2*cell,facadeY+3*cell);
    stats.doors++;

    if(roofVisible){
      // Cinco faixas originais: topo, inclinação, cumeeira, inclinação e beiral.
      for(let row=0;row<ROOF_ROWS;row++){
        for(let col=0;col<ROOF_COLS;col++){
          const [sx,sy]=roofAtlas(col,row);
          stamp("roof",sx,sy,originX+col*cell,originY+row*cell);
          stats.roof++;
        }
      }
      // Chaminé sobre uma telha já colocada, igual à sobreposição Godot.
      stamp("roof",5,0,originX+3*cell,originY+2*cell);
      stats.chimneys++;
    }
    return {...stats,...dimensions(scale),x:originX,y:originY,scale};
  }

  window.TillfolkHouse=Object.freeze({
    draw,roofAtlas,wallAtlas,dimensions,
    reference:"HelioConde/Slime-Harvest/scripts/building/house_builder.gd"
  });
})();
