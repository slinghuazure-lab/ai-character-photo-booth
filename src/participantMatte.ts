import type {PoseLandmarker} from '@mediapipe/tasks-vision';
import type {Person,Point} from './visitorFlow';

export class SeparationError extends Error{
  readonly reason:'pose'|'mask';
  constructor(reason:'pose'|'mask'='mask'){super(reason);this.reason=reason;}
}
export type SubjectSeeds={keep:boolean;points:Point[];mask?:{width:number;height:number;values:Float32Array}}[];

// Associate pose landmarks to tracked faces on the exact still that will be exported.
export function matchSubjects(frame:HTMLCanvasElement,people:Person[],selected:Set<number>,task:PoseLandmarker):SubjectSeeds{
  const poses=task.detect(frame);
  const used=new Set<number>();
  let subjects:SubjectSeeds;
  try{

    subjects=poses.landmarks.map((pose,index)=>{
      const nose=pose[0],x=nose.x*frame.width,y=nose.y*frame.height;
      const matches=people.filter(p=>x>=p.originX && x<=p.originX+p.width && y>=p.originY && y<=p.originY+p.height);
      if(matches.length>1||(matches.length===1 && used.has(matches[0].id)))throw new SeparationError('pose');
      if(matches.length)used.add(matches[0].id);
      const mask=poses.segmentationMasks?.[index];
      return {mask:mask?{width:mask.width,height:mask.height,values:mask.getAsFloat32Array().slice()}:undefined,keep:matches.length===1 && selected.has(matches[0].id),points:[0,11,12,13,14,15,16,23,24,25,26,27,28]
        .map(i=>pose[i]).filter(p=>p.visibility>0.7&&p.x>=0&&p.x<1&&p.y>=0&&p.y<1)};
    });
  }finally{poses.close();}
  // A wide shot can miss an upper body even when its face is well tracked.
    // Recheck only that person's area on the same shutter frame.
    for(const person of people){
      if(used.has(person.id))continue;
      const x=Math.max(0,Math.floor(person.originX-person.width*1.5));
      const y=Math.max(0,Math.floor(person.originY-person.height*.75));
      const w=Math.min(frame.width-x,Math.ceil(person.originX+person.width*2.5)-x);
      const h=Math.min(frame.height-y,Math.ceil(person.originY+person.height*5)-y);
      if(w<=0||h<=0)throw new SeparationError('pose');
      const crop=document.createElement('canvas');
      crop.width=frame.width;crop.height=frame.height;
      const ctx=crop.getContext('2d');
      if(!ctx)throw new SeparationError('pose');
      // Preserve body proportions when the portrait crop is fed to a wide camera canvas.
      const scale=Math.min(crop.width/w,crop.height/h);
      const left=(crop.width-w*scale)/2,top=(crop.height-h*scale)/2;
      ctx.fillStyle='black';ctx.fillRect(0,0,crop.width,crop.height);
      ctx.drawImage(frame,x,y,w,h,left,top,w*scale,h*scale);
      const local=task.detect(crop);
      try{
        const candidates=local.landmarks.map((pose,index)=>({index,points:pose.map(p=>({...p,
          x:(x+(p.x*crop.width-left)/scale)/frame.width,y:(y+(p.y*crop.height-top)/scale)/frame.height}))})).filter(({points:pose})=>{
          const px=pose[0].x*frame.width,py=pose[0].y*frame.height;
          const matches=people.filter(p=>px>=p.originX && px<=p.originX+p.width &&
            py>=p.originY && py<=p.originY+p.height);
          return matches.length===1 && matches[0].id===person.id;
        });
        if(candidates.length!==1)throw new SeparationError('pose');
        const points=[0,11,12,13,14,15,16,23,24,25,26,27,28].map(i=>candidates[0].points[i])
          .filter(p=>p.visibility>0.7 && p.x>=0 && p.x<1 && p.y>=0 && p.y<1);
        if(!points.length)throw new SeparationError('pose');
        const keep=selected.has(person.id);
        const localMask=local.segmentationMasks?.[candidates[0].index];
        let mask;
        if(localMask){
          const width=localMask.width,height=localMask.height;
          const values=new Float32Array(width*height);
          const source=localMask.getAsFloat32Array();
          for(let row=0;row<height;row++)for(let col=0;col<width;col++){
            const dx=(col+.5)*frame.width/width-x,dy=(row+.5)*frame.height/height-y;
            const i=row*width+col;
            if(dx<0||dy<0||dx>=w||dy>=h){
              // Outside a cropped bystander's mask, ownership is unknown.
              values[i]=keep?0:1;
              continue;
            }
            const mx=Math.floor((left+dx*scale)*width/crop.width);
            const my=Math.floor((top+dy*scale)*height/crop.height);
            values[i]=source[my*width+mx];
          }
          mask={width,height,values};
        }
        subjects.push({keep,points,mask});
      }finally{local.close();}
    }
  return subjects;
}

// Keep connected foreground regions touched by the selected poses. A region touched
// by both a selected and an unselected pose cannot safely be assigned to one person.
export function selectedRegions(background:Float32Array,w:number,h:number,subjects:SubjectSeeds){
  // If only the uncertain background fringe joins two silhouettes, discard
  // that fringe and use the stricter mask. A shared solid region still fails.
  try{return labelRegions(background,w,h,subjects,0.82);}
  catch(error){
    if(!(error instanceof SeparationError))throw error;
    try{return labelRegions(background,w,h,subjects,0.5);}
    catch(strictError){
      if(!(strictError instanceof SeparationError))throw strictError;
      // Touching shoulders can share a foreground component. Only export pixels
      // confidently belonging to a selected pose and outside all excluded poses.
      if(!subjects.some(s=>s.keep) || subjects.some(s=>!s.mask || !s.points.length))throw strictError;
      const allowed=new Uint8Array(w*h);
      for(let i=0;i<allowed.length;i++){
        if(background[i]>=0.82)continue;
        const x=((i%w)+0.5)/w,y=(Math.floor(i/w)+0.5)/h;
        let keep=0,exclude=0;
        for(const subject of subjects){
          const mask=subject.mask!;
          const confidence=mask.values[Math.floor(y*mask.height)*mask.width+Math.floor(x*mask.width)];
          if(subject.keep)keep=Math.max(keep,confidence);else exclude=Math.max(exclude,confidence);
        }
        if(keep>=0.75 && exclude<0.15)allowed[i]=1;
      }
      // Verify ownership at the landmarks before accepting the instance masks.
      for(const subject of subjects){
        const hits=subject.points.map(p=>allowed[Math.floor(p.y*h)*w+Math.floor(p.x*w)]);
        if(subject.keep?!hits[0]:hits.some(Boolean))throw strictError;
      }
      return allowed;
    }
  }
}
function labelRegions(background:Float32Array,w:number,h:number,subjects:SubjectSeeds,cutoff:number){
  const regions=new Int32Array(w*h),queue=new Int32Array(w*h);
  let label=0;
  function visit(i:number,tail:number){
    if(regions[i] || background[i]>=cutoff)return tail;
    regions[i]=label;queue[tail]=i;return tail+1;
  }
  for(let i=0;i<regions.length;i++){
    if(regions[i]||background[i]>=cutoff)continue;
    label++;let tail=visit(i,0);
    for(let head=0;head<tail;head++){
      const p=queue[head],x=p%w;
      if(x>0)tail=visit(p-1,tail);if(x+1<w)tail=visit(p+1,tail);
      if(p>=w)tail=visit(p-w,tail);if(p+w<regions.length)tail=visit(p+w,tail);
    }
  }
  const keep=new Set<number>(),exclude=new Set<number>();
  for(const subject of subjects){
    const owned=subject.points.map(p=>regions[Math.floor(p.y*h)*w+Math.floor(p.x*w)]).filter(Boolean);
    if(!owned.length)throw new SeparationError();
    for(const id of owned)(subject.keep?keep:exclude).add(id);
  }
  if(!keep.size||[...keep].some(id=>exclude.has(id)))throw new SeparationError();
  return Uint8Array.from(regions,id=>keep.has(id)?1:0);
}
