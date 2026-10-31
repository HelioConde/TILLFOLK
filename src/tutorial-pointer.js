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
    if(!el||el.disabled||el.hidden||el.closest("[hidden]")){hide();return;}
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
    if(modal){
      if(modal.id==="workshop-dialog"&&["hoe","wateringCan","axe"].includes(quest.key)){
        const tool=quest.key==="axe"?"stoneAxe":quest.key;
        targetButton('#workshop-tools [data-craft-tool="'+tool+'"]:not(:disabled)',"Fabrique a ferramenta");
      }else hide();
      return;
    }
    const boundary=state.world?.boundary;
    // Não apontar para recursos inacessíveis além da muralha fechada.
    const accessible=p=>!boundary||boundary.open||
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
      if(!visible.length){targetButton("#mission-locate","Mostrar objetivo no mapa");return;}
      const origin=state.spawn||{x:40,y:25};
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
      targetButton("#open-workshop","Abra a Oficina");return;
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
    hide();
  }
  window.TillfolkTutorialPointer=Object.freeze({guide,hide});
})();