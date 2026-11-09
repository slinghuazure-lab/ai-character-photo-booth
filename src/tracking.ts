export type Box = {originX:number; originY:number; width:number; height:number};
export type Point = {x:number; y:number};
const distance = (a:Point,b:Point) => Math.hypot(a.x-b.x,a.y-b.y);
const clamp = (x:number) => Math.max(0,Math.min(1,x));

// Coordinates in the detector's original, unmirrored video.
export class TargetTracker {
  point: Point = {x:0.5,y:0.5};
  locked: Point|null = null;
  private candidate: Point|null = null;
  private since = 0;
  private lastSeen = -Infinity;
  private lastTime: number|null = null;

  step(boxes:Box[], width:number, height:number, now:number) {
    const faces = boxes.filter(b=>b.width>0 && b.height>0).map(b=>({
      x:clamp((b.originX+b.width/2)/width), y:clamp((b.originY+b.height/2)/height),
      area:b.width*b.height
    })).sort((a,b)=>b.area-a.area);
    const largest = faces[0];
    if (largest) {
      this.lastSeen = now;
      const previous = this.locked;
      const current = previous && faces.reduce((a,b)=>distance(a,previous)<distance(b,previous)?a:b);
      if (!previous || (current===largest && distance(largest,previous)<0.22)) {
        this.locked = largest;
        this.candidate = null;
      } else {
        if (current && distance(current,previous)<0.22) this.locked=current;
        if (!this.candidate || distance(largest,this.candidate)>0.18) this.since=now;
        this.candidate=largest;
        if (now-this.since>=250) { this.locked=largest; this.candidate=null; }
      }
    } else {
      this.candidate=null;
      if (now-this.lastSeen>=450) this.locked=null;
    }
    const goal=this.locked ?? {x:0.5,y:0.5};
    const weight=1-Math.exp(-Math.min(150,now-(this.lastTime??now))/140);
    this.lastTime=now;
    this.point={x:this.point.x+(goal.x-this.point.x)*weight,y:this.point.y+(goal.y-this.point.y)*weight};
    return {count:faces.length, point:this.point, tracking:!!this.locked};
  }
}

export function eyeRotation(point:Point, eyeX:number, mirror:boolean) {
  const x=(mirror?1-point.x:point.x)*2-1;
  return { yaw:Math.atan2(x*1.35-eyeX,2.7), pitch:Math.atan2((point.y-0.5)*2,2.7) };
}
