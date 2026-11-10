import type {FaceDetector} from '@mediapipe/tasks-vision';
import type {FaceBox} from './matte';

// A single short-range detector pass can miss small faces across a wide exhibition camera.
export function sceneFaces(task:FaceDetector,source:HTMLCanvasElement|HTMLVideoElement,width:number,height:number,
  now:number,tile:HTMLCanvasElement):FaceBox[]{
  const candidates:{box:FaceBox;score:number}[]=[];
  function collect(input:HTMLCanvasElement|HTMLVideoElement,time:number,x:number,scaleX:number,scaleY:number){
    for(const d of task.detectForVideo(input,time).detections){
      const b=d.boundingBox;
      if(b)candidates.push({box:{originX:x+b.originX*scaleX,originY:b.originY*scaleY,width:b.width*scaleX,height:b.height*scaleY},score:d.categories[0]?.score??0});
    }
  }
  collect(source,now,0,1,1);
  if(width/height>1.55){
    const span=Math.min(width,Math.round(height*1.25)),n=Math.ceil((width-span)/(span*.70))+1;
    const target=Math.min(384,height);
    if(tile.width!==Math.round(span*target/height)||tile.height!==target){
      tile.width=Math.round(span*target/height);tile.height=target;
    }
    const ctx=tile.getContext('2d');
    if(ctx)for(let j=0;j<n;j++){
      const x=Math.round(j*(width-span)/(n-1));
      ctx.drawImage(source,x,0,span,height,0,0,tile.width,tile.height);
      collect(tile,now+(j+1)*0.1,x,span/tile.width,height/tile.height);
    }
  }
  const result:FaceBox[]=[];
  for(const {box} of candidates.sort((a,b)=>b.score-a.score)){
    const duplicate=result.some(other=>{
      const w=Math.max(0,Math.min(other.originX+other.width,box.originX+box.width)-Math.max(other.originX,box.originX));
      const h=Math.max(0,Math.min(other.originY+other.height,box.originY+box.height)-Math.max(other.originY,box.originY));
      return w*h>0.55*Math.min(box.width*box.height,other.width*other.height);
    });
    if(!duplicate)result.push(box);
  }
  return result;
}

// During a shot only search around the faces already present at the trigger.
export function trackKnownFaces(task:FaceDetector,source:HTMLCanvasElement|HTMLVideoElement,width:number,height:number,
  now:number,tile:HTMLCanvasElement,known:FaceBox[]):FaceBox[]{
  if(!known.length)return [];
  if(tile.width!==256 || tile.height!==256){tile.width=256;tile.height=256;}
  const ctx=tile.getContext('2d');
  if(!ctx)return [];
  const boxes:FaceBox[]=[];
  for(const [i,face] of known.entries()){
    const size=Math.min(width,height,Math.max(face.width,face.height)*2.8);
    const x=Math.max(0,Math.min(width-size,face.originX+(face.width-size)/2));
    const y=Math.max(0,Math.min(height-size,face.originY+(face.height-size)/2));
    ctx.drawImage(source,x,y,size,size,0,0,256,256);
    const scale=size/256;
    for(const d of task.detectForVideo(tile,now+i*0.01).detections){
      const b=d.boundingBox;
      if(!b)continue;
      const box={originX:x+b.originX*scale,originY:y+b.originY*scale,width:b.width*scale,height:b.height*scale};
      if(Math.abs(box.originX+box.width/2-face.originX-face.width/2)>face.width*.55 ||
         Math.abs(box.originY+box.height/2-face.originY-face.height/2)>face.height*.55)continue;
      if(!boxes.some(p=>Math.abs(p.originX-box.originX)<box.width*.25 && Math.abs(p.originY-box.originY)<box.height*.25))
        boxes.push(box);
    }
  }
  return boxes;
}
