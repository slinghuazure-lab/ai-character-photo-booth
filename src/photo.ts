import type {ImageSegmenter} from '@mediapipe/tasks-vision';

import {exposureGamma,foregroundAlpha,type FaceBox} from './matte';

function surface(width:number,height:number){
  const canvas=document.createElement('canvas');
  canvas.width=width;canvas.height=height;
  const context=canvas.getContext('2d');
  if(!context)throw new Error('Canvas unavailable');
  return {canvas,context};
}

export async function composePhoto(frame:HTMLCanvasElement,faces:FaceBox[],mirror:boolean,segmenter:ImageSegmenter,
  paintCharacter:(context:CanvasRenderingContext2D)=>void){
  const cutout=surface(frame.width,frame.height);
  cutout.context.drawImage(frame,0,0);
  segmenter.segment(frame,result=>{
    // Multiclass channel zero is background; all five other classes belong to the subject.
    const mask=result.confidenceMasks?.[0];
    if(!mask || result.confidenceMasks?.length!==6)throw new Error('Missing foreground mask');
    const pixels=mask.getAsFloat32Array();
    const matte=surface(mask.width,mask.height);
    const rgba=matte.context.createImageData(mask.width,mask.height);
    let foreground=false;
    for(let i=0;i<pixels.length;i++){
      rgba.data[4*i+3]=foregroundAlpha(pixels[i]);
      if(pixels[i]<0.5)foreground=true;
    }
    if(!foreground)throw new Error('No foreground');
    matte.context.putImageData(rgba,0,0);
    // Keep the facial interior opaque even if glasses or shadows confuse segmentation.
    // Feather inside the detected box so its corners do not reintroduce background.
    for(const face of faces){
      const sx=mask.width/frame.width,sy=mask.height/frame.height;
      matte.context.save();
      matte.context.translate((face.originX+face.width/2)*sx,(face.originY+face.height/2)*sy);
      matte.context.scale(face.width*0.44*sx,face.height*0.46*sy);
      const guard=matte.context.createRadialGradient(0,0,0.68,0,0,1);
      guard.addColorStop(0,'#fff');guard.addColorStop(1,'transparent');
      matte.context.fillStyle=guard;matte.context.fillRect(-1,-1,2,2);matte.context.restore();
    }
    const image=cutout.context.getImageData(0,0,frame.width,frame.height);
    let faceSum=0,faceN=0,bgSum=0,bgN=0;
    for(let y=4;y<frame.height;y+=12)for(let x=4;x<frame.width;x+=12){
      const i=4*(y*frame.width+x);
      const luma=image.data[i]*0.213+image.data[i+1]*0.715+image.data[i+2]*0.072;
      if(faces.some(f=>Math.abs(x-f.originX-f.width/2)<f.width*0.20 &&
          Math.abs(y-f.originY-f.height/2)<f.height*0.22)){faceSum+=luma;faceN++;}
      else if(pixels[Math.floor(y*mask.height/frame.height)*mask.width+Math.floor(x*mask.width/frame.width)]>0.9){
        bgSum+=luma;bgN++;
      }
    }
    const gamma=faceN && bgN?exposureGamma(faceSum/faceN,bgSum/bgN):1;
    if(gamma<1){
      const lut=Uint8ClampedArray.from({length:256},(_,i)=>255*Math.pow(i/255,gamma));
      for(let i=0;i<image.data.length;i+=4)for(let c=0;c<3;c++)image.data[i+c]=lut[image.data[i+c]];
      cutout.context.putImageData(image,0,0);
    }
    cutout.context.globalCompositeOperation='destination-in';
    cutout.context.drawImage(matte.canvas,0,0,frame.width,frame.height);
  });
  const {canvas,context}=surface(1920,1080);
  const background=context.createLinearGradient(0,0,1920,1080);
  background.addColorStop(0,'#badde9');background.addColorStop(1,'#f1e4cf');
  context.fillStyle=background;context.fillRect(0,0,1920,1080);
  const scale=Math.min(1920/frame.width,1080/frame.height);
  const w=frame.width*scale,h=frame.height*scale;
  context.save();
  if(mirror){context.translate(1920,0);context.scale(-1,1);}
  context.drawImage(cutout.canvas,(1920-w)/2,(1080-h)/2,w,h);
  context.restore();
  paintCharacter(context);
  return new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>{
    if(blob)resolve(blob);else reject(new Error('PNG encode failed'));
  },'image/png'));
}
