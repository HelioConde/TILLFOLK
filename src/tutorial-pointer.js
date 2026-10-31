"use strict";
// Guia do tutorial com a patinha original do Sprout Lands UI Pack.
// Este elemento não recebe cliques: somente indica onde clicar.
(()=>{
  const path="./public/assets/Sprout Lands - UI Pack - Basic pack/Sprite sheets/Mouse sprites/Catpaw pointing Mouse icon.png";
  const paw=document.createElement("div");paw.id="tillfolk-tutorial-paw";paw.hidden=true;
  paw.setAttribute("aria-hidden","true");
  const image=document.createElement("img");image.src=path;image.alt="";
  const caption=document.createElement("span");caption.className="tillfolk-paw-caption";
  paw.append(image,caption);document.body.append(paw);
  const hide=()=>{paw.hidden=true;};
  function present(point,label,onMap=false){
    if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y)){hide();return;}
    paw.hidden=false;caption.textContent=label;
    paw.style.left=Math.max(4,Math.min(window.innerWidth-220,Math.round(point.x+9)))+"px";
    paw.style.top=Math.max(4,Math.min(window.innerHeight-70,Math.round(point.y-42)))+"px";
    paw.classList.toggle("over-map",onMap);
  }
  function targetButton(selector,label){
    const el=document.querySelector(selector);
    if(!el||el.hidden||el.closest("[hidden]")){hide();return;}
    const box=el.getBoundingClientRect();
    if(box.width<=4||box.height<=4){hide();return;}
    present({x:box.left+box.width*.48,y:box.top+box.height*.48},label);
  }
  function onScreen(canvas,cell){
    const box=canvas.getBoundingClientRect();
    return {x:box.left+box.width*(cell.x+.5)/80,y:box.top+box.height*(cell.y+.5)/50};
  }
  function guide({playing,state,quest,selectedTool,buildLayer,canvas,stationSiteValid}){
    if(!playing||!state||!quest||!document.body.classList.contains("play-session")){hide();return;}
    const modal=document.querySelector("dialog[open]");
    // Dialogs are drawn in the browser top layer: a fixed div outside them
    // is always BEHIND the modal regardless of its z-index.
    if(modal?.id==="workshop-dialog"&&["hoe","wateringCan","axe"].includes(quest.key)){
      if(paw.parentElement!==modal)modal.append(paw);
      const tool=quest.key; // O machado atual se chama "axe", não "stoneAxe".
      const button=modal.querySelector('[data-craft-tool="'+tool+'"]');
      targetButton('[data-craft-tool="'+tool+'"]',button?.disabled?
        "Reúna os materiais para fabricar":"Fabrique esta ferramenta");
      return;
    }
    if(paw.parentElement!==document.body)document.body.append(paw);
    if(modal){hide();return;}
    const boundary=state.world?.boundary;
    // Não apontar para recursos inacessíveis além da muralha fechada.
    const accessible=p=>!boundary||boundary.open||
      (p.kind==="gateLog"&&p.x===boundary.gate?.x&&p.y===boundary.gate?.y)||
      (p.x>boundary.left&&p.x<boundary.right&&p.y>boundary.top&&p.y<boundary.bottom);
    const viewport=document.querySelector(".canvas-scroll")?.getBoundingClientRect();
    function targetCell(candidates,text,skipAssigned=false){
      if(!viewport){hide();return;}
      let found=candidates.filter(accessible);
      if(skipAssigned){
        const free=found.filter(p=>!state.orders.some(o=>o.type==="clear"&&o.x===p.x&&o.y===p.y));
        if(free.length)found=free;
      }
      const visible=found.map(p=>({p,point:onScreen(canvas,p)})).filter(e=>
        e.point.x>=viewport.left+24&&e.point.x<=viewport.right-24&&
        e.point.y>=viewport.top+24&&e.point.y<=viewport.bottom-25);
      if(!visible.length){targetButton("#mission-locate","Mostrar o objetivo no mapa");return;}
      const origin=state.workers?.[0]||state.spawn||{x:40,y:25};
      visible.sort((a,b)=>((a.p.x-origin.x)**2+(a.p.y-origin.y)**2)-
        ((b.p.x-origin.x)**2+(b.p.y-origin.y)**2));
      present(visible[0].point,text,true);
    }
    if(quest.key==="workstation"){
      if(state.crafting?.station){hide();return;}
      const pending=state.orders.find(o=>o.type==="buildStation");
      if(pending){targetCell([pending],"A equipe vai construir aqui");return;}
      if((state.inventory?.twigs||0)<(window.TillfolkCrafting?.STATION_COST||10)){
        if(!["universal","clear"].includes(selectedTool)){
          targetButton('.tool[data-tool="universal"]',"Selecione Universal");return;
        }
        targetCell(state.world.objects.filter(o=>o.kind==="twig"),"Recolha este graveto",true);
      }else if(selectedTool!=="construir"){
        targetButton('.tool[data-tool="construir"]',"Clique em Objetos");
      }else if(buildLayer!=="station"){
        targetButton('[data-build-layer="station"]',"Escolha Work Station");
      }else{
        targetCell(state.plots.filter(p=>stationSiteValid(p.x,p.y)),"Clique aqui para colocar a bancada");
      }
      return;
    }
    if(["hoe","wateringCan","axe"].includes(quest.key)){
      const recipe=window.TillfolkCrafting?.recipe(quest.key);
      const missing=recipe?window.TillfolkCrafting.missing(state,recipe.cost):[];
      // Guiar o jogador até os materiais primeiro; não apontar apenas
      // para uma receita ainda bloqueada na bancada.
      if(missing.length){
        const resource=missing[0][0];
        if(resource==="twigs"){
          if(!["universal","clear"].includes(selectedTool)){
            targetButton('.tool[data-tool="universal"]',"Selecione Universal");return;
          }
          targetCell(state.world.objects.filter(p=>p.kind==="twig"),"Recolha os gravetos que faltam",true);return;
        }
        if(resource==="grass"){
          if(!["universal","clear"].includes(selectedTool)){
            targetButton('.tool[data-tool="universal"]',"Selecione Universal");return;
          }
          targetCell(state.world.objects.filter(p=>p.kind==="grass"),"Recolha fibras da grama",true);return;
        }
      }
      targetButton("#open-workshop","Abra a Oficina para fabricar");return;
    }
    if(["grass","seed"].includes(quest.key)){
      if(!["universal","clear"].includes(selectedTool)){
        targetButton('.tool[data-tool="universal"]',"Selecione Universal");return;
      }
      targetCell(state.world.objects.filter(o=>o.kind==="grass"),"Limpe esta grama alta",true);return;
    }
    if(quest.key==="exit"){
      if(!["universal","clear"].includes(selectedTool)){
        targetButton('.tool[data-tool="universal"]',"Selecione Universal");return;
      }
      targetCell(state.world.objects.filter(o=>o.kind==="gateLog"),"Corte o tronco da saída",false);return;
    }
    // Não deixar etapas da horta sem orientação: cada missão aponta
    // para um alvo viável ou oferece o botão Mostrar no mapa.
    const plotList=state.plots||[];
    const wild=window.TillfolkWild;
    const cropPlot=p=>!p.dirty&&!wild.waterAt(state.world,p.x,p.y)&&
      !wild.at(state.world,p.x,p.y)&&wild.terrainAt(state.world,p.x,p.y).farmable;
    const selectUniversal=()=>{
      if(["universal","till","sow","water","harvest","carry"].includes(selectedTool))return false;
      targetButton('.tool[data-tool="universal"]',"Selecione Universal");return true;
    };
    if(quest.key==="till"){
      if(selectUniversal())return;
      targetCell(plotList.filter(p=>cropPlot(p)&&!p.tilled&&!p.seeded),
        "Prepare este solo para plantar");return;
    }
    if(quest.key==="sow"){
      if(selectUniversal())return;
      if(!state.seeds){
        targetCell(state.world.objects.filter(p=>p.kind==="grass"),
          "Encontre sementes na grama",true);return;
      }
      targetCell(plotList.filter(p=>p.tilled&&!p.seeded&&!p.produce),
        "Plante a semente aqui");return;
    }
    if(quest.key==="water"){
      if(selectUniversal())return;
      targetCell(plotList.filter(p=>p.seeded&&!p.watered),
        "Regue este canteiro");return;
    }
    if(quest.key==="harvest"){
      if(selectUniversal())return;
      const ready=plotList.filter(p=>p.seeded&&p.growth>=1);
      targetCell(ready.length?ready:plotList.filter(p=>p.seeded),
        ready.length?"Colha a plantação madura":"Aguarde este cultivo amadurecer");return;
    }
    if(quest.key==="carry"){
      if(selectUniversal())return;
      targetCell(plotList.filter(p=>p.produce),
        "Transporte a colheita ao estoque");return;
    }
    // Nenhuma missão ativa deve terminar com a patinha invisível por omissão.
    targetButton("#mission-locate","Veja o próximo objetivo no mapa");
  }
  window.TillfolkTutorialPointer=Object.freeze({guide,hide});
})();