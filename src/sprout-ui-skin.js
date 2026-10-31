"use strict";
/* Recorta o spritesheet de UI oficial carregado no próprio projeto.
 * Os sprites de borda preservam seus pixels originais, sem dependência externa.
 */
(()=>{
  const path="./public/assets/Sprout Lands - UI Pack - Basic pack/Sprite sheets/Sprite sheet for Basic Pack.png";
  const sheet=new Image();
  sheet.decoding="async";
  sheet.onload=()=>{
    if(sheet.naturalWidth<880||sheet.naturalHeight<232)return;
    const crop=(x,y,w,h)=>{
      const c=document.createElement("canvas");c.width=w;c.height=h;
      const ctx=c.getContext("2d");ctx.imageSmoothingEnabled=false;
      ctx.drawImage(sheet,x,y,w,h,0,0,w,h);
      return 'url("'+c.toDataURL("image/png")+'")';
    };
    const vars={
      // Sprout Lands Basic Pack: botões claros, madeira e painel de texto.
      "--sprout-sheet-button-cream":crop(8,56,32,32),
      "--sprout-sheet-button-light":crop(8,8,32,32),
      "--sprout-sheet-button-wood":crop(153,8,32,32),
      "--sprout-sheet-button-pressed":crop(8,105,32,32),
      "--sprout-sheet-panel":crop(406,184,113,47)
    };
    for(const [name,value] of Object.entries(vars))document.documentElement.style.setProperty(name,value);
    document.documentElement.classList.add("sprout-sheet-ready");
  };
  sheet.onerror=()=>console.warn("TILLFOLK: usando as caixas individuais do pacote Sprout UI.");
  sheet.src=path;
})();
