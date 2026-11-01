"use strict";
/* Painel complementar de sobrevivência. Nenhuma alteração na simulação ou no save. */
(()=>{
  const toggle=document.getElementById("hud-stats-toggle");
  const panel=document.getElementById("hud-extra-stats");
  if(!toggle||!panel)return;
  function open(value){
    panel.hidden=!value;
    toggle.setAttribute("aria-expanded",String(value));
  }
  toggle.addEventListener("click",()=>{
    open(panel.hidden);
    if(!panel.hidden)panel.querySelector("#colony-life-open")?.focus({preventScroll:true});
  });
  document.addEventListener("pointerdown",event=>{
    if(!panel.hidden&&!panel.contains(event.target)&&!toggle.contains(event.target))open(false);
  },true);
  document.addEventListener("keydown",event=>{
    if(event.key==="Escape"&&!panel.hidden){
      event.stopImmediatePropagation();
      open(false);
      toggle.focus({preventScroll:true});
    }
  },true);
  panel.querySelector("#colony-life-open")?.addEventListener("click",()=>open(false));
  document.addEventListener("click",event=>{
    if(event.target.closest(".hud-panels button,#menu-btn"))open(false);
  });
})();
