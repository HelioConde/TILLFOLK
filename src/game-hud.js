"use strict";
/* HUD in-game: apenas aparência e atalhos. Não altera tarefas, saves ou lógica.
   Todas as ações são delegadas aos controles existentes do jogo. */
(()=>{
  const $=s=>document.querySelector(s);
  const toolName=$("#hud-tool-name"),toolHint=$("#hud-tool-hint");
  if(!toolName||!toolHint)return;
  const guide={
    universal:["UNIVERSAL","Clique para a próxima ordem · arraste para selecionar terrenos"],
    till:["ARAR","Marque o solo para preparar o cultivo"],
    clear:["LIMPAR","Selecione a vegetação e retire obstáculos"],
    fertilize:["FERTILIZAR","Melhore uma área previamente arada"],
    sow:["SEMEAR","Plante sementes na terra preparada"],
    water:["REGAR","Selecione um canteiro que precise de água"],
    harvest:["COLHER","Marque a colheita quando estiver madura"],
    carry:["TRANSPORTAR","Leve os itens colhidos para o estoque"],
    remover:["CANCELAR","Remova a ordem marcada do terreno"],
    inspecionar:["INSPECIONAR","Clique no cenário para ver os detalhes"],
    construir:["CONSTRUIR","Escolha piso, paredes ou telhado"]
  };
  function sync(){
    if(!document.body.classList.contains("play-session"))return;
    const active=$(".tool.active[data-tool]");
    const order=$("#orders-btn");
    let action=active?.dataset.tool||"universal";
    if(order?.classList.contains("active")&&action==="universal"){
      action=[$("#order-selected")?.textContent||""].join("").trim().toLowerCase();
      action=({arar:"till",limpar:"clear",fertilizar:"fertilize",semear:"sow",regar:"water",colher:"harvest",transportar:"carry"})[action]||"universal";
    }
    const selected=$("#orders-panel:not([hidden]) [data-order-type][aria-pressed='true']");
    if(selected)action=selected.dataset.orderType||action;
    const [name,help]=guide[action]||guide.universal;
    const paused=$("[data-speed='0'].chosen");
    toolName.textContent=paused?"PAUSADO":name;
    toolHint.textContent=paused?"Retome a simulação para executar ordens":help;
    document.querySelectorAll(".tool[data-tool]").forEach(button=>{
      button.setAttribute("aria-keyshortcuts",({
        universal:"1",remover:"3",inspecionar:"4",construir:"5"
      })[button.dataset.tool]||"");
    });
    order?.setAttribute("aria-keyshortcuts","2");
  }
  document.addEventListener("click",event=>{
    if(event.target.closest(".tool,.speed-wrap,#drag-mode,#orders-btn,[data-order-type],#build-exit,#orders-panel,#drawer-close"))queueMicrotask(sync);
  });
  document.addEventListener("keydown",event=>{
    if(!document.body.classList.contains("play-session")||event.repeat||event.altKey||event.ctrlKey||event.metaKey)return;
    if(document.querySelector("dialog[open]"))return;
    if(event.target.closest("input,textarea,select,button,[contenteditable]"))return;
    const key=event.key.toLowerCase();
    if(!$("#construction-panel").hidden && ["1","2","3"].includes(key))return; // camadas existentes
    const actions={"1":".tool[data-tool='universal']","2":"#orders-btn",
      "3":".tool[data-tool='remover']","4":".tool[data-tool='inspecionar']",
      "5":".tool[data-tool='construir']",
      e:"#open-workers",t:"#open-tasks"};
    const dest=actions[key];
    if(dest){
      event.preventDefault();$(dest)?.click();queueMicrotask(sync);
    }else if(event.code==="Space"){
      event.preventDefault();
      const paused=$("[data-speed='0'].chosen");
      $(paused?"[data-speed='1']":"[data-speed='0']")?.click();
      queueMicrotask(sync);
    }else if(key==="escape"){
      if($("#orders-btn").getAttribute("aria-expanded")==="true")$("#orders-btn").click();
      else if(!$("#construction-panel").hidden)$("#build-exit")?.click();
      queueMicrotask(sync);
    }
  });
  sync();
})();
