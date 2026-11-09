import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ConsentTracker} from '../src/consent.ts';
const face=x=>({x,y:100,width:40,height:50});
const hand=x=>({x,y:105,category:'Victory',score:0.95});
const run=(tracker,faces,hands,start=0)=>Array.from({length:5},(_,i)=>i*250).map(t=>tracker.step(faces,hands,start+t)).at(-1);
test('exactly one second of continuous YA is required',()=>{
 const t=new ConsentTracker(), f=[face(100)], h=[hand(120)];
 for(const ms of [0,300,600,999]) assert.equal(t.step(f,h,ms).ready,false);
 assert.equal(t.step(f,h,1000).ready,true);
});
test('weak YA near the shoulder qualifies; a missed observation pauses without credit',()=>{
 const t=new ConsentTracker(), f=[face(100)],h=[{...hand(190),score:0.52}];
 for(const ms of [0,200,400]) t.step(f,h,ms);
 assert.equal(t.step(f,[],600).progress,400);
 assert.equal(t.step(f,h,800).progress,400);
 for(const ms of [1000,1200])assert.equal(t.step(f,h,ms).ready,false);
 assert.equal(t.step(f,h,1400).ready,true);
});
test('release, long loss and ambiguous hands reset accumulated time',()=>{
 for(const mode of ['release','loss','ambiguous']){
 const t=new ConsentTracker(), f=[face(100),face(180)], h=[hand(95)];
 for(const ms of [0,200,400,600]) t.step(f,h,ms);
 if(mode==='loss') for(const ms of [800,1000,1200]) t.step(f,[],ms);
 else t.step(f,mode==='release'?[{...hand(95),category:'Thumb_Up'}]:[hand(140)],800);
 const resumed=mode==='loss'?1400:1000;
 assert.equal(t.step(f,h,resumed).progress,0);
 assert.equal(t.step(f,h,resumed+400).confirmed,0);
 }
});
test('weak unrelated signals never confirm',()=>{
 const f=[face(100)];
 for(const handPose of [{...hand(100),score:0.49},{...hand(100),category:'Open_Palm'},hand(400)])
 assert.equal(run(new ConsentTracker(),f,[handPose]).ready,false);
});
test('two hands count once; reordered faces keep sequential consents',()=>{
 const t=new ConsentTracker(), f=[face(100),face(300)];
 assert.equal(run(t,f,[hand(90),hand(115)]).confirmed,1);
 assert.equal(run(t,[...f].reverse(),[hand(310)],1250).ready,true);
});
test('ambiguous hand confirms neither person',()=>{
 const t=new ConsentTracker();
 const r=run(t,[face(100),face(180)],[hand(140)]);
 assert.equal(r.confirmed,0);assert.equal(r.ambiguous,true);
});
test('five can consent; changes, absence, and six clear consent',()=>{
 const t=new ConsentTracker(), f=[100,300,500,700,900].map(face);
 assert.equal(run(t,f,f.map(p=>hand(p.x))).ready,true);
 assert.equal(t.step(f.slice(1),[],1250).confirmed,0);
 assert.equal(t.step([...f,face(1100)],[],1500).ready,false);
 assert.equal(t.step([],[],1750).ready,false);
 assert.equal(t.step(f,[],2000).confirmed,0);
});
test('replacement away from prior position clears previous consent',()=>{
 const t=new ConsentTracker();
 assert.equal(run(t,[face(100)],[hand(100)]).ready,true);
 assert.equal(t.step([face(400)],[],1250).confirmed,0);
});
