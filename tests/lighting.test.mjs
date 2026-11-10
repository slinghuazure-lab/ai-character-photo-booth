import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assessLighting,LightingMonitor} from '../src/lighting.ts';
const box={originX:0.25,originY:0.25,width:0.5,height:0.5};
function scene(left,right,bg){
 const data=new Uint8ClampedArray(32*32*4);
 for(let y=0;y<32;y++)for(let x=0;x<32;x++){
 const v=x>=8 && x<24 && y>=8 && y<24?(x<16?left:right):bg;
 data.fill(v,4*(32*y+x),4*(32*y+x)+3);
 }
 return {data,width:32,height:32};
}
test('front and usable side light, dark room, backlight and empty view',()=>{
 for(const [a,b,c,want] of [[140,140,120,'ok'],[60,150,120,'ok'],[40,45,55,'dark'],[55,65,200,'backlit']])
 assert.equal(assessLighting(scene(a,b,c),[box]),want);
 assert.equal(assessLighting(scene(0,0,0),[]),null);
});
test('warnings and recovery need two continuous seconds; gaps and empty scenes reset',()=>{
 const m=new LightingMonitor();
 for(const t of [0,400,800,1200,1600,1999])assert.equal(m.update('dark',t),'checking');
 assert.equal(m.update('dark',2000),'dark');
 for(const t of [2200,2600,3000,3400,3800])assert.equal(m.update('ok',t),'dark');
 assert.equal(m.update('ok',4200),'ok');
 assert.equal(m.update('backlit',5500),'checking');
 assert.equal(m.update(null,5600),'waiting');
});
