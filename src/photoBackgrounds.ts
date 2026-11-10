export const backgroundSlots=[1,2,3] as const;
const key=(slot:number)=>'ntub-photo-background-v1/'+slot;

const campusBackgrounds=[
  import.meta.env.BASE_URL+'backgrounds/NTUB_PhotoBooth_01_Daylight_1920x1080.png',
  import.meta.env.BASE_URL+'backgrounds/NTUB_PhotoBooth_02_BlueHour_1920x1080.png',
  import.meta.env.BASE_URL+'backgrounds/NTUB_PhotoBooth_03_Sunset_1920x1080.png',
];

export function readBackground(slot:number){
  let saved:string|null=null;
  try{saved=localStorage.getItem(key(slot));}catch{/* Built-ins also work without storage. */}
  if(saved===null)return campusBackgrounds[slot-1]??null;
  return saved||null;
}

export async function saveBackground(slot:number,file:File|null){
  if(!file){localStorage.setItem(key(slot),'');return;}
  const image=await createImageBitmap(file);
  try{
    const canvas=document.createElement('canvas');
    canvas.width=1920;canvas.height=1080;
    const ctx=canvas.getContext('2d');
    if(!ctx)throw Error('Canvas unavailable');
    const scale=Math.max(canvas.width/image.width,canvas.height/image.height);
    const w=image.width*scale,h=image.height*scale;
    ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(image,(canvas.width-w)/2,(canvas.height-h)/2,w,h);
    localStorage.setItem(key(slot),canvas.toDataURL('image/jpeg',0.85));
  }finally{image.close();}
}

export async function drawPhotoBackground(ctx:CanvasRenderingContext2D){
  const available=backgroundSlots.map(readBackground).filter((v):v is string=>!!v);
  if(!available.length)return;
  const image=new Image();
  image.src=available[Math.floor(Math.random()*available.length)];
  try{await image.decode();}catch{return;}
  ctx.drawImage(image,0,0,ctx.canvas.width,ctx.canvas.height);
}
