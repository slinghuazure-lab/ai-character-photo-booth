type Point={x:number;y:number};
type Held=Point & {since:number};
export class ThumbShutter{
  private hands:Held[]=[];
  private last=-Infinity;
  private latched=false;
  private releasedAt:number|null=null;

  step(thumbs:Point[],now:number){
    if(now-this.last>500)this.hands=[];
    this.last=now;
    if(!thumbs.length){
      this.hands=[];this.releasedAt??=now;
      if(now-this.releasedAt>=500)this.latched=false;
      return false;
    }
    this.releasedAt=null;
    const available=new Set(this.hands);
    this.hands=thumbs.map(hand=>{
      let best:Held|undefined,distance=0.15;
      for(const previous of available){
        const d=Math.hypot(previous.x-hand.x,previous.y-hand.y);
        if(d<distance){distance=d;best=previous;}
      }
      if(best)available.delete(best);
      return {...hand,since:best?.since??now};
    });
    if(this.latched||!this.hands.some(h=>now-h.since>=1000))return false;
    this.latched=true;return true;
  }
}
