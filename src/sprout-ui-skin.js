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
  const inventory=new Image();
  inventory.decoding="async";
  inventory.onload=()=>{
    if(inventory.naturalWidth!==144||inventory.naturalHeight!==144)return;
    const tile=(x,y)=>{
      const c=document.createElement("canvas");c.width=40;c.height=40;
      const ctx=c.getContext("2d");ctx.imageSmoothingEnabled=false;
      ctx.drawImage(inventory,x,y,40,40,0,0,40,40);
      return 'url("'+c.toDataURL("image/png")+'")';
    };
    const st=document.documentElement.style;
    st.setProperty("--sprout-inventory-slot",tile(6,6));
    st.setProperty("--sprout-inventory-active",tile(54,6));
    st.setProperty("--sprout-inventory-disabled",tile(102,6));
    document.documentElement.classList.add("sprout-inventory-ready");
  };
  inventory.src="./public/assets/Sprout Lands - UI Pack - Basic pack/emojis-free/emoji style ui/Inventory_Blocks_Spritesheet.png";
})();
