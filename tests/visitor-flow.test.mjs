import {test} from 'node:test';
import assert from 'node:assert/strict';
import {VisitorFlow} from '../src/visitorFlow.ts';
const face=(x)=>({originX:x,originY:100,width:60,height:65});
const a=face(10),b=face(250),upA={x:63,y:125},upB={x:302,y:130};
test('sixty continuous seconds, near-face thumb, five second window and late joiners',()=>{
 const f=new VisitorFlow();
 for(let t=0;t<60000;t+=500){f.step([a,b],[upA],t);assert.equal(f.phase,'hello');}
 f.step([a,b],[],60000);assert.equal(f.phase,'invite');
 f.step([a,b],[{x:640,y:422}],60500);assert.equal(f.phase,'invite');
 f.step([a,b],[upA],61000);assert.equal(f.deadline,66000);assert.equal(f.selected.length,1);
 f.step([a,b],[upB],61500);assert.equal(f.selected.length,2);assert.equal(f.canCapture(),true);
 f.reset();f.step([a,b],[],62000);assert.equal(f.phase,'idle');
});
test('changing faces never combines time and ambiguous hands do not initiate capture',()=>{
 const f=new VisitorFlow();
 for(let t=0;t<=30000;t+=500)f.step([a],[],t);
 for(let t=30500;t<90500;t+=500){f.step([b],[],t);assert.equal(f.phase,'hello');}
 f.step([b,face(345)],[{x:330,y:130}],90500);assert.equal(f.phase,'invite');assert.equal(f.separate,true);
});
test('lost participant cannot be silently replaced during countdown',()=>{
 const f=new VisitorFlow();
 for(let t=0;t<=60000;t+=500)f.step([a,b],[],t);
 f.step([a,b],[upA],60500);f.step([b],[],61000);assert.notEqual(f.phase,'countdown');assert.equal(f.selected.length,0);
});
