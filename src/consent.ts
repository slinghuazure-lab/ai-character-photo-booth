export type Face = {x:number; y:number; width:number; height:number};
export type Hand = {x:number; y:number; category:string; score:number};
type Participant = {id:number; face:Face; since:number|null; confirmed:boolean};
export type Consent = {count:number; confirmed:number; ready:boolean; ambiguous:boolean};
export const emptyConsent:Consent={count:0,confirmed:0,ready:false,ambiguous:false};

// Coordinates are in original video pixels. Only unambiguous, continuous evidence counts.
export const YA_HOLD_MS=3000;
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
    const candidates=faces.map(face=>previous.filter(person=>
      Math.hypot(person.face.x-face.x,person.face.y-face.y)<Math.min(face.width,person.face.width)*0.75));
    const continuous=now>=this.last && now-this.last<=450 && previous.length===count &&
      candidates.every(list=>list.length===1) && new Set(candidates.map(list=>list[0])).size===count;
    this.last=now;
    this.people=faces.map((face,i)=>continuous?{...candidates[i][0],face}:
      {id:this.nextId++,face,since:null,confirmed:false});
    const evidence=new Set<number>();
    let ambiguous=false;
    for(const hand of hands){
      if(hand.category!=='Victory' || hand.score<0.7)continue;
      const owners=this.people.filter(({face})=>
        Math.abs(hand.x-face.x)<=1.7*face.width && Math.abs(hand.y-face.y)<=1.5*face.height);
      if(owners.length===1)evidence.add(owners[0].id);
      else if(owners.length>1)ambiguous=true;
    }
    for(const person of this.people){
      if(ambiguous || !evidence.has(person.id))person.since=null;
      else {
        person.since??=now;
        if(now-person.since>=YA_HOLD_MS)person.confirmed=true;
      }
    }
    const confirmed=this.people.filter(p=>p.confirmed).length;
    return {count,confirmed,ready:!ambiguous && confirmed===count,ambiguous};
  }
}
