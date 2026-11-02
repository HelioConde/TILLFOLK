"use strict";
/* Ciclo do mundo. Dia claro: 06h–22h (16 horas); noite: 22h–06h (8 horas).
   Um dia completo dura 32 minutos reais em 1× e respeita 3×/6×/pausa. */
(()=>{
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const MINUTES_PER_REAL_SECOND=.75;
  const DAY_START=6*60, NIGHT_START=22*60;
  // Usar a mesma variação em relógio, energia, moral e fome.
  function elapsedMinutes(scaledSeconds){
    return Number.isFinite(scaledSeconds)?Math.max(0,scaledSeconds)*MINUTES_PER_REAL_SECOND:0;
  }
  const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
  function alpha(minutes){
    const hour=((Number(minutes)||0)%1440+1440)%1440/60;
    if(hour>=22||hour<6)return .64;
    if(hour<7)return .64*(1-smooth(hour-6));
    if(hour<21)return 0;
    return .64*smooth(hour-21);
  }
  function phase(minutes){
    const h=((Number(minutes)||0)%1440+1440)%1440/60;
    return h>=22||h<6?"night":h<7?"dawn":h>=21?"dusk":"day";
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
  window.TillfolkDayNight=Object.freeze({alpha,phase,labels,paint,elapsedMinutes,DAY_START,NIGHT_START,MINUTES_PER_REAL_SECOND});
})();