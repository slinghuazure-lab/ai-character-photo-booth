import {useEffect,useRef,useState,type RefObject} from 'react';
import type {ImageSegmenter,PoseLandmarker} from '@mediapipe/tasks-vision';
import {VisitorFlow,type Point,type VisitorPhase} from './visitorFlow';
import {matchSubjects,SeparationError} from './participantMatte';
import type {AnimationSet,Clip} from './animationSettings';
import type {FaceBox} from './matte';
import type {ShotRequest,CharacterPainter} from './PhotoPanel';
import {composePhoto} from './photo';

import {newPhotoRecord} from './photoRecord';
import {writeRecord} from './photoHistoryStore';
export type Observation=(boxes:FaceBox[],thumbs:Point[]|null,now:number)=>void;
type Options={assetKey:string;active:boolean;animations:AnimationSet;mirror:boolean;ready:boolean;request:ShotRequest;painter:CharacterPainter;
  observe:RefObject<Observation|null>;captureLock:RefObject<FaceBox[]|null>;sound:()=>void;plate:ImageData|null};
type View={photoSecond:number;phase:VisitorPhase;participants:number;seconds:number;reposition:boolean;clip:Clip;separate:boolean;qr:string;link:string;photo:string;error:string};
const initial:View={photoSecond:1,phase:'idle',participants:0,seconds:0,reposition:false,clip:'Idle_03_Stand_Look',separate:false,qr:'',link:'',photo:'',error:''};
export function useVisitor(options:Options){
  const live=useRef(options);
  live.current=options;
  const [view,setView]=useState<View>(initial);
  const reset=useRef<()=>void>(()=>{});
  useEffect(()=>{
    if(!options.active){setView(initial);return;}
    const flow=new VisitorFlow();
    const controller=new AbortController();
    let ended=false,cycle=0,shotPending=false,qrUntil=0,idleAt=performance.now(),idleSlot=Math.floor(Math.random()*3);
    let clip:Clip=live.current.animations.idle[idleSlot], segmenter:ImageSegmenter|undefined,pose:PoseLandmarker|undefined;
    let requestedAt=0,photoSecond=1;
    let photo='',qr='',link='',error='',lastKey='';
    const publish=(now:number)=>{
      options.captureLock.current=flow.phase==='countdown'?flow.people:
        ['processing','qr','error'].includes(flow.phase)?[]:null;
      const seconds=flow.phase==='hello'?flow.inviteSeconds:flow.phase==='countdown'?Math.max(1,Math.ceil((flow.deadline-now)/1000)):
        flow.phase==='qr'?Math.max(1,Math.ceil((qrUntil-now)/1000)):0;
      const participants=flow.participants.size;
      const key=[flow.phase,participants,seconds,clip,flow.reposition,flow.separate,qr,error].join('|');
      if(key!==lastKey && !ended){lastKey=key;setView({photoSecond,phase:flow.phase,participants,seconds,clip,reposition:flow.reposition,separate:flow.separate,qr,link,photo,error});}
    };
    function resetFlow(){
      cycle++;shotPending=false;options.request.current=null;
      if(photo)URL.revokeObjectURL(photo);
      photo='';qr='';link='';error='';flow.reset();
      idleAt=performance.now();clip=live.current.animations.idle[idleSlot];publish(idleAt);
    }
    reset.current=resetFlow;
    const tasks=async()=>{
      const {FilesetResolver,ImageSegmenter,PoseLandmarker}=await import('@mediapipe/tasks-vision');
      const files=await FilesetResolver.forVisionTasks(import.meta.env.BASE_URL+'wasm');
      if(ended)return;
      segmenter=await ImageSegmenter.createFromOptions(files,{baseOptions:{modelAssetPath:import.meta.env.BASE_URL+'models/selfie_multiclass.tflite'},runningMode:'IMAGE',outputConfidenceMasks:true});
      if(ended){segmenter.close();return;}
      pose=await PoseLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:import.meta.env.BASE_URL+'models/pose_landmarker_lite.task'},runningMode:'IMAGE',numPoses:6,outputSegmentationMasks:true});
      if(ended)pose.close();
    };
    let poseCapacity=6;
    let loading:Promise<void>|null=null;
    function prepare(){
      loading??=tasks().catch(e=>{segmenter?.close();segmenter=undefined;loading=null;throw e;});
      return loading;
    }
    function retrySeparation(reason='separation'){
      flow.regroup(performance.now());
      if(flow.phase==='error')error=reason;
    }
    async function capture(frame:HTMLCanvasElement|null){
      const token=cycle,valid=()=>!ended&&cycle===token;
      shotPending=false;
      if(flow.phase!=='countdown')return;
      if(!frame||!flow.canCapture()){
        if(performance.now()-flow.deadline<2000)return;
        retrySeparation('tracking');publish(performance.now());return;
      }
      const people=flow.people,selected=flow.selected;
      const taken=Date.now();live.current.sound();
      flow.phase='processing';publish(performance.now());
      let record:ReturnType<typeof newPhotoRecord>|undefined;
      let stage='model';
      try{
        await prepare();
        if(!valid())return;
        if(!pose||!segmenter||!live.current.painter.current)throw Error('Models unavailable');
        if(people.length>=poseCapacity){
          poseCapacity=people.length+1;await pose.setOptions({numPoses:poseCapacity});
          if(!valid())return;
        }
        const subjects=matchSubjects(frame,people,new Set(selected.map(p=>p.id)),pose);
        stage='compose';
        const blob=await composePhoto(frame,selected,live.current.mirror,segmenter,live.current.painter.current,live.current.plate,subjects);
        if(!valid())return;
        photo=URL.createObjectURL(blob);
        record=newPhotoRecord(selected.length,taken);writeRecord(record);
        stage='upload';
        const {sharePng}=await import('./sharePng');
        if(!valid())return;
        const signed=await sharePng(photo,record.id,controller.signal);
        if(!valid())return;
        stage='qr';
        const qrCode=await import('qrcode');
        const image=await qrCode.toDataURL(signed,{width:420,margin:4,errorCorrectionLevel:'M'});
        if(!valid())return;
        writeRecord({...record,shareStatus:'shared'});
        qr=image;link=signed;flow.phase='qr';qrUntil=performance.now()+10_000;
      }catch(e){
        if(!valid())return;
        if(e instanceof SeparationError){retrySeparation(e.reason==='pose'?'pose':'separation');}
        else{console.error('Exhibit capture failed during '+stage,e);if(record)writeRecord({...record,shareStatus:'failed'});flow.phase='error';error=stage;}
      }
      publish(performance.now());
    }
    options.observe.current=(boxes,thumbs,now)=>{
      if(document.hidden)return;
      const before=flow.phase;
      flow.step(boxes,live.current.ready?thumbs:null,now);
      if(flow.phase==='countdown' && before!=='countdown'){
        photoSecond=Math.random()<0.5?1:2;
        const list=live.current.animations.photo;clip=list[Math.floor(Math.random()*list.length)];
      }else if(flow.phase==='hello'||flow.phase==='invite')clip=live.current.animations.hello;
      if(flow.phase==='hello' && before==='idle')void prepare().catch(()=>{});
      if(flow.phase==='idle' && before!=='idle'){idleAt=now;clip=live.current.animations.idle[idleSlot];}
      publish(now);
    };
    const interval=window.setInterval(()=>{
      const now=performance.now();
      if(flow.expireInvitation(now))idleAt=now;
      if(flow.phase==='idle'){
        if(now-idleAt>=300000){idleSlot=(idleSlot+1)%3;idleAt=now;}
        clip=live.current.animations.idle[idleSlot];
      }
      if(flow.phase==='countdown' && now>=flow.deadline && !shotPending){
        requestedAt=now;shotPending=true;options.request.current=frame=>{void capture(frame);};
      }
      if(shotPending && flow.phase!=='countdown'){options.request.current=null;shotPending=false;}
      if(shotPending && now-requestedAt>2500){options.request.current=null;shotPending=false;if(flow.phase==='countdown'){flow.phase='error';error='camera';}}
      if(flow.phase==='qr' && now>=qrUntil)resetFlow();
      publish(now);
    },100);
    const hide=()=>{if(document.hidden)resetFlow();};
    document.addEventListener('visibilitychange',hide);
    return ()=>{
      options.captureLock.current=null;ended=true;cycle++;controller.abort();window.clearInterval(interval);
      document.removeEventListener('visibilitychange',hide);options.observe.current=null;
      options.request.current=null;segmenter?.close();pose?.close();if(photo)URL.revokeObjectURL(photo);
    };
  },[options.active,options.observe,options.request,options.assetKey]);
  return {view,reset:()=>reset.current()};
}
