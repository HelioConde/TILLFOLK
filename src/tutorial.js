"use strict";
// Guia com ilustrações desenhadas dos próprios atlas Sprout Lands do jogo.
(() => {
 const dialog=document.querySelector("#help-dialog");
 if(!dialog)return;
 const slides=[...dialog.querySelectorAll("[data-guide-step]")];
 const dots=[...dialog.querySelectorAll("[data-guide-dot]")];
 const last=slides.length-1;
 const root="./public/assets/sprout-lands/";
 const sources={
  grass:"terrain/grass.png",soil:"terrain/soil.png",
  till:"terrain/tilled-dirt.png",trees:"environment/trees-and-bushes.png",
  crops:"farming/crops.png",worker:"characters/worker-variants.png",
  chest:"structures/chest.png",well:"structures/water-well.png",
  fences:"structures/fences.png"
 };
 const images={};
 let selected=0;
 for(const [id,path] of Object.entries(sources)){
   const img=new Image();img.src=root+path;images[id]=img;
   img.addEventListener("load",drawSlides);
 }
 function draw(canvas){
   const cx=canvas.getContext("2d");cx.imageSmoothingEnabled=false;
   const w=canvas.width,h=canvas.height;
   cx.fillStyle="#b4d38f";cx.fillRect(0,0,w,h);
   function stamp(id,sx,sy,sw,sh,x,y,dw=sw,dh=sh){
     const image=images[id];if(!image?.naturalWidth)return;
     if(sx+sw>image.naturalWidth||sy+sh>image.naturalHeight)return;
     cx.drawImage(image,sx,sy,sw,sh,x,y,dw,dh);
   }
   for(let y=0;y<h;y+=32)for(let x=0;x<w;x+=32)
     stamp("grass",((x/32+y/32)%4)*16,80,16,16,x,y,32,32);
   const variant=canvas.dataset.guideArt;
   const tree=(x,y)=>stamp("trees",144,48,48,48,x,y,90,92);
   const worker=(x,y,appearance=0)=>stamp("worker",11,appearance*192+10,26,27,x,y,72,77);
   const chest=(x,y)=>stamp("chest",0,0,32,32,x,y,60,60);
   const well=(x,y)=>stamp("well",0,0,32,32,x,y,66,66);
   const garden=(stage=3)=>{
     for(let y=89;y<160;y+=32)for(let x=135;x<379;x+=32)
       stamp("till",0,80,16,16,x,y,32,32);
     for(let x=140;x<370;x+=34)
       stamp("crops",stage*16,48,16,16,x,75,30,43);
   };
   if(variant==="world"){tree(30,25);tree(232,8);worker(153,68);chest(296,88);}
   else if(variant==="workers"){worker(60,65,0);worker(162,65,0);well(268,76);}
   else if(variant==="clear"){tree(210,30);worker(68,65);chest(298,94);}
   else if(variant==="crops"){garden(2);worker(36,67);}
   else if(variant==="harvest"){garden(4);worker(35,68);chest(285,98);}
   else {well(264,64);worker(30,68);worker(124,68);garden(3);}
 }
 function drawSlides(){dialog.querySelectorAll(".guide-art").forEach(draw);}
 function go(index){
   selected=Math.max(0,Math.min(last,index));
   slides.forEach((el,i)=>{el.hidden=i!==selected;});
   dots.forEach((el,i)=>{if(i===selected)el.setAttribute("aria-current","step");else el.removeAttribute("aria-current");});
   document.querySelector("#help-prev").disabled=selected===0;
   document.querySelector("#help-next").hidden=selected===last;
   document.querySelector("#help-close").hidden=selected!==last;
   document.querySelector("#guide-play").hidden=selected!==last;
   document.querySelector("#guide-counter").textContent=(selected+1)+" de "+slides.length;
   drawSlides();
 }
 dialog.querySelector("#help-prev").addEventListener("click",()=>go(selected-1));
 dialog.querySelector("#help-next").addEventListener("click",()=>go(selected+1));
 dots.forEach((el,i)=>el.addEventListener("click",()=>go(i)));
 document.querySelector("#help-btn").addEventListener("click",()=>go(0));
 dialog.addEventListener("keydown",event=>{
   if(event.target.closest("button") && event.key!=="ArrowRight"&&event.key!=="ArrowLeft")return;
   if(event.key==="ArrowRight"){event.preventDefault();go(selected+1);}
   if(event.key==="ArrowLeft"){event.preventDefault();go(selected-1);}
 });
 dialog.addEventListener("close",()=>go(0));
 go(0);
})();
