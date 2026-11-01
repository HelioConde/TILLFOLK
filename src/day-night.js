"use strict";
/* Ciclo visual do mundo, desacoplado da velocidade da simulação e do HUD.
   05–07 amanhecer, 07–18 dia, 18–20 entardecer, 20–05 noite. */
(()=>{
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
  function alpha(minutes){
    const hour=((Number(minutes)||0)%1440+1440)%1440/60;
    if(hour>=20||hour<5)return .64;
    if(hour<7)return .64*(1-smooth((hour-5)/2));
    if(hour<18)return 0;
    return .64*smooth((hour-18)/2);
  }
  function phase(minutes){
    const h=((Number(minutes)||0)%1440+1440)%1440/60;
    return h>=20||h<5?"night":h<7?"dawn":h>=18?"dusk":"day";
  }
  const labels={night:"🌙 Noite",dawn:"🌄 Amanhecer",day:"☀️ Dia",dusk:"🌇 Entardecer"};
  let layer=null,layerCtx=null;
  function paint(ctx,minutes,bounds,tile,workers=[],homes=[],stations=[]){
    const darkness=alpha(minutes);
    if(darkness<=.003)return;
    const left=bounds.x0*tile,top=bounds.y0*tile;
    const width=(bounds.x1-bounds.x0+1)*tile,height=(bounds.y1-bounds.y0+1)*tile;
    // Máscara em resolução reduzida mantém 60fps mesmo com mapa grande.
    const w=Math.max(1,Math.ceil(width/3)),h=Math.max(1,Math.ceil(height/3));
    if(!layer){layer=document.createElement("canvas");layerCtx=layer.getContext("2d");}
    if(layer.width!==w||layer.height!==h){layer.width=w;layer.height=h;}
    layerCtx.clearRect(0,0,w,h);
    layerCtx.globalCompositeOperation="source-over";
    layerCtx.fillStyle="rgba(8,15,39,"+darkness.toFixed(3)+")";
    layerCtx.fillRect(0,0,w,h);
    if(darkness>.03){
      layerCtx.globalCompositeOperation="destination-out";
      // Pouca luz nos personagens; a luz das cabanas é mais forte à noite.
      const lights=[
        ...workers.map(item=>({x:item.x,y:item.y,r:1.7,strength:.40})),
        ...homes.map(item=>({x:item.x+1,y:item.y+1,r:3.2,strength:.85})),
        ...stations.map(item=>({x:item.x,y:item.y,r:2.1,strength:.68}))
      ];
      for(const light of lights){
        const x=((light.x+.5)*tile-left)/3,y=((light.y+.5)*tile-top)/3;
        const rad=light.r*tile/3;
        if(x+rad<0||x-rad>w||y+rad<0||y-rad>h)continue;
        const gradient=layerCtx.createRadialGradient(x,y,0,x,y,rad);
        gradient.addColorStop(0,"rgba(0,0,0,"+light.strength+")");
        gradient.addColorStop(.42,"rgba(0,0,0,"+(light.strength*.55)+")");
        gradient.addColorStop(1,"rgba(0,0,0,0)");
        layerCtx.fillStyle=gradient;
        layerCtx.fillRect(x-rad,y-rad,rad*2,rad*2);
      }
      layerCtx.globalCompositeOperation="source-over";
    }
    ctx.save();ctx.imageSmoothingEnabled=true;
    ctx.drawImage(layer,left,top,width,height);
    ctx.restore();
  }
  window.TillfolkDayNight=Object.freeze({alpha,phase,labels,paint});
})();