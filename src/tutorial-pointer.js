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
  function present(point,label,onMap=false,zoom=1,cell=null){
    if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y)){hide();return;}
    paw.hidden=false;caption.textContent=label;
    if(cell)paw.dataset.targetCell=cell.x+","+cell.y;
    else delete paw.dataset.targetCell;
    paw.classList.toggle("over-map",onMap);
    paw.classList.toggle("over-target",!onMap);
    const baseSize=parseFloat(getComputedStyle(paw).getPropertyValue("--paw-base-size"))||44;
    const zoomScale=Number.isFinite(zoom)?Math.max(.5,zoom):1;
    const size=baseSize*(onMap?zoomScale:1);
    paw.style.setProperty("--paw-size",size+"px");
    const half=size/2,offset=size*.58,margin=half+4;
    const positions=[
      {x:point.x+offset,y:point.y},{x:point.x-offset,y:point.y},
      {x:point.x,y:point.y+offset},{x:point.x,y:point.y-offset}
    ];
    const center=positions.find(p=>p.x>=margin&&p.x<=window.innerWidth-margin&&
      p.y>=margin&&p.y<=window.innerHeight-margin)||positions[0];
    const imageLeft=center.x-half,imageTop=center.y-half;
    paw.style.setProperty("--paw-image-x",Math.round(imageLeft)+"px");
    paw.style.setProperty("--paw-image-y",Math.round(imageTop)+"px");
    paw.dataset.aimX=String(point.x);
    paw.dataset.aimY=String(point.y);
    const box=image.getBoundingClientRect();
    const centerX=box.left+box.width/2,centerY=box.top+box.height/2;
    const targetAngle=Math.atan2(point.y-centerY,point.x-centerX);
    // The sprite's fingertip is at pixel (5, 1.5) in its 16x16 frame.
    const fingerAngle=Math.atan2(-6.5,-3);
    paw.style.setProperty("--paw-angle",((targetAngle-fingerAngle)*180/Math.PI)+"deg");
    const captionBox=caption.getBoundingClientRect();
    const captionWidth=captionBox.width,captionHeight=captionBox.height,gap=6;
    let captionX=center.x-captionWidth/2;
    let captionY=point.y-half-captionHeight-gap;
    if(captionY<4)captionY=point.y+half+gap;
    if(onMap&&imageLeft+size+gap+captionWidth<=window.innerWidth-4){
      captionX=imageLeft+size+gap;
      captionY=center.y-captionHeight/2;
    }
    captionX=Math.max(4,Math.min(window.innerWidth-captionWidth-4,captionX));
    captionY=Math.max(4,Math.min(window.innerHeight-captionHeight-4,captionY));
    paw.style.setProperty("--paw-caption-x",Math.round(captionX)+"px");
    paw.style.setProperty("--paw-caption-y",Math.round(captionY)+"px");
  }
  function targetButton(selector,label){
    const el=document.querySelector(selector);
    if(!el||el.hidden||el.closest("[hidden]")){hide();return;}
    const box=(el.querySelector(".tool-glyph")||el).getBoundingClientRect();
    if(box.width<=4||box.height<=4){hide();return;}
    present({x:box.left+box.width*.48,y:box.top+box.height*.48},label);
  }
  function onScreen(canvas,cell){
    const box=canvas.getBoundingClientRect();
    return {x:box.left+box.width*(cell.x+.5)/80,y:box.top+box.height*(cell.y+.5)/50};
  }
  function guide({playing,state,quest,selectedTool,buildLayer,canvas,cameraZoom=1,
    stationSiteValid,tutorialTillSitePreferred}){
    if(!playing||!state||!quest||!document.body.classList.contains("play-session")){hide();return;}
    const modal=document.querySelector("dialog[open]");
    // Dialogs are drawn in the browser top layer: a fixed div outside them
    // is always BEHIND the modal regardless of its z-index.
    if(modal?.id==="workshop-dialog"&&["hoe","wateringCan","axe"].includes(quest.key)){
      if(paw.parentElement!==modal)modal.append(paw);
      paw.dataset.stationVisitedFor=quest.key;
      const tool=quest.key; // O machado atual se chama "axe", não "stoneAxe".
      const button=modal.querySelector('[data-craft-tool="'+tool+'"]');
      const recipe=window.TillfolkCrafting?.recipe(tool);
      const missing=recipe?window.TillfolkCrafting.missing(state,recipe.cost):[];
      const missingResource=missing[0]?.[0];
      const prompt=button?.disabled?
        missingResource==="grass"?"Feche a Oficina e recolha fibras da grama":
        missingResource==="twigs"?"Feche a Oficina e recolha gravetos":
        "Reúna os materiais para fabricar":
        "Fabrique esta ferramenta";
      targetButton('[data-craft-tool="'+tool+'"]',prompt);
      return;
    }
    if(paw.parentElement!==document.body)document.body.append(paw);
    if(modal){hide();return;}
    const viewport=document.querySelector(".canvas-scroll")?.getBoundingClientRect();
    function targetCell(candidates,text,skipAssigned=false,preferSpawn=false,offscreenText="Mostrar objetivo no mapa"){
      if(!viewport){hide();return;}
      let found=candidates;
      if(skipAssigned){
        const free=found.filter(p=>!state.orders.some(o=>o.type==="clear"&&o.x===p.x&&o.y===p.y));
        if(free.length)found=free;
      }
      if(preferSpawn){
        const origin=state.spawn||{x:40,y:25};
        found.sort((a,b)=>
          ((a.x-origin.x)**2+(a.y-origin.y)**2)-
          ((b.x-origin.x)**2+(b.y-origin.y)**2));
        const target=found[0];
        if(!target){hide();return;}
        const point=onScreen(canvas,target);
        if(point.x<viewport.left+24||point.x>viewport.right-24||
          point.y<viewport.top+24||point.y>viewport.bottom-25){
          targetButton("#mission-locate",offscreenText);
          return;
        }
        present(point,text,true,cameraZoom,target);
        return;
      }
      const visible=found.map(p=>({p,point:onScreen(canvas,p)})).filter(e=>
        e.point.x>=viewport.left+24&&e.point.x<=viewport.right-24&&
        e.point.y>=viewport.top+24&&e.point.y<=viewport.bottom-25);
      if(!visible.length){targetButton("#mission-locate","Mostrar o objetivo no mapa");return;}
      const origin=state.workers?.[0]||state.spawn||{x:40,y:25};
      visible.sort((a,b)=>((a.p.x-origin.x)**2+(a.p.y-origin.y)**2)-
        ((b.p.x-origin.x)**2+(b.p.y-origin.y)**2));
      present(visible[0].point,text,true,cameraZoom,visible[0].p);
    }
    if(quest.key==="workstation"){
      if(state.crafting?.station){hide();return;}
      const pending=state.orders.find(o=>o.type==="buildStation");
      if(pending){targetCell([pending],"A equipe vai construir aqui");return;}
      if((state.inventory?.twigs||0)<(window.TillfolkCrafting?.STATION_COST||10)){
        if(!["universal","clear"].includes(selectedTool)){
          targetButton('.tool[data-tool="universal"]',"Selecione Universal");return;
        }
        targetCell(state.world.objects.filter(o=>o.kind==="twig"),"Recolha este graveto",
          true,true,"Mostrar o graveto perto do início");
      }else if(selectedTool!=="construir"){
        targetButton('.tool[data-tool="construir"]',"Clique em Objetos");
      }else if(buildLayer!=="station"){
        targetButton('[data-build-layer="station"]',"Escolha Work Station");
      }else{
        targetCell(state.plots.filter(p=>stationSiteValid(p.x,p.y)),
          "Clique aqui para colocar a bancada",false,true,"Mostrar espaço livre perto do centro");
      }
      return;
    }
    if(["hoe","wateringCan","axe"].includes(quest.key)){
      const recipe=window.TillfolkCrafting?.recipe(quest.key);
      const missing=recipe?window.TillfolkCrafting.missing(state,recipe.cost):[];
      if(missing.length&&paw.dataset.stationVisitedFor!==quest.key){
        const station=state.crafting?.station||state.workstations?.[0];
        if(station){
          targetCell([station],"Clique na Work Station para fabricar a "+
            (recipe?.name||"ferramenta").toLowerCase());
        }else targetButton("#mission-locate","Construa a Work Station primeiro");
        return;
      }
      if(missing.length){
        const resource=missing[0][0];
        if(resource==="twigs"){
          if(!["universal","clear"].includes(selectedTool)){
            targetButton('.tool[data-tool="universal"]',"Selecione Universal");return;
          }
          targetCell(state.world.objects.filter(p=>p.kind==="twig"),
            "Recolha os gravetos que faltam",true,true,"Mostrar o graveto perto do início");return;
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
    // Não deixar etapas da horta sem orientação: cada missão aponta
    // para um alvo viável ou oferece o botão Mostrar no mapa.
    const plotList=state.plots||[];
    const wild=window.TillfolkWild;
    const cropPlot=p=>!p.dirty&&!wild.waterAt(state.world,p.x,p.y)&&
      !wild.at(state.world,p.x,p.y)&&wild.terrainAt(state.world,p.x,p.y).farmable;
    const selectUniversal=()=>{
      // A missão deve apontar para a ferramenta correta, não para o solo com
      // uma ordem diferente selecionada (ex.: Semear na etapa Arar).
      if(selectedTool==="universal"||selectedTool===quest.key)return false;
      targetButton('.tool[data-tool="universal"]',"Selecione Universal");return true;
    };
    if(quest.key==="till"){
      if(selectUniversal())return;
      const available=plotList.filter(p=>cropPlot(p)&&!p.tilled&&!p.seeded);
      const preferred=available.filter(p=>!tutorialTillSitePreferred||
        tutorialTillSitePreferred(p.x,p.y));
      targetCell(preferred.length?preferred:available,
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