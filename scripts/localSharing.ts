import {randomUUID} from 'node:crypto';
import type {Plugin} from 'vite';

// Enabled only by "vite --mode share-demo". No files are written to disk.
export function localSharing():Plugin{
  const photos=new Map<string,{png:Buffer;token:string;until:number}>();
  const route='/ai-character-photo-booth/__share/';
  const lifetime=3600000;
  return {name:'local-photo-sharing',apply:'serve',configureServer(server){
    server.middlewares.use(async(req,res,next)=>{
      const url=new URL(req.url??'/', 'http://localhost');
      if(!url.pathname.startsWith(route))return next();
      const id=url.pathname.slice(route.length).replace(/\.png$/,'');
      const end=(code:number)=>{res.statusCode=code;res.end();};
      if(!/^[a-f0-9-]{36}$/.test(id))return end(404);
      const now=Date.now();
      for(const [key,p] of photos)if(p.until<=now)photos.delete(key);
      res.setHeader('Cache-Control','no-store');
      if(req.method==='POST'){
        if(req.headers.origin && new URL(req.headers.origin).host!==req.headers.host)return end(403);
        if(req.headers['content-type']!=='image/png')return end(415);
        let size=0;const chunks:Buffer[]=[];
        try{
          for await(const chunk of req){
            size+=chunk.length;if(size>10*1024*1024)return end(413);
            chunks.push(Buffer.from(chunk));
          }
          const png=Buffer.concat(chunks);
          if(png.length<24 || png.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')return end(400);
          let photo=photos.get(id);
          if(!photo){
            if(photos.size>=24)return end(507);
            photo={png,token:randomUUID(),until:now+lifetime};photos.set(id,photo);
          }else if(!photo.png.equals(png))return end(409);
          photo.until=now+lifetime;
          res.setHeader('Content-Type','application/json');
          res.end(JSON.stringify({url:route+id+'.png?token='+photo.token}));
        }catch{end(400);}
      }else if(req.method==='GET'){
        const photo=photos.get(id);
        if(!photo || photo.token!==url.searchParams.get('token'))return end(404);
        res.setHeader('Content-Type','image/png');
        res.setHeader('Content-Disposition','attachment; filename="NTUB-1920x1080.png"');
        res.end(photo.png);
      }else end(405);
    });
  }};
}
