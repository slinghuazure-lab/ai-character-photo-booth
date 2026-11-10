import type {PoseLandmarker} from '@mediapipe/tasks-vision';
import type {Person,Point} from './visitorFlow';

export class SeparationError extends Error{}
export type SubjectSeeds={keep:boolean;points:Point[]}[];

// Associate pose landmarks to tracked faces on the exact still that will be exported.
export function matchSubjects(frame:HTMLCanvasElement,people:Person[],selected:Set<number>,task:PoseLandmarker):SubjectSeeds{
  const poses=task.detect(frame);
  try{
    if(!poses.landmarks.length || poses.landmarks.length!==people.length)throw new SeparationError();
    const used=new Set<number>();
    return poses.landmarks.map(pose=>{
      const nose=pose[0],x=nose.x*frame.width,y=nose.y*frame.height;
      const matches=people.filter(p=>x>=p.originX && x<=p.originX+p.width && y>=p.originY && y<=p.originY+p.height);
      if(matches.length!==1||used.has(matches[0].id))throw new SeparationError();
      used.add(matches[0].id);
      return {keep:selected.has(matches[0].id),points:[0,11,12,13,14,15,16,23,24,25,26,27,28]
        .map(i=>pose[i]).filter(p=>p.visibility>0.7&&p.x>=0&&p.x<1&&p.y>=0&&p.y<1)};
    });
  }finally{poses.close();}
}

// Keep connected foreground regions touched by the selected poses. A region touched
// by both a selected and an unselected pose cannot safely be assigned to one person.
export function selectedRegions(background:Float32Array,w:number,h:number,subjects:SubjectSeeds){
  const regions=new Int32Array(w*h),queue=new Int32Array(w*h);
  let label=0;
  function visit(i:number,tail:number){
    if(regions[i] || background[i]>=0.82)return tail;
    regions[i]=label;queue[tail]=i;return tail+1;
  }
  for(let i=0;i<regions.length;i++){
    if(regions[i]||background[i]>=0.82)continue;
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
