import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
await cp(new URL('../node_modules/@mediapipe/tasks-vision/wasm/', import.meta.url),
         new URL('../public/wasm/', import.meta.url), { recursive: true });

const owl = new URL('../public/models/NTUB_Doctoral_Owl_v15R5_10_Actions.glb', import.meta.url);
const packed=gzipSync(await readFile(owl),{level:9});
const dir=new URL('./owl-v15r5-parts/',owl);
await mkdir(dir,{recursive:true});
const files=[];
for(let start=0;start<packed.length;start+=256*1024){
  const part=packed.subarray(start,start+256*1024);
  const name=createHash('sha256').update(part).digest('hex')+'.bin';
  files.push({name,size:part.length});
  await writeFile(new URL(name,dir),part);
}
await writeFile(new URL('manifest.json',dir),JSON.stringify(files));
