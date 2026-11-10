import type {ImageSegmenter} from '@mediapipe/tasks-vision';

function surface(width:number,height:number){
  const canvas=document.createElement('canvas');
  canvas.width=width;canvas.height=height;
  const context=canvas.getContext('2d');
  if(!context)throw new Error('Canvas unavailable');
  return {canvas,context};
}

export async function composePhoto(frame:HTMLCanvasElement,mirror:boolean,segmenter:ImageSegmenter,
  paintCharacter:(context:CanvasRenderingContext2D)=>void){
  const cutout=surface(frame.width,frame.height);
  cutout.context.drawImage(frame,0,0);
  segmenter.segment(frame,result=>{
    // The binary selfie model emits one foreground confidence channel.
    const mask=result.confidenceMasks?.[0];
    if(!mask)throw new Error('Missing foreground mask');
    const pixels=mask.getAsFloat32Array();
    const matte=surface(mask.width,mask.height);
    const rgba=matte.context.createImageData(mask.width,mask.height);
    let foreground=false;
    for(let i=0;i<pixels.length;i++){
      rgba.data[4*i+3]=Math.round(255*Math.max(0,Math.min(1,(pixels[i]-0.1)/0.8)));
      if(pixels[i]>0.5)foreground=true;
    }
    if(!foreground)throw new Error('No foreground');
    matte.context.putImageData(rgba,0,0);
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
