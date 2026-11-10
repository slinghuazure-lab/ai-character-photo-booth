import {useEffect,useRef,useState,type RefObject} from 'react';
import {TargetTracker} from './tracking';

import {ConsentTracker,emptyConsent} from './consent';
import type {ShotRequest} from './PhotoPanel';
type GestureState='off'|'loading'|'running'|'error';
const initial={state:'off', count:0, tracking:false, hz:0, ms:0, point:{x:0.5,y:0.5}, detail:''} as const;
type Stats={state:'off'|'loading'|'running'|'error'; count:number; tracking:boolean; hz:number; ms:number; point:{x:number;y:number};detail:string};
export function useDetector(active:boolean, video:RefObject<HTMLVideoElement|null>,request:ShotRequest) {
  const [stats,setStats]=useState<Stats>(initial);
  const [consent,setConsent]=useState(emptyConsent);
  const [gestureState,setGestureState]=useState<GestureState>('off');
  const gaze=useRef<{x:number;y:number}>({...initial.point});
  useEffect(()=>{
    let disposed=false, raf=0;
    let detector:import('@mediapipe/tasks-vision').FaceDetector|undefined;
    let gesture:import('@mediapipe/tasks-vision').GestureRecognizer|undefined;
    let faceFailed=false;
    const group=new ConsentTracker();
    const tracker=new TargetTracker();
    gaze.current=initial.point;
    setStats({...initial,state:active?'loading':'off'});
    setConsent(emptyConsent);setGestureState(active?'loading':'off');
    if(!active) return;
    function fail(error:unknown) {
      if(disposed) return;
      faceFailed=true;gesture?.close();gesture=undefined;
      setConsent(emptyConsent);setGestureState('off');
      detector?.close(); detector=undefined;
      gaze.current=initial.point;
      setStats({...initial,state:'error',detail:String(error)});
    }
    async function start() {
      const {FaceDetector,FilesetResolver,GestureRecognizer}=await import('@mediapipe/tasks-vision');
      const base=import.meta.env.BASE_URL;
      const files=await FilesetResolver.forVisionTasks(base+'wasm');
      if(disposed) return;
      const task=await FaceDetector.createFromOptions(files,{baseOptions:{
        modelAssetPath:base+'models/blaze_face_short_range.tflite'
      },runningMode:'VIDEO',minDetectionConfidence:0.5});
      if(disposed) {task.close();return;}
      detector=task;
      setStats({...initial,state:'running'});
      void GestureRecognizer.createFromOptions(files,{
        baseOptions:{modelAssetPath:base+'models/gesture_recognizer.task'},
        runningMode:'VIDEO',numHands:10,minHandDetectionConfidence:0.40,
        minHandPresenceConfidence:0.40,minTrackingConfidence:0.45
      }).then(task=>{
        if(disposed || faceFailed){task.close();return;}
        gesture=task;setGestureState('running');
      }).catch(error=>{if(!disposed && !faceFailed){console.error(error);setGestureState('error');}});
      let lastGesture=-Infinity, lastFresh=0;
      let last=-Infinity, videoTime=-1, frames=0, windowStart=performance.now(), hz=0;
      const tick=(now:number)=>{
        const el=video.current;
        if(el && el.readyState>=2 && el.videoWidth && now-last>=83 && el.currentTime!==videoTime) {
          try {
            lastFresh=now;last=now; videoTime=el.currentTime;
            const start=performance.now();
            let still:HTMLCanvasElement|null=null;
            if(request.current && gesture && now-lastGesture>=150){
              still=document.createElement('canvas');still.width=el.videoWidth;still.height=el.videoHeight;
              const ctx=still.getContext('2d');
              if(ctx)ctx.drawImage(el,0,0);else still=null;
            }
            const result=task.detectForVideo(still??el,now);
            const ms=Math.round(performance.now()-start);
            const boxes=result.detections.flatMap(d=>d.boundingBox?[d.boundingBox]:[]);
            const frame=tracker.step(boxes,el.videoWidth,el.videoHeight,now);
            if(gesture && now-lastGesture>=150){
              lastGesture=now;
              try{
                const result=gesture.recognizeForVideo(still??el,now);
                const hands=result.landmarks.flatMap((landmarks,i)=>{
                  const palm=landmarks[9], label=result.gestures[i]?.[0];
                  return palm?[{x:palm.x*el.videoWidth,y:palm.y*el.videoHeight,
                    category:label?.categoryName??'None',score:label?.score??0}]:[];
                });
                const consent=group.step(boxes.map(b=>({x:b.originX+b.width/2,y:b.originY+b.height/2,
                  width:b.width,height:b.height})),hands,now);
                setConsent(consent);
                const capture=request.current;
                if(capture){request.current=null;capture(consent.ready?still:null,boxes);}
              }catch(error){
                console.error(error);gesture.close();gesture=undefined;setConsent(emptyConsent);setGestureState('error');
              }
            }
            frames++;
            if(now-windowStart>=1000) {hz=Math.round(frames*1000/(now-windowStart)); frames=0;windowStart=now;}
            gaze.current=frame.point;
            setStats({...frame,state:'running',ms,hz,detail:''});
          } catch(error) {fail(error);return;}
        }
        if(lastFresh && now-lastFresh>450){
          group.step([],[],now);setConsent(emptyConsent);lastFresh=0;
        }
        raf=requestAnimationFrame(tick);
      };
      raf=requestAnimationFrame(tick);
    }
    void start().catch(fail);
    return ()=>{disposed=true;cancelAnimationFrame(raf);gesture?.close();detector?.close();};
  },[active,video,request]);
  return {stats,gaze,gestureState,consent};
}
