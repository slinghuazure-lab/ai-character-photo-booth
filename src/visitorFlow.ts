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
const inviteDelay=3000;
export class VisitorFlow{
  phase:VisitorPhase='idle';
  people:Person[]=[];
  participants=new Set<number>();
  deadline=0;
  separate=false;
  reposition=false;
  private releaseNeeded=false;
  private interrupted=false;
  private incompleteFrame=false;
  get inviteSeconds(){
    const person=this.people.find(p=>p.id===this.greeted);
    return person?Math.max(1,Math.ceil((inviteDelay-(this.last-person.since))/1000)):inviteDelay/1000;
  }
  private next=1;
  private last=-Infinity;
  private greeted=0;
  private declined=new Set<number>();
  private idleUntil=-Infinity;
  private match(faces:FaceBox[],now:number){
    const old=now-this.last<=(this.interrupted?750:1000)?this.people:[];
    const options=faces.map(f=>old.filter(p=>overlap(f,p)>0.35));
    // Keep identities through a short missed frame, but never photograph it.
    // A new or ambiguous face must go through normal matching immediately.
    this.incompleteFrame=this.phase==='countdown' && now-this.last<=750 &&
      faces.length<old.length && options.every(o=>o.length===1) &&
      new Set(options.map(o=>o[0].id)).size===faces.length;
    if(this.incompleteFrame)return;
    this.people=faces.map((f,i)=>{
      const candidate=options[i].length===1?options[i][0]:null;
      if(candidate && options.filter(o=>o.includes(candidate)).length===1)
        return {...f,id:candidate.id,since:candidate.since+(this.interrupted?now-this.last:0)};
      return {...f,id:this.phase==='countdown'?0:this.next++,since:now};
    }).filter(p=>p.id!==0);
    this.last=now;this.interrupted=false;
  }
  expireInvitation(now:number){
    if(this.phase!=='invite'||now<this.deadline)return false;
    this.declined=new Set(this.people.map(person=>person.id));
    this.phase='idle';this.greeted=0;this.deadline=0;
    this.participants.clear();this.separate=false;
    return true;
  }
  reset(){
    this.declined.clear();
    this.idleUntil=this.last+1000;this.people=[];this.interrupted=false;this.incompleteFrame=false;this.phase='idle';this.participants.clear();
    this.greeted=0;this.reposition=false;this.separate=false;this.releaseNeeded=true;
  }
  step(faces:FaceBox[],thumbs:Point[]|null,now:number){
    if(this.expireInvitation(now))return;
    // Pause the greeting on a brief missed detection; only a matched return resumes it.
    if(this.phase==='hello' && !faces.length && now-this.last<=750){this.interrupted=true;return;}
    if(this.phase==='idle' && now<this.idleUntil)return;
    if(this.releaseNeeded && thumbs?.length===0)this.releaseNeeded=false;
    if(['processing','qr','error'].includes(this.phase))return;
    this.match(faces,now);
    if(this.incompleteFrame)return;
    if(this.phase==='countdown'){
      for(const id of this.participants){
        if(!this.people.some(p=>p.id===id))this.participants.delete(id);
      }
      if(!this.participants.size){
        this.reposition=false;this.separate=false;this.phase='hello';this.greeted=0;
      }
    }
    if(!this.people.some(p=>p.id===this.greeted)){
      const next=this.people.filter(p=>!this.declined.has(p.id)).sort((a,b)=>a.since-b.since)[0];
      this.greeted=next?.id??0;
      if(this.phase!=='countdown')this.phase=next?'hello':'idle';
    }
    const person=this.people.find(p=>p.id===this.greeted);
    if(this.phase==='hello' && person && now-person.since>=inviteDelay){
      this.phase='invite';this.deadline=now+10_000;
    }
    if(this.phase==='invite' && thumbs){
      if(this.releaseNeeded){
        if(!thumbs.length)this.releaseNeeded=false;
        return;
      }
      this.separate=false;
      this.participants.clear();
      for(const t of thumbs){
        const candidates=this.people.flatMap(person=>{
          const c=center(person);
          const dx=Math.abs(t.x-c.x)/person.width,dy=Math.abs(t.y-c.y)/person.height;
          if(dx>1.7 || dy>1.9)return [];
          return [{person,distance:Math.hypot(dx,dy)}];
        }).sort((a,b)=>a.distance-b.distance);
        const [nearest,other]=candidates;
        if(!nearest)continue;
        // Overlapping search areas are common in groups. Only resolve them
        // when the hand is close to one face and clearly farther from the next.
        if(!other || (nearest.distance<=0.9 && other.distance>=nearest.distance+0.65)){
          this.participants.add(nearest.person.id);
        }else this.separate=true;
      }
      if(this.phase==='invite' && this.participants.size && !this.separate){
        this.phase='countdown';this.deadline=now+5000;
      }
    }
  }
  get selected(){return this.people.filter(p=>this.participants.has(p.id));}
  canCapture(){
    const selected=this.selected;
    return !this.incompleteFrame && !this.separate && selected.length>0 && selected.length===this.participants.size &&
      selected.every(p=>this.people.every(q=>this.participants.has(q.id)||overlap(p,q)<0.12));
  }
  regroup(now:number){
    if(this.reposition){this.phase='error';return;}
    this.phase='countdown';
    this.reposition=true;
    this.deadline=now+5000;
  }
}
