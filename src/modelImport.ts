import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

export function fileLoader(){
  const manager=new THREE.LoadingManager();
  manager.setURLModifier(url=>{
    if(!url.startsWith('blob:')&&!url.startsWith('data:'))throw new Error('Use a self-contained GLB');
    return url;
  });
  return new GLTFLoader(manager);
}

export function releaseModel(root:THREE.Object3D){
  const textures=new Set<THREE.Texture>();
  root.traverse(node=>{
    if(!(node instanceof THREE.Mesh))return;
    node.geometry.dispose();
    if(node instanceof THREE.SkinnedMesh)node.skeleton.dispose();
    for(const m of Array.isArray(node.material)?node.material:[node.material]){
      for(const v of Object.values(m))if(v instanceof THREE.Texture)textures.add(v);
      m.dispose();
    }
  });
  for(const t of textures){t.dispose();t.source.data?.close?.();}
}

export async function inspectGlb(bytes:ArrayBuffer){
  const h=new DataView(bytes);
  if(bytes.byteLength<20||h.getUint32(0,true)!==0x46546c67||h.getUint32(4,true)!==2||
    h.getUint32(8,true)!==bytes.byteLength)throw new Error('Invalid GLB');
  const length=h.getUint32(12,true);
  if(h.getUint32(16,true)!==0x4e4f534a || length>bytes.byteLength-20)throw new Error('Missing GLB JSON');
  const manifest=JSON.parse(new TextDecoder().decode(new Uint8Array(bytes,20,length)));
  for(const resource of [...(manifest.buffers??[]),...(manifest.images??[])]){
    if(resource.uri && !resource.uri.startsWith('data:'))throw new Error('External GLB resource');
  }
  const gltf=await fileLoader().parseAsync(bytes,'');
  try{
    const bounds=new THREE.Box3().setFromObject(gltf.scene,true);
    if(bounds.isEmpty() || !Number.isFinite(bounds.getSize(new THREE.Vector3()).length()))throw new Error('Empty model');
    const names=gltf.animations.map((c,i)=>c.name.trim()||'Animation '+(i+1));
    return names.map((n,i)=>names.indexOf(n)!==names.lastIndexOf(n)?n+' (#'+(i+1)+')':n);
  }finally{releaseModel(gltf.scene);}
}
