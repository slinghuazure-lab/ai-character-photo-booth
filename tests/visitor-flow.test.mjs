import {test} from 'node:test';
import assert from 'node:assert/strict';
import {VisitorFlow} from '../src/visitorFlow.ts';
const face=(x)=>({originX:x,originY:100,width:60,height:65});
const a=face(10),b=face(250),upA={x:63,y:125},upB={x:302,y:130};
test('ten continuous seconds, near-face thumb, five second window and late joiners',()=>{
 const f=new VisitorFlow();
 for(let t=0;t<10000;t+=500){f.step([a,b],[upA],t);assert.equal(f.phase,'hello');}
 f.step([a,b],[],9999);assert.equal(f.phase,'hello');
 f.step([a,b],[],10000);assert.equal(f.phase,'invite');
 f.step([a,b],[{x:640,y:422}],10500);assert.equal(f.phase,'invite');
 f.step([a,b],[upA],11000);assert.equal(f.deadline,16000);assert.equal(f.selected.length,1);
 f.step([a,b],[upB],11500);assert.equal(f.selected.length,2);assert.equal(f.canCapture(),true);
 f.reset();f.step([a,b],[],12000);assert.equal(f.phase,'idle');
});
test('changing faces never combines time and ambiguous hands do not initiate capture',()=>{
 const f=new VisitorFlow();
 for(let t=0;t<=5000;t+=500)f.step([a],[],t);
 for(let t=5500;t<15500;t+=500){f.step([b],[],t);assert.equal(f.phase,'hello');}
 f.step([b,face(345)],[{x:330,y:130}],15500);assert.equal(f.phase,'invite');assert.equal(f.separate,true);
});
test('lost participant cannot be silently replaced during countdown',()=>{
 const f=new VisitorFlow();
 for(let t=0;t<=10000;t+=500)f.step([a,b],[],t);
 f.step([a,b],[upA],10500);f.step([b],[],11000);assert.notEqual(f.phase,'countdown');assert.equal(f.selected.length,0);
});

test('brief empty sample pauses greeting; prolonged loss restarts it',()=>{
 const f=new VisitorFlow();
 for(let t=0;t<=9000;t+=500)f.step([a],[],t);
 f.step([],[],9200);assert.equal(f.phase,'hello');assert.equal(f.inviteSeconds,1);
 f.step([a],[],9500);f.step([a],[],10000);assert.equal(f.phase,'hello');
 f.step([a],[],10500);assert.equal(f.phase,'invite');
 const g=new VisitorFlow();g.step([a],[],0);g.step([],[],800);assert.equal(g.phase,'idle');
 g.step([a],[],1000);assert.equal(g.inviteSeconds,10);
});
