export type FaceBox={originX:number;originY:number;width:number;height:number};

export function foregroundAlpha(background:number){
  const x=Math.max(0,Math.min(1,(1-background-0.24)/0.52));
  return Math.round(255*x*x*(3-2*x));
}

// Limit lifting to a dark subject against a substantially brighter background.
export function exposureGamma(faceLuma:number,backgroundLuma:number){
  if(faceLuma>=80 || backgroundLuma-faceLuma<45)return 1;
  return 1-0.25*Math.min(1,(80-faceLuma)/45)*Math.min(1,(backgroundLuma-faceLuma-45)/55);
}
