import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sceneFaces} from '../src/sceneFaces.ts';

test('wide camera tiles recover additional faces without counting duplicate detections',()=>{
  const source={},tile={width:0,height:0,getContext:()=>({drawImage(){}})};
  const width=1080,height=418,span=Math.round(height*1.25);
  const stride=(width-span)/2;
  const face=(x,score)=>({boundingBox:{originX:x,originY:80,width:80,height:80},categories:[{score}]});
  let call=0;
  const model={detectForVideo(input){
    if(input===source)return {detections:[face(100,.75)]};
    const x=[100,465,820][call],offset=Math.round(stride*call++);
    const d=face((x-offset)*tile.width/span,.90);
    d.boundingBox.originY*=tile.height/height;d.boundingBox.width*=tile.width/span;d.boundingBox.height*=tile.height/height;
    return {detections:[d]};
  }};
  const result=sceneFaces(model,source,width,height,0,tile);
  assert.equal(result.length,3);
  assert.deepEqual(result.map(p=>Math.round(p.originX)),[100,465,820]);
});
