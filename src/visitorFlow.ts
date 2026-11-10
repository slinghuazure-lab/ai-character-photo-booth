import type {FaceBox} from './matte';
export type Point={x:number;y:number};
export type VisitorPhase='idle'|'hello'|'invite'|'countdown'|'processing'|'qr'|'error';
export type Person=FaceBox & {id:number;since:number};
const center=(b:FaceBox)=>({x:b.originX+b.width/2,y:b.originY+b.height/2});
const overlap=(a:FaceBox,b:FaceBox)=>{
  const w=Math.max(0,Math.min(a.originX+a.width,b.originX+b.width)-Math.max(a.originX,b.originX));
  const h=Math.max(0,Math.min(a.originY+a.height,b.originY+b.height)-Math.max(a.originY,b.originY));
  return w*h/Math.min(a.width*a.height,b.width*b.height);
};
export class VisitorFlow{
  phase:VisitorPhase='idle';
  people:Person[]=[];
  participants=new Set<number>();
  deadline=0;
  separate=false;
  private releaseNeeded=false;
  private next=1;
  private last=-Infinity;
  private greeted=0;
  private finished=new Set<number>();
  private match(faces:FaceBox[],now:number){
    const old=now-this.last<=1000?this.people:[];
    const options=faces.map(f=>old.filter(p=>overlap(f,p)>0.35));
    this.people=faces.map((f,i)=>{
      const candidate=options[i].length===1?options[i][0]:null;
      if(candidate && options.filter(o=>o.includes(candidate)).length===1)
        return {...f,id:candidate.id,since:candidate.since};
      return {...f,id:this.next++,since:now};
    });
    this.last=now;
  }
  reset(){
    this.finished=new Set(this.people.map(p=>p.id));this.phase='idle';this.participants.clear();
    this.greeted=0;this.separate=false;this.releaseNeeded=false;
  }
  step(faces:FaceBox[],thumbs:Point[]|null,now:number){
    this.match(faces,now);
    if(['processing','qr','error'].includes(this.phase))return;
    if(this.phase==='countdown' && [...this.participants].some(id=>!this.people.some(p=>p.id===id))){
      this.participants.clear();this.phase='hello';this.greeted=0;
    }
    if(!this.people.some(p=>p.id===this.greeted)){
      const next=this.people.filter(p=>!this.finished.has(p.id)).sort((a,b)=>a.since-b.since)[0];
      this.greeted=next?.id??0;
      if(this.phase!=='countdown')this.phase=next?'hello':'idle';
    }
    const person=this.people.find(p=>p.id===this.greeted);
    if(this.phase==='hello' && person && now-person.since>=60000)this.phase='invite';
    if((this.phase==='invite'||this.phase==='countdown') && thumbs){
      if(this.releaseNeeded){
        if(!thumbs.length)this.releaseNeeded=false;
        return;
      }
      this.separate=false;
      for(const t of thumbs){
        const candidates=this.people.filter(p=>{
          const c=center(p);return Math.abs(t.x-c.x)<=p.width*1.7 && Math.abs(t.y-c.y)<=p.height*1.9;
        });
        if(candidates.length===1)this.participants.add(candidates[0].id);
        if(candidates.length>1)this.separate=true;
      }
      if(this.phase==='invite' && this.participants.size && !this.separate){
        this.phase='countdown';this.deadline=now+5000;
      }
    }
  }
  get selected(){return this.people.filter(p=>this.participants.has(p.id));}
  canCapture(){
    const selected=this.selected;
    return !this.separate && selected.length>0 && selected.length===this.participants.size &&
      selected.every(p=>this.people.every(q=>p.id===q.id||overlap(p,q)<0.12));
  }
  regroup(){this.phase='invite';this.participants.clear();this.separate=true;this.releaseNeeded=true;}
}
