"use strict";
(() => {
  const $=s=>document.querySelector(s);
  const menu=$("#menu");
  const key="tillfolk-menu-motion";
  function show(id){const d=$(id);if(!d.open)d.showModal();}
  let motion=!window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  try{const saved=localStorage.getItem(key);if(saved!==null)motion=saved==="true";}catch{}
  function sync(){menu.classList.toggle("no-title-motion",!motion);$("#title-motion").checked=motion;}
  sync();
  $("#title-motion").addEventListener("change",e=>{
    motion=e.target.checked;sync();
    try{localStorage.setItem(key,String(motion));}catch{}
  });
  function fullscreen(){
    if(!document.fullscreenEnabled){show("#title-settings-dialog");return;}
    if(document.fullscreenElement){document.exitFullscreen().catch(()=>{});}
    else{document.documentElement.requestFullscreen().catch(()=>{});}
  }
  $("#title-fullscreen").addEventListener("click",fullscreen);
  $("#title-fullscreen-setting").addEventListener("click",fullscreen);
  $("#title-settings").addEventListener("click",()=>show("#title-settings-dialog"));
  $("#title-credits").addEventListener("click",()=>show("#title-credits-dialog"));
  $("#title-exit").addEventListener("click",()=>show("#title-exit-dialog"));
  $("#title-return").addEventListener("click",()=>$("#title-exit-dialog").close());
})();