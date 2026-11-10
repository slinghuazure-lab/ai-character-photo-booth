import {test} from 'node:test';
import assert from 'node:assert/strict';
import {VisitorFlow} from '../src/visitorFlow.ts';
const face=(x)=>({originX:x,originY:100,width:60,height:65});
const a=face(10),b=face(250),upA={x:63,y:125},upB={x:302,y:130};
test('three continuous seconds, near-face thumb, five second window and late joiners',()=>{
 const f=new VisitorFlow();
 for(let t=0;t<3000;t+=500){f.step([a,b],[upA],t);assert.equal(f.phase,'hello');}
 f.step([a,b],[],2999);assert.equal(f.phase,'hello');
 f.step([a,b],[],3000);assert.equal(f.phase,'invite');
 f.step([a,b],[{x:640,y:422}],3500);assert.equal(f.phase,'invite');
 f.step([a,b],[upA],4000);assert.equal(f.deadline,9000);assert.equal(f.selected.length,1);
 f.step([a,b],[upB],4500);assert.equal(f.selected.length,2);assert.equal(f.canCapture(),true);
 f.reset();f.step([a,b],[],5000);assert.equal(f.phase,'idle');
});
test('changing faces never combines time and ambiguous hands do not initiate capture',()=>{
 const f=new VisitorFlow();
 for(let t=0;t<=5000;t+=500)f.step([a],[],t);
 for(let t=5500;t<8500;t+=500){f.step([b],[],t);assert.equal(f.phase,'hello');}
 f.step([b,face(345)],[{x:330,y:130}],8500);assert.equal(f.phase,'invite');assert.equal(f.separate,true);
});
test('lost participant cannot be silently replaced during countdown',()=>{
 const f=new VisitorFlow();
 for(let t=0;t<=3000;t+=500)f.step([a,b],[],t);
 f.step([a,b],[upA],3500);f.step([b],[],4000);assert.notEqual(f.phase,'countdown');assert.equal(f.selected.length,0);
});

test('brief empty sample pauses greeting; prolonged loss restarts it',()=>{
 const f=new VisitorFlow();
 for(let t=0;t<=2000;t+=500)f.step([a],[],t);
 f.step([],[],2200);assert.equal(f.phase,'hello');assert.equal(f.inviteSeconds,1);
 f.step([a],[],2500);f.step([a],[],3000);assert.equal(f.phase,'hello');
 f.step([a],[],3500);assert.equal(f.phase,'invite');
 const g=new VisitorFlow();g.step([a],[],0);g.step([],[],800);assert.equal(g.phase,'idle');
 g.step([a],[],1000);assert.equal(g.inviteSeconds,3);
});

test('a stationary returning face receives Hello again, but a held thumb cannot retrigger',()=>{
 const f=new VisitorFlow();
 for(let t=0;t<=3000;t+=500)f.step([a],[],t);
 f.step([a],[upA],3100);f.reset();
 f.step([a],[upA],3500);assert.equal(f.phase,'idle');
 f.step([a],[upA],4100);assert.equal(f.phase,'hello');assert.equal(f.inviteSeconds,3);
 for(let t=4600;t<=7100;t+=500)f.step([a],[upA],t);
 assert.equal(f.phase,'invite');
 f.step([a],[],7200);f.step([a],[upA],7300);assert.equal(f.phase,'countdown');
});
