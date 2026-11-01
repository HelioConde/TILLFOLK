"use strict";
/* Logística física TILLFOLK: nenhum recurso é criado no depósito ao coletar.
   Pilhas no solo, baús e entregas de obra persistem em localStorage. */
(()=>{
  const COSTS=Object.freeze({
    buildStation:Object.freeze({twigs:10}),
    buildHome:Object.freeze({wood:8}),
    buildChest:Object.freeze({twigs:8,grass:3})
  });
  const CHEST_SPRITE="./public/assets/Sprout Lands - Sprites - premium pack/Sprout Lands - Sprites - premium pack/Tilesets/Building parts/Chest.png";
  const normalize=state=>{
    state.groundItems=Array.isArray(state.groundItems)?state.groundItems.filter(i=>
      i&&Number.isFinite(i.x)&&Number.isFinite(i.y)&&typeof i.kind==="string"&&i.qty>0):[];
    state.chests=Array.isArray(state.chests)?state.chests.filter(i=>
      i&&Number.isInteger(i.x)&&Number.isInteger(i.y)).map(c=>({
        x:c.x,y:c.y,items:c.items&&typeof c.items==="object"?c.items:{}
      })):[];
    state.nextDropId=Math.max(1,Number(state.nextDropId)||1,...state.groundItems.map(i=>(Number(i.id)||0)+1));
    return state;
  };
  const drop=(state,x,y,kind,qty=1)=>{
    normalize(state);qty=Math.floor(Number(qty)||0);if(qty<=0)return null;
    const found=state.groundItems.find(item=>item.kind===kind&&item.x===x&&item.y===y);
    if(found){found.qty+=qty;return found;}
    const item={id:state.nextDropId++,x,y,kind,qty};state.groundItems.push(item);return item;
  };
  const capacity=worker=>{
    const red=Math.min(3,worker?.neg?.length||0);
    const skill=worker?.skills?.includes("carry");
    // 1 unidade sem logística; transportadores especialistas fazem viagens maiores.
    return skill?Math.min(12,(worker.skills.length===1?4:worker.skills.length===2?3:2)+red+(worker.carryBonus||0)):1+(worker.carryBonus||0);
  };
  const costFor=order=>{
    if(order.type==="craftTool")return window.TillfolkCrafting?.recipe(order.recipe)?.cost||{};
    return COSTS[order.type]||{};
  };
  function available(state,kind){
    normalize(state);
    return (Number(state.inventory?.[kind])||0)+
      state.chests.reduce((n,ch)=>n+(Number(ch.items[kind])||0),0)+
      state.groundItems.reduce((n,d)=>n+(d.kind===kind?d.qty:0),0);
  }
  const remaining=(order,cost=costFor(order))=>Object.fromEntries(
    Object.entries(cost).map(([kind,qty])=>[kind,Math.max(0,qty-(order.delivered?.[kind]||0))])
      .filter(([,qty])=>qty>0));
  const complete=order=>Object.keys(remaining(order)).length===0;
  function sources(state,kind){
    normalize(state);
    const found=state.groundItems.filter(i=>i.kind===kind&&i.qty>0)
      .map(i=>({type:"ground",id:i.id,x:i.x,y:i.y,qty:i.qty}));
    for(const c of state.chests)if((c.items[kind]||0)>0)
      found.push({type:"chest",x:c.x,y:c.y,qty:c.items[kind]});
    if((state.inventory?.[kind]||0)>0)
      found.push({type:"stock",x:Math.floor(state.spawn?.x||40),y:Math.floor(state.spawn?.y||25),qty:state.inventory[kind]});
    return found;
  }
  function plan(state,order,worker){
    const needs=remaining(order);
    const candidates=[];
    for(const [kind,needed] of Object.entries(needs)){
      for(const source of sources(state,kind)){
        const distance=Math.abs(worker.x-(source.x+.5))+Math.abs(worker.y-(source.y+.5));
        candidates.push({source,kind,qty:Math.min(capacity(worker),needed,source.qty),distance});
      }
    }
    candidates.sort((a,b)=>a.distance-b.distance);
    const best=candidates[0];if(!best)return null;
    return {orderId:order.id,phase:"fetch",source:best.source,kind:best.kind,
      qty:best.qty,limit:Math.min(capacity(worker),needs[best.kind]),
      cargo:0,destination:{x:order.x,y:order.y}};
  }
  function collect(state,job){
    normalize(state);
    let amount=0;
    if(job.source.type==="ground"){
      const item=state.groundItems.find(i=>i.id===job.source.id);
      if(item){amount=Math.min(item.qty,job.qty);item.qty-=amount;}
      state.groundItems=state.groundItems.filter(i=>i.qty>0);
    }else if(job.source.type==="chest"){
      const chest=state.chests.find(c=>c.x===job.source.x&&c.y===job.source.y);
      if(chest){amount=Math.min(chest.items[job.kind]||0,job.qty);chest.items[job.kind]-=amount;}
    }else{
      amount=Math.min(state.inventory?.[job.kind]||0,job.qty);
      if(amount)state.inventory[job.kind]-=amount;
    }
    job.qty=amount;return amount;
  }
  function deliver(state,order,job){
    if(job.qty<=0)return 0;
    if(order){
      order.delivered=order.delivered||{};
      order.delivered[job.kind]=(order.delivered[job.kind]||0)+job.qty;
    }else{
      const chest=state.chests.find(c=>c.x===job.destination.x&&c.y===job.destination.y);
      if(!chest){drop(state,job.destination.x,job.destination.y,job.kind,job.qty);return 0;}
      chest.items[job.kind]=(chest.items[job.kind]||0)+job.qty;
    }
    return job.qty;
  }
  function planStorage(state,worker){
    normalize(state);
    if(!state.chests.length)return null;
    const source=state.groundItems.filter(i=>i.qty>0)
      .sort((a,b)=>(Math.abs(worker.x-a.x)+Math.abs(worker.y-a.y))-
        (Math.abs(worker.x-b.x)+Math.abs(worker.y-b.y)))[0];
    if(!source)return null;
    const chest=[...state.chests].sort((a,b)=>
      Math.abs(a.x-source.x)+Math.abs(a.y-source.y)-
      Math.abs(b.x-source.x)-Math.abs(b.y-source.y))[0];
    return {orderId:null,phase:"fetch",kind:source.kind,
      qty:Math.min(capacity(worker),source.qty),limit:capacity(worker),cargo:0,
      source:{type:"ground",id:source.id,x:source.x,y:source.y},
      destination:{x:chest.x,y:chest.y}};
  }
  function refund(state,order){
    for(const [kind,qty] of Object.entries(order?.delivered||{}))
      drop(state,order.x,order.y,kind,qty);
    if(order)order.delivered={};
  }
  window.TillfolkLogistics=Object.freeze({
    COSTS,CHEST_SPRITE,normalize,drop,capacity,costFor,available,remaining,complete,
    sources,plan,collect,deliver,planStorage,refund
  });
})();