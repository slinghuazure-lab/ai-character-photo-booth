import {useEffect,useRef,useState,type RefObject} from 'react';
import {TargetTracker} from './tracking';

import {ThumbShutter} from './thumbShutter';
import type {ShotRequest} from './PhotoPanel';
import {assessLighting,LightingMonitor,type Lighting} from './lighting';
import {sceneFaces} from './sceneFaces';
import type {Observation} from './useVisitor';
import type {Point} from './visitorFlow';
type GestureState='off'|'loading'|'running'|'error';
const initial={state:'off', count:0, tracking:false, hz:0, ms:0, point:{x:0.5,y:0.5}, detail:''} as const;
type Stats={state:'off'|'loading'|'running'|'error'; count:number; tracking:boolean; hz:number; ms:number; point:{x:number;y:number};detail:string};
export function useDetector(active:boolean, video:RefObject<HTMLVideoElement|null>,request:ShotRequest,observe:RefObject<Observation|null>) {
  const [stats,setStats]=useState<Stats>(initial);
  const [gestureShot,setGestureShot]=useState(0);
  const [gestureState,setGestureState]=useState<GestureState>('off');
  const [lighting,setLighting]=useState<Lighting>('waiting');
  const gaze=useRef<{x:number;y:number}>({...initial.point});
  useEffect(()=>{
    let disposed=false, raf=0;
    let detector:import('@mediapipe/tasks-vision').FaceDetector|undefined;
    let gesture:import('@mediapipe/tasks-vision').GestureRecognizer|undefined;
    let faceFailed=false;
    const shutter=new ThumbShutter();
    const monitor=new LightingMonitor();
    const tile=document.createElement('canvas');
    let lastLight=-Infinity;
    const meter=document.createElement('canvas');meter.width=96;meter.height=64;
    const ctx=meter.getContext('2d',{willReadFrequently:true});
    setLighting('waiting');
    const tracker=new TargetTracker();
    gaze.current=initial.point;
    setStats({...initial,state:active?'loading':'off'});
    setGestureState(active?'loading':'off');
    if(!active) return;
    function fail(error:unknown) {
      if(disposed) return;
      setLighting('waiting');faceFailed=true;gesture?.close();gesture=undefined;
      setGestureState('off');
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
            if(request.current){
              still=document.createElement('canvas');still.width=el.videoWidth;still.height=el.videoHeight;
              const ctx=still.getContext('2d');
              if(ctx)ctx.drawImage(el,0,0);else still=null;
            }
            const boxes=sceneFaces(task,still??el,el.videoWidth,el.videoHeight,now,tile);
            const ms=Math.round(performance.now()-start);

            const frame=tracker.step(boxes,el.videoWidth,el.videoHeight,now);
            let thumbsInFrame:Point[]|null=null;
            if(ctx && now-lastLight>=300){
              lastLight=now;
              let reading=null;
              if(boxes.length){
                ctx.drawImage(el,0,0,meter.width,meter.height);
                reading=assessLighting(ctx.getImageData(0,0,meter.width,meter.height),boxes.map(b=>({
                  originX:b.originX/el.videoWidth,originY:b.originY/el.videoHeight,
                  width:b.width/el.videoWidth,height:b.height/el.videoHeight
                })));
              }
              setLighting(monitor.update(reading,now));
            }
            if(gesture && now-lastGesture>=150){
              lastGesture=now;
              try{
                const result=gesture.recognizeForVideo(still??el,now);
                const thumbs=result.landmarks.flatMap((points,i)=>{
                  const label=result.gestures[i]?.[0];
                  return points[9] && label?.categoryName==='Thumb_Up' && label.score>=0.5?[points[9]]:[];
                });
                thumbsInFrame=thumbs.map(p=>({x:p.x*el.videoWidth,y:p.y*el.videoHeight}));
                if(shutter.step(thumbs,now))setGestureShot(n=>n+1);
              }catch(error){
                console.error(error);gesture.close();gesture=undefined;setGestureState('error');
              }
            }
            observe.current?.(boxes,thumbsInFrame,now);
            if(request.current && still){const capture=request.current;request.current=null;capture(still,boxes);}
            frames++;
            if(now-windowStart>=1000) {hz=Math.round(frames*1000/(now-windowStart)); frames=0;windowStart=now;}
            gaze.current=frame.point;
            setStats({...frame,state:'running',ms,hz,detail:''});
          } catch(error) {fail(error);return;}
        }
        if(lastFresh && now-lastFresh>450){
          observe.current?.([],null,now);setLighting(monitor.update(null,now));shutter.step([],now);lastFresh=0;
        }
        raf=requestAnimationFrame(tick);
      };
      raf=requestAnimationFrame(tick);
    }
    void start().catch(fail);
    return ()=>{disposed=true;cancelAnimationFrame(raf);gesture?.close();detector?.close();};
  },[active,video,request,observe]);
  return {stats,gaze,gestureState,gestureShot,lighting};
}
