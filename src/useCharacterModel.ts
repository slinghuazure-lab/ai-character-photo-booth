import {useEffect,useRef,useState} from 'react';
import {builtinCatalog,loadAnimations,type AnimationSet,type ClipOption} from './animationSettings';
import {readAsset,saveAsset,type SavedAsset} from './modelStorage';

const builtinHash='8bb16597b84de722bc202d0e4a8d622ae4777c8e4ce4015cf4bda5622ac697c7';
type ActiveModel={source:string|null;name:string;key:string;catalog:ClipOption[];slots:AnimationSet};
function builtin():ActiveModel{
  return {source:null,name:'NTUB V15R5 · 10 Actions',key:'ntub-visitor-animations-v1',catalog:builtinCatalog,slots:loadAnimations()};
}
function imported(asset:SavedAsset):ActiveModel{
  const catalog=asset.names.map((label,i)=>({id:'clip/'+i,label}));
  const slots=(start:number)=>Array.from({length:3},(_,i)=>catalog[(start+i)%catalog.length].id);
  const fallback={idle:slots(0),hello:catalog[0].id,photo:slots(3)};
  const key='ntub-glb-slots-'+asset.hash;
  return {source:URL.createObjectURL(asset.file),key,name:asset.name,catalog,slots:loadAnimations(key,catalog,fallback)};
}
export function useCharacterModel(){
  const [model,setModel]=useState(builtin),[busy,setBusy]=useState(false);
  const [error,setError]=useState<'invalid'|'store'|'none'|null>(null);
  const generation=useRef(0);
  useEffect(()=>{
    const token=++generation.current;
    void readAsset().then(asset=>{if(asset&&asset.hash!==builtinHash&&token===generation.current)setModel(imported(asset));}).catch(()=>{});
    return ()=>{generation.current++;};
  },[]);
  useEffect(()=>()=>{if(model.source)URL.revokeObjectURL(model.source);},[model.source]);
  async function choose(file:File|null){
    if(busy)return;
    const token=++generation.current;
    setBusy(true);setError(null);
    try{
      let next:SavedAsset|null=null;
      if(file){
        const bytes=await file.arrayBuffer();
        const digest=await crypto.subtle.digest('SHA-256',bytes);
        const hash=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
        if(hash!==builtinHash){
          const {inspectGlb}=await import('./modelImport');
          const names=await inspectGlb(bytes);
          if(!names.length){setError('none');return;}
          next={file,name:file.name,hash,names};
        }
      }
      if(token!==generation.current)return;
      try{await saveAsset(next);}catch{setError('store');return;}
      if(token===generation.current)setModel(next?imported(next):builtin());
    }catch{if(token===generation.current)setError('invalid');}
    finally{if(token===generation.current)setBusy(false);}
  }
  function setSlots(slots:AnimationSet){
    setModel({...model,slots});
    try{localStorage.setItem(model.key,JSON.stringify(slots));}catch{setError('store');}
  }
  return {model,busy,error,choose,setSlots};
}
