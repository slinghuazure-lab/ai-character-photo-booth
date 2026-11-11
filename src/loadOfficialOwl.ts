const models=import.meta.env.BASE_URL+'models/';

async function download(url:string,signal:AbortSignal,progress?:(received:number,total:number)=>void,immutable=false){
  const controller=new AbortController();
  const cancel=()=>controller.abort();
  signal.throwIfAborted();
  signal.addEventListener('abort',cancel,{once:true});
  let timer=window.setTimeout(cancel,20000);
  try{
    const response=await fetch(url,{signal:controller.signal,cache:immutable?'force-cache':'default'});
    if(!response.ok||!response.body)throw Error('Model download: '+response.status);
    const reader=response.body.getReader(),chunks:Uint8Array<ArrayBuffer>[]=[];
    const total=Number(response.headers.get('content-length'));
    let received=0;
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      chunks.push(new Uint8Array(value));received+=value.length;
      progress?.(received,total);
      window.clearTimeout(timer);timer=window.setTimeout(cancel,20000);
    }
    return new Blob(chunks);
  }finally{window.clearTimeout(timer);signal.removeEventListener('abort',cancel);}
}

export async function loadOfficialOwl(signal:AbortSignal,onProgress:(percent:number|null)=>void){
  if(typeof DecompressionStream!=='undefined'){
    const group=new AbortController();
    const stop=()=>group.abort();
    signal.throwIfAborted();signal.addEventListener('abort',stop,{once:true});
    try{
      const base=models+'owl-v15r5-parts/';
      const parts:{name:string;size:number}[]=JSON.parse(await (await download(base+'manifest.json',group.signal)).text());
      if(!parts.length||!parts.every(p=>/^[a-f0-9]{64}\.bin$/.test(p.name)&&p.size>0))throw Error('Invalid model manifest');
      const total=parts.reduce((sum,p)=>sum+p.size,0);
      const received=parts.map(()=>0),blobs:Blob[]=Array(parts.length);
      let next=0;
      async function worker(){
        while(next<parts.length){
          const index=next++,part=parts[index];
          for(let attempt=0;;attempt++){
            try{
              const blob=await download(base+part.name,group.signal,bytes=>{
                received[index]=Math.min(bytes,part.size);
                onProgress(Math.floor(100*received.reduce((a,b)=>a+b,0)/total));
              },true);
              if(blob.size!==part.size)throw Error('Incomplete model part');
              blobs[index]=blob;break;
            }catch(error){if(group.signal.aborted||attempt>=1)throw error;}
          }
        }
      }
      await Promise.all(Array.from({length:3},worker));
      return await new Response(new Blob(blobs).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    }catch(error){if(signal.aborted)throw error;}
    finally{group.abort();signal.removeEventListener('abort',stop);}
  }
  onProgress(null);
  return (await download(models+'NTUB_Doctoral_Owl_v15R5_10_Actions.glb',signal,(bytes,total)=>{
    if(total>0)onProgress(Math.min(100,Math.floor(bytes*100/total)));
  })).arrayBuffer();
}
