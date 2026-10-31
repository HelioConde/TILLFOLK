"use strict";
(() => {
  const $=s=>document.querySelector(s);
  const menu=$("#menu");
  const key="tillfolk-menu-motion";
  function show(id){const d=$(id);if(!d.open)d.showModal();}
  let motion=!window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  try{const saved=localStorage.getItem(key);if(saved!==null)motion=saved==="true";}catch{}
  function sync(){menu.classList.toggle("no-title-motion",!motion);$("#title-motion").checked=motion;$("#title-motion").setAttribute("aria-checked",String(motion));}
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
  function syncFullscreen(){const active=!!document.fullscreenElement;const el=$("#title-fullscreen");el.setAttribute("aria-pressed",String(active));el.textContent=active?"⛶ Sair da tela cheia":"⛶ Tela cheia";}
  document.addEventListener("fullscreenchange",syncFullscreen);
  syncFullscreen();
  $("#title-fullscreen").addEventListener("click",fullscreen);
  $("#title-fullscreen-setting").addEventListener("click",fullscreen);

  // Áudio leve, sintetizado no navegador, iniciado somente após interação.
  const soundKey="tillfolk-menu-sound",volumeKey="tillfolk-menu-volume";
  let soundEnabled=true,volume=40,audioContext=null;
  try{
    const saved=localStorage.getItem(soundKey),v=localStorage.getItem(volumeKey);
    if(saved!==null)soundEnabled=saved==="true";
    if(v!==null)volume=Math.max(0,Math.min(100,Number(v)||0));
  }catch{}
  const toggleSound=$("#title-sound"),slider=$("#title-volume"),volumeLabel=$("#title-volume-label");
  function syncSound(){
    toggleSound.checked=soundEnabled;
    slider.value=String(volume);
    slider.disabled=!soundEnabled;
    $("#title-sound-test").disabled=!soundEnabled||volume===0;
    volumeLabel.textContent=volume+"%";
  }
  function playSound(){
    if(!soundEnabled||volume===0)return;
    try{
      const AudioContext=window.AudioContext||window.webkitAudioContext;
      if(!AudioContext)return;
      audioContext=audioContext||new AudioContext();
      if(audioContext.state==="suspended")audioContext.resume().catch(()=>{});
      const start=audioContext.currentTime;
      const tone=audioContext.createOscillator(),gain=audioContext.createGain();
      tone.type="sine";
      tone.frequency.setValueAtTime(540,start);
      tone.frequency.exponentialRampToValueAtTime(720,start+.08);
      gain.gain.setValueAtTime(.0001,start);
      gain.gain.exponentialRampToValueAtTime(Math.max(.0001,volume/100*.075),start+.013);
      gain.gain.exponentialRampToValueAtTime(.0001,start+.13);
      tone.connect(gain).connect(audioContext.destination);
      tone.start(start);tone.stop(start+.145);
    }catch(error){console.warn("Som indisponível:",error);}
  }
  function persistSound(){
    try{localStorage.setItem(soundKey,String(soundEnabled));localStorage.setItem(volumeKey,String(volume));}catch{}
  }
  syncSound();
  toggleSound.addEventListener("change",()=>{soundEnabled=toggleSound.checked;persistSound();syncSound();if(soundEnabled)playSound();});
  slider.addEventListener("input",()=>{volume=Number(slider.value);persistSound();syncSound();});
  $("#title-sound-test").addEventListener("click",playSound);
  menu.addEventListener("click",event=>{
    if(event.target.closest("button")&&!event.target.closest("#title-sound-test"))playSound();
  });
  $("#title-settings").addEventListener("click",()=>show("#title-settings-dialog"));
  $("#title-credits").addEventListener("click",()=>show("#title-credits-dialog"));
  $("#title-exit").addEventListener("click",()=>show("#title-exit-dialog"));
  $("#title-return").addEventListener("click",()=>$("#title-exit-dialog").close());
})();