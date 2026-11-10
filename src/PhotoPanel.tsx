import {useEffect,useRef,useState,type RefObject} from 'react';
import type {ImageSegmenter} from '@mediapipe/tasks-vision';
import type {Language} from './i18n';
import {composePhoto} from './photo';

import type {FaceBox} from './matte';
export type ShotRequest=RefObject<((frame:HTMLCanvasElement|null,faces:FaceBox[])=>void)|null>;
export type CharacterPainter=RefObject<((ctx:CanvasRenderingContext2D)=>void)|null>;
const words={
 'zh-TW':['拍攝合照','準備去背模型…','合成中…','合成失敗，請重試','重新載入去背模型','下載 PNG','合照預覽','請確認所有人仍已同意'],
 en:['Take group photo','Loading segmentation…','Composing…','Could not compose photo. Try again.','Reload segmentation model','Download PNG','Photo preview','Check that everyone still consents'],
 ja:['合成写真を撮る','背景除去モデルを読み込み中…','合成中…','合成に失敗しました。再試行してください','モデルを再読み込み','PNGをダウンロード','写真プレビュー','全員の同意を確認してください']
};
export default function PhotoPanel({language,ready,request,painter,mirror}:{
  language:Language;ready:boolean;request:ShotRequest;painter:CharacterPainter;mirror:boolean;
}){
  const t=words[language], model=useRef<ImageSegmenter|null>(null);
  const [status,setStatus]=useState<'loading'|'ready'|'error'>('loading');
  const [retry,setRetry]=useState(0),[busy,setBusy]=useState(false);
  const [error,setError]=useState<number|null>(null),[url,setUrl]=useState('');
  const generation=useRef(0);
  useEffect(()=>{
    const epoch=++generation.current;
    setStatus('loading');
    async function load(){
      const {ImageSegmenter,FilesetResolver}=await import('@mediapipe/tasks-vision');
      const files=await FilesetResolver.forVisionTasks(import.meta.env.BASE_URL+'wasm');
      if(generation.current!==epoch)return;
      const task=await ImageSegmenter.createFromOptions(files,{
        baseOptions:{modelAssetPath:import.meta.env.BASE_URL+'models/selfie_multiclass.tflite'},
        runningMode:'IMAGE',outputConfidenceMasks:true,outputCategoryMask:false
      });
      if(generation.current!==epoch){task.close();return;}
      model.current=task;setStatus('ready');
    }
    void load().catch(()=>{if(generation.current===epoch)setStatus('error');});
    return ()=>{generation.current++;request.current=null;model.current?.close();model.current=null;};
  },[retry,request]);
  useEffect(()=>()=>{if(url)URL.revokeObjectURL(url);},[url]);
  useEffect(()=>{
    if(!ready && request.current){request.current=null;setBusy(false);setError(7);}
  },[ready,request]);
  function shoot(){
    if(!ready||busy||request.current||!model.current)return;
    const epoch=generation.current;
    setBusy(true);setError(null);setUrl('');
    request.current=(frame,faces)=>{
      const task=model.current,paint=painter.current;
      if(!frame||!paint||!task){setError(7);setBusy(false);return;}
      void composePhoto(frame,faces,mirror,task,paint).then(blob=>{
        if(generation.current===epoch)setUrl(URL.createObjectURL(blob));
      }).catch(()=>{if(generation.current===epoch)setError(3);})
        .finally(()=>{if(generation.current===epoch)setBusy(false);});
    };
  }
  return <section className="photo-panel">
    {status==='error'?<button className="subtle-button" onClick={()=>setRetry(n=>n+1)}>{t[4]}</button>:
      <button className="primary-button" disabled={status!=='ready'||!ready||busy} onClick={shoot}>{status==='loading'?t[1]:busy?t[2]:t[0]}</button>}
    {error!==null&&<span role="alert">{t[error]}</span>}
    {url&&<figure><img src={url} alt={t[6]}/><figcaption><a href={url} download="NTUB-1920x1080.png">{t[5]} · 1920 × 1080</a></figcaption></figure>}
  </section>;
}
