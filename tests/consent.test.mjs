import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ConsentTracker} from '../src/consent.ts';
const face=x=>({x,y:100,width:40,height:50});
const hand=x=>({x,y:105,category:'Victory',score:0.95});
const run=(tracker,faces,hands,start=0)=>Array.from({length:13},(_,i)=>i*250).map(t=>tracker.step(faces,hands,start+t)).at(-1);
test('exactly three seconds of continuous YA is required',()=>{
 const t=new ConsentTracker(), f=[face(100)], h=[hand(120)];
 for(const ms of [0,300,600,900,1200,1500,1800,2100,2400,2700,2999]) assert.equal(t.step(f,h,ms).ready,false);
 assert.equal(t.step(f,h,3000).ready,true);
});
test('missing frames, low scores and other gestures break a hold',()=>{
 for(const noise of [[],[{...hand(100),category:'Thumb_Up'}],[{...hand(100),score:0.69}]]){
 const t=new ConsentTracker(), f=[face(100)],h=[hand(100)];
 t.step(f,h,0);t.step(f,h,300);t.step(f,noise,600);t.step(f,h,900);
 assert.equal(t.step(f,h,1200).ready,false);
 assert.equal(t.step(f,h,2200).ready,false);
 }
});
test('two hands count once; reordered faces keep sequential consents',()=>{
 const t=new ConsentTracker(), f=[face(100),face(300)];
 assert.equal(run(t,f,[hand(90),hand(115)]).confirmed,1);
 assert.equal(run(t,[...f].reverse(),[hand(310)],3250).ready,true);
});
test('ambiguous hand confirms neither person',()=>{
 const t=new ConsentTracker();
 const r=run(t,[face(100),face(180)],[hand(140)]);
 assert.equal(r.confirmed,0);assert.equal(r.ambiguous,true);
});
test('five can consent; changes, absence, and six clear consent',()=>{
 const t=new ConsentTracker(), f=[100,300,500,700,900].map(face);
 assert.equal(run(t,f,f.map(p=>hand(p.x))).ready,true);
 assert.equal(t.step(f.slice(1),[],3250).confirmed,0);
 assert.equal(t.step([...f,face(1100)],[],3500).ready,false);
 assert.equal(t.step([],[],3750).ready,false);
 assert.equal(t.step(f,[],4000).confirmed,0);
});
test('replacement away from prior position clears previous consent',()=>{
 const t=new ConsentTracker();
 assert.equal(run(t,[face(100)],[hand(100)]).ready,true);
 assert.equal(t.step([face(400)],[],3250).confirmed,0);
});
