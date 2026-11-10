export type Face = {x:number; y:number; width:number; height:number};
export type Hand = {x:number; y:number; category:string; score:number};
type Participant = {id:number; face:Face; held:number; lastPositive:number|null; seen:boolean; confirmed:boolean};
export type Consent = {count:number; confirmed:number; ready:boolean; ambiguous:boolean; progress:number; handCount:number};
export const emptyConsent:Consent={count:0,confirmed:0,ready:false,ambiguous:false,progress:0,handCount:0};

// Coordinates are in original video pixels. Only unambiguous, continuous evidence counts.
export const CONSENT_HOLD_MS=1000;
export class ConsentTracker {
  private people:Participant[]=[];
  private nextId=1;
  private last=-Infinity;

  step(faces:Face[],hands:Hand[],now:number):Consent {
    const count=faces.length;
    if(count===0 || count>5){
      this.people=[];this.last=now;
      return {...emptyConsent,count};
    }
    const previous=this.people;
    const dt=now-this.last;
    const candidates=faces.map(face=>previous.filter(person=>
      Math.hypot(person.face.x-face.x,person.face.y-face.y)<Math.min(face.width,person.face.width)*0.75));
    const continuous=now>=this.last && now-this.last<=450 && previous.length===count &&
      candidates.every(list=>list.length===1) && new Set(candidates.map(list=>list[0])).size===count;
    this.last=now;
    this.people=faces.map((face,i)=>continuous?{...candidates[i][0],face}:
      {id:this.nextId++,face,held:0,lastPositive:null,seen:false,confirmed:false});
    const evidence=new Set<number>();
    const rejected=new Set<number>();
    let ambiguous=false;
    for(const hand of hands){
      const thumbsUp=hand.category==='Thumb_Up' && hand.score>=0.50;
      const other=hand.category!=='None' && hand.category!=='Thumb_Up' && hand.score>=0.65;
      if(!thumbsUp && !other)continue;
      const owners=this.people.filter(({face})=>
        Math.abs(hand.x-face.x)<=(count===1?2.6:1.7)*face.width && Math.abs(hand.y-face.y)<=(count===1?2.2:1.5)*face.height);
      if(owners.length===1)(thumbsUp?evidence:rejected).add(owners[0].id);
      else if(thumbsUp && owners.length>1)ambiguous=true;
    }
    for(const person of this.people){
      const positive=!ambiguous && evidence.has(person.id);
      if(ambiguous || (!positive && rejected.has(person.id)) ||
          (person.lastPositive!==null && now-person.lastPositive>500)){
        person.held=0;person.seen=false;person.lastPositive=null;
      }
      if(positive){
        if(person.seen)person.held+=dt;
        person.lastPositive=now;
        if(person.held>=CONSENT_HOLD_MS)person.confirmed=true;
      }
      person.seen=positive;
    }
    const confirmed=this.people.filter(p=>p.confirmed).length;
    const progress=Math.max(0,...this.people.filter(p=>!p.confirmed).map(p=>p.held));
    return {count,confirmed,ready:!ambiguous && confirmed===count,ambiguous,progress,handCount:hands.length};
  }
}
