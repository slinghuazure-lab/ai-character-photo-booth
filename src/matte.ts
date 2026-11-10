export type FaceBox={originX:number;originY:number;width:number;height:number};

export function foregroundAlpha(background:number){
  const x=Math.max(0,Math.min(1,(1-background-0.24)/0.52));
  return Math.round(255*x*x*(3-2*x));
}

// Limit lifting to a dark subject against a substantially brighter background.
export function exposureGamma(faceLuma:number,backgroundLuma:number){
  if(faceLuma>=80 || backgroundLuma-faceLuma<45)return 1;
  return 1-0.42*Math.min(1,(80-faceLuma)/45)*Math.min(1,(backgroundLuma-faceLuma-45)/55);
}

export function referenceWeight(difference:number){
  const t=Math.max(0,Math.min(1,(difference-8)/20));
  return t*t*(3-2*t);
}

/** Preserve recognized anatomy when the empty plate has a similar colour.
 * Fabric can resemble a chair: keep confident fabric when its surroundings changed.
 */
export function calibratedWeight(difference:number,anatomy:number,clothes:number,nearbyChange:number){
  const preserve=(probability:number)=>Math.min(1,Math.max(0,(probability-0.35)/0.45));
  return Math.max(referenceWeight(difference),preserve(anatomy),preserve(clothes)*referenceWeight(nearbyChange));
}
