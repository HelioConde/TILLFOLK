"use strict";
/* Only drawing is rate-limited on small screens. Simulation and autosave are unchanged. */
((root,factory)=>{
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.TillfolkRenderBudget=api;
})(typeof window!=="undefined"?window:null,()=>{
  const MOBILE_MAX_WIDTH=600;
  const fps=width=>Number.isFinite(Number(width))&&Number(width)<=MOBILE_MAX_WIDTH?30:60;
  const interval=width=>1000/fps(width);
  function shouldDraw(now,lastDraw,width){
    if(!Number.isFinite(now))return false;
    if(!Number.isFinite(lastDraw)||lastDraw===0)return true;
    return now-lastDraw>=interval(width)-1;
  }
  return Object.freeze({MOBILE_MAX_WIDTH,fps,interval,shouldDraw});
});
