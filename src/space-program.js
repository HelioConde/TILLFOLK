"use strict";
/* Programa espacial TILLFOLK: construção real, carga física, evacuação persistente.
 * Todos os materiais da obra passam pela logística dos trabalhadores. */
((root,factory)=>{
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.TillfolkSpace=api;
})(typeof window!=="undefined"?window:null,()=>{
  const STAGES=Object.freeze([
    Object.freeze({id:"pad",name:"Plataforma de lançamento",icon:"🧱",
      description:"Fundação 3×3 em terra firme, perto da colônia.",cost:Object.freeze({wood:18,stone:12}),work:110}),
    Object.freeze({id:"hull",name:"Casco e cabine",icon:"🚀",
      description:"Estrutura reforçada para transportar os habitantes.",cost:Object.freeze({wood:25,stone:18,grass:14}),work:150}),
    Object.freeze({id:"engine",name:"Motor de propulsão",icon:"⚙️",
      description:"Ligas minerais e reagentes reunidos nos continentes.",cost:Object.freeze({stone:24,mushroom:8,herbs:7}),work:180}),
    Object.freeze({id:"life",name:"Suporte de vida",icon:"💚",
      description:"Filtros e cabines para manter a tripulação viva.",cost:Object.freeze({wood:12,grass:16,herbs:9,mushroom:6}),work:160})
  ]);
  const LAUNCH=Object.freeze({food:30,water:20,crew:4,support:1,homes:5});
  const FOOTPRINT=3;
  function normalize(state){
    const original=state?.rocket&&typeof state.rocket==="object"?state.rocket:{};
    if(!state)return null;
    const stage=Math.min(STAGES.length,Math.max(0,Math.floor(Number(original.stage)||0)));
    const s=original.site&&Number.isInteger(original.site.x)&&Number.isInteger(original.site.y)?
      {x:original.site.x,y:original.site.y}:null;
    Object.assign(original,{version:1,stage:s?stage:0,site:s,
      launched:Boolean(original.launched&&s&&stage===STAGES.length),
      launchDay:original.launched&&s?Math.max(1,Math.floor(Number(original.launchDay)||1)):null,
      crew:Array.isArray(original.crew)?original.crew.filter(n=>typeof n==="string").slice(0,LAUNCH.crew):[]});
    state.rocket=original;
    return original;
  }
  const stageCost=stage=>STAGES[stage]?.cost||{};
  const footprint=(x,y)=>Array.from({length:9},(_,i)=>({x:x+i%3,y:y+Math.floor(i/3)}));
  function siteValid(state,x,y){
    const rocket=normalize(state),world=state?.world;
    if(!world||!Number.isInteger(x)||!Number.isInteger(y))return false;
    if(rocket.site)return rocket.site.x===x&&rocket.site.y===y&&!rocket.launched;
    if(rocket.launched||x<2||y<2||x+FOOTPRINT>=world.width-1||y+FOOTPRINT>=world.height-1)return false;
    if(!state?.crafting?.station)return false;
    // Pista segura: a construção espacial não nasce em água, bioma perigoso,
    // objeto, moradia, campo preparado, animal ou qualquer outra obra.
    const water=new Set((world.water||[]).map(p=>p.x+","+p.y));
    const objects=new Set((world.objects||[]).map(p=>p.x+","+p.y));
    const occupied=new Set([
      ...(state.chests||[]),...(state.wells||[]),...(state.workstations||[]),
      ...(state.orders||[]).filter(o=>o.type.startsWith("build")&&o.type!=="buildRocket"),
      ...(state.homes||[]).flatMap(h=>[
        {x:h.x,y:h.y},{x:h.x+1,y:h.y},{x:h.x,y:h.y+1},{x:h.x+1,y:h.y+1}
      ])
    ].map(p=>p.x+","+p.y));
    const activePlots=new Set((state.plots||[]).filter(p=>
      p.tilled||p.seeded||p.produce||p.fertilized).map(p=>p.x+","+p.y));
    return footprint(x,y).every(p=>{
      const key=p.x+","+p.y;
      return world.biomeMap?.[p.y*world.width+p.x]==="g"&&
        !water.has(key)&&!objects.has(key)&&!occupied.has(key)&&!activePlots.has(key)&&
        // Trabalhadores precisam pisar no terreno para executar a obra.
        !(state.animals||[]).some(a=>Math.floor(a.x)===p.x&&Math.floor(a.y)===p.y)&&
        !(state.orders||[]).some(o=>o.type!=="buildRocket"&&o.x===p.x&&o.y===p.y)&&
        !(typeof window!=="undefined"&&window.TillfolkHouseBuilder?.occupied?.(state.house,p.x,p.y));
    });
  }
  function unlock(state){
    if(Number(state?.colonyLife?.researchLevel)<4)
      return "Conclua as quatro pesquisas para projetar um foguete.";
    const regions=Object.keys(state?.progression?.discovered||{}).filter(k=>["f","s","i","w","p"].includes(k)).length;
    if(regions<5)return "Explore os cinco continentes para reunir conhecimento espacial ("+regions+"/5).";
    if((state?.workers||[]).length<4)return "Recrute quatro colonos: a nave precisa de uma equipe.";
    return null;
  }
  function canOrder(state,x,y,stage){
    const rocket=normalize(state);
    if(rocket.launched)return "A nave já partiu deste planeta.";
    if(rocket.stage>=STAGES.length)return "Foguete construído: prepare o lançamento.";
    if(stage!==rocket.stage)return "A etapa anterior do foguete ainda não foi concluída.";
    const locked=unlock(state);if(locked)return locked;
    if(!siteValid(state,x,y))return rocket.site?
      "Continue a obra na plataforma do foguete existente.":
      "Escolha uma área livre 3×3 na ilha central, sem construções ou plantações.";
    return null;
  }
  function finish(state,order){
    const rocket=normalize(state);
    if(order?.type!=="buildRocket"||canOrder(state,order.x,order.y,order.stage))return {error:"Obra espacial inválida."};
    if(Object.entries(stageCost(order.stage)).some(([kind,qty])=>
      (Number(order.delivered?.[kind])||0)<qty))
      return {error:"Todos os materiais precisam ser entregues fisicamente."};
    if(!rocket.site)rocket.site={x:order.x,y:order.y};
    rocket.stage++;
    return {stage:rocket.stage,name:STAGES[order.stage].name,ready:rocket.stage===STAGES.length};
  }
  function ready(state){
    const rocket=normalize(state);
    if(rocket.launched)return "O foguete já foi lançado.";
    if(rocket.stage<STAGES.length)return "Conclua todas as quatro etapas da construção.";
    const locked=unlock(state);if(locked)return locked;
    const workers=state.workers||[],homes=state.homes||[];
    if(workers.length<LAUNCH.crew+LAUNCH.support)
      return "Recrute cinco colonos: quatro embarcam e um mantém a base funcionando.";
    if(homes.length<LAUNCH.homes)return "Construa cinco moradias antes do lançamento.";
    const rested=workers.filter(w=>(w.health??100)>=50&&(w.satiety??100)>=35&&
      !w.task&&!w.haul&&homes.some(h=>h.residentId===w.id));
    if(rested.length<LAUNCH.crew)return "Prepare quatro colonos saudáveis, alimentados, com moradia e sem tarefa ativa.";
    if((Number(state.food)||0)<LAUNCH.food)return "Estoque "+LAUNCH.food+" alimentos para a viagem.";
    if((Number(state.water)||0)<LAUNCH.water)return "Armazene "+LAUNCH.water+" águas para a viagem.";
    return null;
  }
  function launch(state){
    const blocked=ready(state);
    if(blocked)return {error:blocked};
    const rocket=state.rocket;
    const team=state.workers.filter(w=>(w.health??100)>=50&&(w.satiety??100)>=35&&
      !w.task&&!w.haul&&state.homes.some(h=>h.residentId===w.id)).slice(0,LAUNCH.crew);
    state.food-=LAUNCH.food;state.water-=LAUNCH.water;
    rocket.launched=true;rocket.launchDay=Math.max(1,state.day||1);
    rocket.crew=team.map(w=>w.name);
    const travelers=new Set(team.map(w=>w.id));
    state.workers=state.workers.filter(w=>!travelers.has(w.id));
    for(const h of state.homes||[])if(travelers.has(h.residentId))h.residentId=null;
    return {success:true,day:rocket.launchDay,crew:[...rocket.crew]};
  }
  // Arte original desenhada em blocos de pixels dentro do motor (sem CDN).
  // A estrutura cresce conforme as etapas reais concluídas.
  function draw(ctx,rocket,tile=32,ms=0,ghost=false,allowed=true){
    if(!rocket?.site)return;
    const x=rocket.site.x*tile,y=rocket.site.y*tile;
    const unit=tile/32,rect=(xx,yy,ww,hh,color)=>{
      ctx.fillStyle=color;ctx.fillRect(Math.round(x+xx*unit),
        Math.round(y+yy*unit),Math.round(ww*unit),Math.round(hh*unit));
    };
    const stage=rocket.stage||0;
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha=ghost?.47:1;
    // O pad 3×3 permanece no chão mesmo após a partida.
    rect(1,66,94,26,"#283a3c");rect(3,69,90,19,"#52605a");
    for(let k=0;k<6;k++)rect(5+k*15,72,10,3,k%2?"#f0b56d":"#b0c9bd");
    rect(6,90,84,4,"#20352f");rect(8,62,8,8,"#9dafa6");rect(80,62,8,8,"#9dafa6");
    if(stage>=1&&!rocket.launched){
      rect(33,30,30,41,"#84939e");rect(38,33,20,34,"#d5e3dc");
      rect(43,46,10,8,"#5187ae");rect(44,47,8,6,"#a8d7ec");
      rect(29,53,8,17,"#b66e5b");rect(59,53,8,17,"#b66e5b");
    }
    if(stage>=2&&!rocket.launched){
      rect(37,64,10,12,"#535d67");rect(49,64,10,12,"#535d67");
      rect(39,70,6,5,"#d2ad6e");rect(51,70,6,5,"#d2ad6e");
      rect(32,58,6,5,"#f2a35a");rect(58,58,6,5,"#f2a35a");
    }
    if(stage>=3&&!rocket.launched){
      rect(41,19,14,13,"#f3f1d7");rect(44,14,8,5,"#e7cc8d");
      rect(47,8,2,6,"#f6e3ad");rect(45,30,6,4,"#d8a36e");
      rect(42,39,12,8,"#497ea5");rect(44,41,8,4,"#a5dcef");
      rect(32,42,4,10,"#e3d4b4");rect(60,42,4,10,"#e3d4b4");
      rect(12,32,3,31,"#b6a583");rect(10,30,10,3,"#b6a583");
      rect(81,32,3,31,"#b6a583");rect(76,30,10,3,"#b6a583");
    }
    if(ghost&&!allowed){rect(1,8,94,85,"#b23b3b88");}
    if(rocket.launched){rect(36,64,24,4,"#e0bd79");rect(42,46,12,10,"#8b9a91");}
    ctx.restore();
  }
  return Object.freeze({STAGES,LAUNCH,FOOTPRINT,normalize,stageCost,footprint,
    siteValid,unlock,canOrder,finish,ready,launch,draw});
});
