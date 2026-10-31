const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const context={window:{}};
vm.runInNewContext(fs.readFileSync('src/house-renderer.js','utf8'),context);
const house=context.window.TillfolkHouse;

function stage(){
  const calls=[];
  const ctx={
    calls,
    drawImage(...args){calls.push(args);},
    save(){},restore(){},translate(){},scale(){}
  };
  const image={complete:true,naturalWidth:128,naturalHeight:128};
  return {ctx,sprites:{roof:image,walls:image,door:image}};
}

test('a cabana de 2x2 fica centralizada com a base sobre o solo',()=>{
  const size=house.dimensions(1);
  assert.equal(size.width,112);
  assert.equal(size.height,128);
  const where=house.positionForFootprint(64,96,64,64,1);
  assert.equal(where.x,40);
  assert.equal(where.y,48);
  const preview=house.positionForFootprint(64,96,64,64,1);
  assert.equal(preview.x,where.x);
  assert.equal(preview.y,where.y);
});

test('o renderizador do menu funciona em escala do mundo com e sem telhado',()=>{
  const {ctx,sprites}=stage();
  const full=house.draw(ctx,sprites,0,0,{scale:1});
  assert.equal(full.walls,20);
  assert.equal(full.roof,35);
  assert.equal(full.windows,2);
  assert.equal(full.doors,1);
  assert.equal(full.chimneys,1);
  assert.equal(full.stretched,0);
  assert.ok(ctx.calls.length>=50);
  const {ctx:openCtx}=stage();
  const open=house.draw(openCtx,sprites,0,0,{scale:1,roofVisible:false});
  assert.equal(open.roof,0);
  assert.equal(open.chimneys,0);
  assert.ok(openCtx.calls.length>20);
});
