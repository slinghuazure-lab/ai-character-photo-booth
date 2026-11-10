import {test} from 'node:test';
import assert from 'node:assert/strict';
import {matchSubjects,selectedRegions,SeparationError} from '../src/participantMatte.ts';
const left={x:.18,y:.5},right={x:.82,y:.5};
test('only the joined visitors remain; two opted-in subjects are retained',()=>{
  const bg=Float32Array.from([0,0,1,0,0]);
  assert.deepEqual([...selectedRegions(bg,5,1,[{keep:true,points:[left]},{keep:false,points:[right]}])],[1,1,0,0,0]);
  assert.deepEqual([...selectedRegions(bg,5,1,[{keep:true,points:[left]},{keep:true,points:[right]}])],[1,1,0,1,1]);
});
test('mixed connected silhouettes cannot be exported',()=>{
  assert.throws(()=>selectedRegions(new Float32Array(5),5,1,[{keep:true,points:[left]},{keep:false,points:[right]}]),SeparationError);
});

test('a soft background fringe does not merge otherwise separate people',()=>{
 const bg=Float32Array.from([0,0,0.7,0,0]);
 assert.deepEqual([...selectedRegions(bg,5,1,[{keep:true,points:[left]},{keep:false,points:[right]}])],[1,1,0,0,0]);
});
test('touching silhouettes retain only confidently selected pose pixels',()=>{
 const mask=values=>({width:5,height:1,values:Float32Array.from(values)});
 const subjects=[{keep:true,points:[left],mask:mask([1,1,.8,0,0])},{keep:false,points:[right],mask:mask([0,0,.6,1,1])}];
 assert.deepEqual([...selectedRegions(new Float32Array(5),5,1,subjects)],[1,1,0,0,0]);
 subjects[1].mask=mask([1,1,1,1,1]);
 assert.throws(()=>selectedRegions(new Float32Array(5),5,1,subjects),SeparationError);
});

test('a recovered participant mask is aligned to the still when two foregrounds touch',t=>{
 const frame={width:100,height:100};
 const faces=[{id:1,originX:40,originY:40,width:20,height:20},{id:2,originX:86,originY:40,width:10,height:20}];
 const landmarks=(x,y)=>Array.from({length:33},()=>({x,y,visibility:1}));
 const mask=columns=>({width:10,height:10,getAsFloat32Array:()=>Float32Array.from({length:100},(_,i)=>columns.includes(i%10)?1:0)});
 const original=globalThis.document;
 globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},drawImage(){}})})};
 t.after(()=>{if(original)globalThis.document=original;else delete globalThis.document;});
 const task={detect:input=>input===frame?
   {landmarks:[landmarks(.91,.5)],segmentationMasks:[mask([8,9])],close(){}}:
   {landmarks:[landmarks(.5,.34375)],segmentationMasks:[mask([4,5,6])],close(){}}};
 const subjects=matchSubjects(frame,faces,new Set([1]),task);
 const allowed=selectedRegions(new Float32Array(100),10,10,subjects);
 assert.equal(allowed[55],1);assert.equal(allowed[59],0);assert.equal(allowed[50],0);
});
