import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TargetTracker,eyeRotation} from '../src/tracking.ts';
const face=(x,size)=>({originX:x-size/2,originY:20,width:size,height:size});
test('largest face wins regardless of detector order',()=>{
  for (const order of [[face(75,30),face(20,20)],[face(20,20),face(75,30)]]) {
    const tracker=new TargetTracker();tracker.step(order,100,100,0);
    assert.equal(tracker.locked.x,0.75);
  }
});
test('brief challengers do not switch, sustained challengers interpolate',()=>{
  const t=new TargetTracker();t.step([face(20,35)],100,100,0);
  const frames=[face(20,25),face(80,35)];
  t.step(frames,100,100,100);t.step(frames,100,100,300);
  assert.equal(t.locked.x,0.2);
  const was=t.point.x;t.step(frames,100,100,400);
  assert.equal(t.locked.x,0.8);assert.ok(t.point.x>was && t.point.x<0.8);
});
test('brief loss holds and sustained loss returns toward idle center',()=>{
  const t=new TargetTracker();t.step([face(20,35)],100,100,0);
  const held=t.step([],100,100,200);assert.ok(held.tracking);assert.equal(held.count,0);
  const idle=t.step([],100,100,500);assert.equal(idle.tracking,false);assert.ok(idle.point.x>held.point.x);
});
test('eye pivots converge separately and horizontal mirror reverses gaze',()=>{
  const p={x:0.1,y:0.8};
  assert.notEqual(eyeRotation(p,0.34,false).yaw,eyeRotation(p,-0.34,false).yaw);
  assert.ok(eyeRotation(p,0.34,true).yaw>0 && eyeRotation(p,0.34,false).yaw<0);
  assert.equal(eyeRotation(p,0.34,true).pitch,eyeRotation(p,0.34,false).pitch);
});
