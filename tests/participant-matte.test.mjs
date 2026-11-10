import {test} from 'node:test';
import assert from 'node:assert/strict';
import {selectedRegions,SeparationError} from '../src/participantMatte.ts';
const left={x:.18,y:.5},right={x:.82,y:.5};
test('only the joined visitors remain; two opted-in subjects are retained',()=>{
  const bg=Float32Array.from([0,0,1,0,0]);
  assert.deepEqual([...selectedRegions(bg,5,1,[{keep:true,points:[left]},{keep:false,points:[right]}])],[1,1,0,0,0]);
  assert.deepEqual([...selectedRegions(bg,5,1,[{keep:true,points:[left]},{keep:true,points:[right]}])],[1,1,0,1,1]);
});
test('mixed connected silhouettes cannot be exported',()=>{
  assert.throws(()=>selectedRegions(new Float32Array(5),5,1,[{keep:true,points:[left]},{keep:false,points:[right]}]),SeparationError);
});
