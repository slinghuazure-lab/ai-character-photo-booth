import {test} from 'node:test';
import assert from 'node:assert/strict';
import {VisitorFlow} from '../src/visitorFlow.ts';
const face=(x)=>({originX:x,originY:100,width:60,height:65});
const a=face(10),b=face(250),upA={x:63,y:125},upB={x:302,y:130};
test('three continuous seconds, near-face thumb, five second countdown ignores late joiners',()=>{
 const f=new VisitorFlow();
 for(let t=0;t<3000;t+=500){f.step([a,b],[upA],t);assert.equal(f.phase,'hello');}
 f.step([a,b],[],2999);assert.equal(f.phase,'hello');
 f.step([a,b],[],3000);assert.equal(f.phase,'invite');
 f.step([a,b],[{x:640,y:422}],3500);assert.equal(f.phase,'invite');
 f.step([a,b],[upA],4000);assert.equal(f.deadline,9000);assert.equal(f.selected.length,1);
 f.step([a,b],[upB],4500);assert.equal(f.selected.length,1);assert.equal(f.canCapture(),true);
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
 f.step([a,b],[upA],3500);f.step([b],[],4000);assert.equal(f.canCapture(),false);
 f.step([b],[],4500);assert.notEqual(f.phase,'countdown');assert.equal(f.selected.length,0);
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

test('near-face thumbs on either side select only their owner in a group',()=>{
 const group=[face(100),face(205),face(310)];
 for(const dx of [-27,27]){
   const f=new VisitorFlow();
   for(let t=0;t<=3000;t+=500)f.step(group,[],t);
   f.step(group,[{x:235+dx,y:132}],3100);
   assert.equal(f.phase,'countdown');
   assert.deepEqual(f.selected.map(p=>p.originX),[205]);
   f.step(group,[{x:182.5,y:132}],3200);
   assert.equal(f.separate,false);
   assert.equal(f.canCapture(),true);
 }
});

test('a missed face near the shutter delays capture until both faces match again',()=>{
 const f=new VisitorFlow();
 for(let t=0;t<=3000;t+=500)f.step([a,b],[],t);
 f.step([a,b],[upA],3100);
 for(let t=3600;t<=7600;t+=500)f.step([a,b],[],t);
 f.step([b],[],8100);
 assert.equal(f.phase,'countdown');assert.equal(f.canCapture(),false);
 f.step([b,a],[],8200);
 assert.equal(f.deadline,8100);assert.equal(f.canCapture(),true);
 assert.deepEqual(f.selected.map(p=>p.originX),[a.originX]);
});

test('a separation failure keeps the original participant for a hands-down retake',()=>{
 const f=new VisitorFlow();
 for(let t=0;t<=3000;t+=500)f.step([a,b],[],t);
 f.step([a,b],[upA],3100);
 for(let t=3600;t<=8100;t+=500)f.step([a,b],[],t);
 f.phase='processing';f.regroup(8200);
 for(let t=8300;t<=13200;t+=100)f.step([b,a],[],t);
 assert.equal(f.phase,'countdown');assert.equal(f.reposition,true);
 assert.equal(f.deadline,13200);assert.equal(f.canCapture(),true);
 assert.deepEqual(f.selected.map(p=>p.originX),[a.originX]);
 f.step([b],[],14200);assert.equal(f.selected.length,0);
});

test('one departing volunteer does not cancel the original shutter for the remaining volunteer',()=>{
 const f=new VisitorFlow(),c=face(480);
 for(let t=0;t<=3000;t+=500)f.step([a,b,c],[],t);
 f.step([a,b,c],[upA,upB],3100);
 for(let t=3600;t<=7600;t+=500)f.step([a,b,c],[],t);
 f.step([c,b],[],8000);
 assert.equal(f.canCapture(),false);
 f.step([c,b],[],8400);
 assert.equal(f.phase,'countdown');assert.equal(f.deadline,8100);
 assert.deepEqual(f.selected.map(p=>p.originX),[b.originX]);
 assert.equal(f.canCapture(),true);
});

test('persistent overlap stops after one automatic retake and reset starts a new session',()=>{
 const f=new VisitorFlow();
 f.phase='processing';f.regroup(5000);assert.equal(f.deadline,10000);
 f.phase='processing';f.regroup(10000);assert.equal(f.phase,'error');
 f.step([a,b],[upA],16000);assert.equal(f.phase,'error');
 f.reset();assert.equal(f.reposition,false);assert.equal(f.phase,'idle');
});

test('an unanswered invitation expires after ten seconds and a new visitor can start again',()=>{
 const f=new VisitorFlow();
 for(let t=0;t<=12500;t+=500)f.step([a],[],t);
 assert.equal(f.phase,'invite');assert.equal(f.expireInvitation(12999),false);
 assert.equal(f.expireInvitation(13000),true);assert.equal(f.phase,'idle');
 for(let t=13001;t<=16001;t+=500)f.step([a],[upA],t);
 assert.equal(f.phase,'idle');assert.equal(f.selected.length,0);
 f.step([a,b],[],16100);assert.equal(f.phase,'hello');
});
test('a thumb just before expiry starts the normal countdown; one at expiry does not',()=>{
 for(const time of [12999,13000]){
   const f=new VisitorFlow();
   for(let t=0;t<=12500;t+=500)f.step([a],[],t);
   f.step([a],[upA],time);
   assert.equal(f.phase,time===12999?'countdown':'idle');
   assert.equal(f.expireInvitation(time+200),false);
 }
});

test('a held thumb, both thumbs, and lowering both hands keep the same locked visitor',()=>{
 const flow=new VisitorFlow();
 for(let t=0;t<=3000;t+=500)flow.step([a,b],[],t);
 flow.step([a,b],[upA,upA],3100);
 const id=flow.selected[0].id;
 for(let t=3200;t<=8100;t+=100){
   flow.step([a,b],t<5000?[upA,upA,upB]:[],t);
   assert.deepEqual(flow.selected.map(p=>p.id),[id]);
   assert.equal(flow.deadline,8100);
 }
});

test('overlapping face boxes are allowed only if both tracked people joined',()=>{
 const flow=new VisitorFlow();
 flow.people=[{...face(10),id:1,since:0},{...face(60),id:2,since:0}];
 flow.participants.add(1);assert.equal(flow.canCapture(),false);
 flow.participants.add(2);assert.equal(flow.canCapture(),true);
});
