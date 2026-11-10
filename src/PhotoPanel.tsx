import {useEffect,useRef,useState,type RefObject} from 'react';
import type {ImageSegmenter} from '@mediapipe/tasks-vision';
import type {Language} from './i18n';
import {newPhotoRecord,type PhotoRecord} from './photoRecord';
import {writeRecord} from './photoHistoryStore';
import PhotoShare from './PhotoShare';
import {composePhoto} from './photo';

import type {FaceBox} from './matte';
import type {Lighting} from './lighting';
export type ShotRequest=RefObject<((frame:HTMLCanvasElement|null,faces:FaceBox[])=>void)|null>;
export type CharacterPainter=RefObject<((ctx:CanvasRenderingContext2D)=>void)|null>;
const words={
 'zh-TW':['拍攝合照','準備去背模型…','合成中…','合成失敗，請重試','重新載入去背模型','下載 PNG','合照預覽','請確認所有人仍已同意','記錄空景（選用）','請離開畫面並保持椅子不動','清除空景','取消記錄'],
 en:['Take group photo','Loading segmentation…','Composing…','Could not compose photo. Try again.','Reload segmentation model','Download PNG','Photo preview','Check that everyone still consents','Record empty scene (optional)','Step out and keep the chair still','Clear reference','Cancel recording'],
 ja:['合成写真を撮る','背景除去モデルを読み込み中…','合成中…','合成に失敗しました。再試行してください','モデルを再読み込み','PNGをダウンロード','写真プレビュー','全員の同意を確認してください','無人の背景を記録（任意）','椅子を動かさず画面から離れてください','背景記録を消去','記録をキャンセル']
};
const staffCopy={
 'zh-TW':{waiting:'請站到拍攝位置，面向鏡頭',checking:'正在檢查臉部光線…',ok:'臉部光線可用',dark:'臉部持續偏暗，請增加正面柔光或靠近光源',backlit:'臉部逆光，請轉向光源或將亮窗移出身後',trial:'設定拍攝環境',again:'重新設定場地',saved:'此裝置已完成場地設定',cancel:'取消設定',guide:'站在訪客位置，比讚 1 秒後試拍。查看眼睛、兩側臉頰與衣領邊緣。',take:'拍一張試拍照',done:'確認試拍並完成設定',review:'試拍預覽：檢查臉部明暗與去背邊緣，可調整光源後再試拍。'},
 en:{waiting:'Stand at the photo position and face the camera',checking:'Checking face lighting…',ok:'Face lighting looks usable',dark:'Face remains dark. Add soft front light or move closer to a light.',backlit:'Backlit face. Turn toward the light or move the bright window out of the background.',trial:'Set up venue',again:'Set up a new venue',saved:'Venue setup completed on this device',cancel:'Cancel setup',guide:'Stand in the visitor spot and give a thumbs-up for one second. Check eyes, cheeks and collar edges.',take:'Take test shot',done:'Accept test and finish setup',review:'Test preview: inspect lighting and cutout edges. Adjust and retake as needed.'},
 ja:{waiting:'撮影位置でカメラに顔を向けてください',checking:'顔の明るさを確認中…',ok:'顔の明るさは良好です',dark:'顔が暗い状態です。正面から柔らかい光を足してください',backlit:'逆光です。光の方を向くか、明るい窓を背にしない位置に移動してください',trial:'会場を設定',again:'会場を再設定',saved:'この端末の会場設定は完了しました',cancel:'設定をキャンセル',guide:'撮影位置で親指を1秒間立ててください。目、両頬、襟の輪郭を確認します。',take:'テスト写真を撮る',done:'写真を確認して設定完了',review:'テスト写真で顔の明るさと輪郭を確認し、照明を調整して再撮影できます。'}
};
export default function PhotoPanel({lighting,language,ready,request,painter,mirror,video,empty}:{
  lighting:Lighting;language:Language;ready:boolean;request:ShotRequest;painter:CharacterPainter;mirror:boolean;video:RefObject<HTMLVideoElement|null>;empty:boolean;
}){
  const t=words[language], model=useRef<ImageSegmenter|null>(null);
  const [status,setStatus]=useState<'loading'|'ready'|'error'>('loading');
  const [retry,setRetry]=useState(0),[busy,setBusy]=useState(false);
  const [error,setError]=useState<number|null>(null),[url,setUrl]=useState('');
  const [record,setRecord]=useState<PhotoRecord|null>(null);
  const [trial,setTrial]=useState(false);
  const venueKey='ntub-photo-venue-setup-v1';
  const [configured,setConfigured]=useState(()=>{
    try{return localStorage.getItem(venueKey)==='done';}catch{return false;}
  });
  function finishSetup(){
    if(!trial||!url||busy)return;
    setConfigured(true);setTrial(false);setUrl('');
    try{localStorage.setItem(venueKey,'done');}catch{/* Available for this session only. */}
  }
  const staff=staffCopy[language];
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
      const capturedAt=Date.now();
      void composePhoto(frame,faces,mirror,task,paint,plate).then(blob=>{
        if(generation.current!==epoch)return;
        setUrl(URL.createObjectURL(blob));
        if(!trial){
          const photo=newPhotoRecord(faces.length,capturedAt);
          setRecord(photo);writeRecord(photo);
        }
      }).catch(()=>{if(generation.current===epoch)setError(3);})
        .finally(()=>{if(generation.current===epoch)setBusy(false);});
    };
  }
  return <section className="photo-panel">
    {(trial||lighting==='dark'||lighting==='backlit')&&<p className="lighting-status" data-light={lighting} role="status">{staff[lighting]}</p>}
    {!trial&&configured&&<small>{staff.saved}</small>}
    <button className="subtle-button" disabled={busy} aria-pressed={trial} onClick={()=>{setUrl('');setError(null);setTrial(!trial);}}>{trial?staff.cancel:configured?staff.again:staff.trial}</button>
    {trial&&<p>{staff.guide}</p>}
    {trial&&url&&<button className="subtle-button" disabled={busy} onClick={finishSetup}>{staff.done}</button>}
    {status==='error'?<button className="subtle-button" onClick={()=>setRetry(n=>n+1)}>{t[4]}</button>:
      <button className="primary-button" disabled={recording||status!=='ready'||!ready||busy} onClick={shoot}>{status==='loading'?t[1]:busy?t[2]:trial?staff.take:t[0]}</button>}
    <button className="subtle-button" disabled={busy} onClick={()=>{
      if(plate)setPlate(null);else setRecording(!recording);
    }}>{plate?t[10]:recording?t[11]:t[8]}</button>
    {recording&&<span role="status">{t[9]}</span>}
    {error!==null&&<span role="alert">{t[error]}</span>}
    {url&&<figure><img src={url} alt={t[6]}/><figcaption>{trial&&<p>{staff.review}</p>}<a href={url} download={trial?"NTUB-test-1920x1080.png":"NTUB-1920x1080.png"}>{t[5]} · 1920 × 1080</a>{!trial&&record&&<PhotoShare key={url} url={url} language={language} record={record}/>}</figcaption></figure>}
  </section>;
}
