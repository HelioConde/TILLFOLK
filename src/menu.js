"use strict";
(() => {
  const $=s=>document.querySelector(s);
  const menu=$("#menu");
  const key="tillfolk-menu-motion";
  function show(id){const d=$(id);if(!d.open)d.showModal();}
  let motion=!window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  try{const saved=localStorage.getItem(key);if(saved!==null)motion=saved==="true";}catch{}
  function sync(){
    menu.classList.toggle("no-title-motion",!motion);
    document.body.classList.toggle("tf-reduced-animations",!motion);
    for(const input of [$("#title-motion"),$("#game-motion")]){
      if(!input)continue;
      input.checked=motion;
      input.setAttribute("aria-checked",String(motion));
    }
  }
  function setMotion(value){
    motion=Boolean(value);sync();
    try{localStorage.setItem(key,String(motion));}catch{}
  }
  sync();
  for(const input of [$("#title-motion"),$("#game-motion")])
    input?.addEventListener("change",e=>setMotion(e.target.checked));
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
  const soundToggles=[$("#title-sound"),$("#game-sound")];
  const sliders=[$("#title-volume"),$("#game-volume")];
  const volumeLabels=[$("#title-volume-label"),$("#game-volume-label")];
  function syncSound(){
    soundToggles.forEach(input=>{if(input)input.checked=soundEnabled;});
    sliders.forEach(input=>{if(input){input.value=String(volume);input.disabled=!soundEnabled;}});
    volumeLabels.forEach(label=>{if(label)label.textContent=volume+"%";});
    for(const id of ["#title-sound-test","#game-sound-test"]){
      const button=$(id);if(button)button.disabled=!soundEnabled||volume===0;
    }
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
  soundToggles.forEach(input=>input?.addEventListener("change",()=>{
    soundEnabled=input.checked;persistSound();syncSound();if(soundEnabled)playSound();
  }));
  sliders.forEach(input=>input?.addEventListener("input",()=>{
    volume=Math.max(0,Math.min(100,Number(input.value)||0));persistSound();syncSound();
  }));
  $("#title-sound-test").addEventListener("click",playSound);
  $("#game-sound-test")?.addEventListener("click",playSound);
  document.addEventListener("click",event=>{
    if(event.target.closest("button")&&!event.target.closest("#title-sound-test,#game-sound-test"))playSound();
  });
  window.TillfolkPreferences={animationsEnabled:()=>motion&&!window.matchMedia("(prefers-reduced-motion: reduce)").matches};
  $("#title-settings").addEventListener("click",()=>show("#title-settings-dialog"));
  $("#game-fullscreen-setting")?.addEventListener("click",fullscreen);
  $("#title-credits").addEventListener("click",()=>show("#title-credits-dialog"));
  $("#title-exit").addEventListener("click",()=>show("#title-exit-dialog"));
  $("#title-return").addEventListener("click",()=>$("#title-exit-dialog").close());
})();