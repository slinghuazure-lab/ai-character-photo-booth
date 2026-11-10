import {useEffect,useRef,useState,type RefObject} from 'react';
import type {ImageSegmenter} from '@mediapipe/tasks-vision';
import type {Language} from './i18n';
import {composePhoto} from './photo';

import type {FaceBox} from './matte';
export type ShotRequest=RefObject<((frame:HTMLCanvasElement|null,faces:FaceBox[])=>void)|null>;
export type CharacterPainter=RefObject<((ctx:CanvasRenderingContext2D)=>void)|null>;
const words={
 'zh-TW':['拍攝合照','準備去背模型…','合成中…','合成失敗，請重試','重新載入去背模型','下載 PNG','合照預覽','請確認所有人仍已同意','記錄空景（選用）','請離開畫面並保持椅子不動','清除空景','取消記錄'],
 en:['Take group photo','Loading segmentation…','Composing…','Could not compose photo. Try again.','Reload segmentation model','Download PNG','Photo preview','Check that everyone still consents','Record empty scene (optional)','Step out and keep the chair still','Clear reference','Cancel recording'],
 ja:['合成写真を撮る','背景除去モデルを読み込み中…','合成中…','合成に失敗しました。再試行してください','モデルを再読み込み','PNGをダウンロード','写真プレビュー','全員の同意を確認してください','無人の背景を記録（任意）','椅子を動かさず画面から離れてください','背景記録を消去','記録をキャンセル']
};
export default function PhotoPanel({language,ready,request,painter,mirror,video,empty}:{
  language:Language;ready:boolean;request:ShotRequest;painter:CharacterPainter;mirror:boolean;video:RefObject<HTMLVideoElement|null>;empty:boolean;
}){
  const t=words[language], model=useRef<ImageSegmenter|null>(null);
  const [status,setStatus]=useState<'loading'|'ready'|'error'>('loading');
  const [retry,setRetry]=useState(0),[busy,setBusy]=useState(false);
  const [error,setError]=useState<number|null>(null),[url,setUrl]=useState('');
  const generation=useRef(0);
  const [plate,setPlate]=useState<ImageData|null>(null);
  const [recording,setRecording]=useState(false);
  useEffect(()=>{
    if(!recording || !empty)return;
    const id=window.setTimeout(()=>{
      const source=video.current;
      if(!source || source.readyState<2 || source.paused)return;
      const canvas=document.createElement('canvas');
      canvas.width=source.videoWidth;canvas.height=source.videoHeight;
      const ctx=canvas.getContext('2d');
      if(!ctx)return;
      ctx.drawImage(source,0,0);
      setPlate(ctx.getImageData(0,0,canvas.width,canvas.height));setRecording(false);
    },1500);
    return ()=>window.clearTimeout(id);
  },[recording,empty,video]);
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
    if(recording||!ready||busy||request.current||!model.current)return;
    const epoch=generation.current;
    setBusy(true);setError(null);setUrl('');
    request.current=(frame,faces)=>{
      const task=model.current,paint=painter.current;
      if(!frame||!paint||!task){setError(7);setBusy(false);return;}
      void composePhoto(frame,faces,mirror,task,paint,plate).then(blob=>{
        if(generation.current===epoch)setUrl(URL.createObjectURL(blob));
      }).catch(()=>{if(generation.current===epoch)setError(3);})
        .finally(()=>{if(generation.current===epoch)setBusy(false);});
    };
  }
  return <section className="photo-panel">
    {status==='error'?<button className="subtle-button" onClick={()=>setRetry(n=>n+1)}>{t[4]}</button>:
      <button className="primary-button" disabled={recording||status!=='ready'||!ready||busy} onClick={shoot}>{status==='loading'?t[1]:busy?t[2]:t[0]}</button>}
    <button className="subtle-button" disabled={busy} onClick={()=>{
      if(plate)setPlate(null);else setRecording(!recording);
    }}>{plate?t[10]:recording?t[11]:t[8]}</button>
    {recording&&<span role="status">{t[9]}</span>}
    {error!==null&&<span role="alert">{t[error]}</span>}
    {url&&<figure><img src={url} alt={t[6]}/><figcaption><a href={url} download="NTUB-1920x1080.png">{t[5]} · 1920 × 1080</a></figcaption></figure>}
  </section>;
}
