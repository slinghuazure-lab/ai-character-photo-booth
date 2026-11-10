import type {FaceBox} from './matte';

export type Lighting='waiting'|'checking'|'ok'|'dark'|'backlit';
type Reading='ok'|'dark'|'backlit';

// Coordinates of each box are normalized to the analysis frame.
export function assessLighting(image:ImageData,faces:FaceBox[]):Reading|null {
  const {width,height,data}=image;
  const histogram=new Uint32Array(256);
  const totals=faces.map(()=>({sum:0,n:0}));
  let background=0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const nx=(x+0.5)/width,ny=(y+0.5)/height,index=(y*width+x)*4;
    const luma=Math.round(data[index]*0.213+data[index+1]*0.715+data[index+2]*0.072);
    let outside=true;
    faces.forEach((f,i)=>{
      const dx=Math.abs(nx-f.originX-f.width/2),dy=Math.abs(ny-f.originY-f.height/2);
      if(dx<f.width/2 && dy<f.height/2)outside=false;
      if(dx<f.width*0.26 && dy<f.height*0.26){totals[i].sum+=luma;totals[i].n++;}
    });
    if(outside){histogram[luma]++;background++;}
  }
  const levels=totals.filter(s=>s.n>=4).map(s=>s.sum/s.n);
  if(!levels.length)return null;
  let bright=0,seen=0;
  while(bright<255 && seen+histogram[bright]<background*0.85)seen+=histogram[bright++];
  const face=Math.min(...levels);
  if(background && face<90 && bright-face>=65)return 'backlit';
  return face<58?'dark':'ok';
}

export class LightingMonitor {
  private candidate:Reading|null=null;
  private since=0;
  private last=-Infinity;
  private state:Lighting='waiting';

  update(reading:Reading|null,now:number):Lighting {
    if(!reading || now-this.last>1000){this.state='waiting';this.candidate=null;}
    this.last=now;
    if(!reading)return this.state;
    if(this.candidate!==reading){this.candidate=reading;this.since=now;}
    if(now-this.since>=2000)this.state=reading;
    return this.state==='waiting'?'checking':this.state;
  }
}
