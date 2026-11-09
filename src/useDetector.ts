import {useEffect,useRef,useState,type RefObject} from 'react';
import {TargetTracker} from './tracking';

const initial={state:'off', count:0, tracking:false, hz:0, ms:0, point:{x:0.5,y:0.5}, detail:''} as const;
type Stats={state:'off'|'loading'|'running'|'error'; count:number; tracking:boolean; hz:number; ms:number; point:{x:number;y:number};detail:string};
export function useDetector(active:boolean, video:RefObject<HTMLVideoElement|null>) {
  const [stats,setStats]=useState<Stats>(initial);
  const gaze=useRef<{x:number;y:number}>({...initial.point});
  useEffect(()=>{
    let disposed=false, raf=0;
    let detector:import('@mediapipe/tasks-vision').FaceDetector|undefined;
    const tracker=new TargetTracker();
    gaze.current=initial.point;
    setStats({...initial,state:active?'loading':'off'});
    if(!active) return;
    function fail(error:unknown) {
      if(disposed) return;
      detector?.close(); detector=undefined;
      gaze.current=initial.point;
      setStats({...initial,state:'error',detail:String(error)});
    }
    async function start() {
      const {FaceDetector,FilesetResolver}=await import('@mediapipe/tasks-vision');
      const base=import.meta.env.BASE_URL;
      const files=await FilesetResolver.forVisionTasks(base+'wasm');
      if(disposed) return;
      const task=await FaceDetector.createFromOptions(files,{baseOptions:{
        modelAssetPath:base+'models/blaze_face_short_range.tflite'
      },runningMode:'VIDEO',minDetectionConfidence:0.5});
      if(disposed) {task.close();return;}
      detector=task;
      setStats({...initial,state:'running'});
      let last=-Infinity, videoTime=-1, frames=0, windowStart=performance.now(), hz=0;
      const tick=(now:number)=>{
        const el=video.current;
        if(el && el.readyState>=2 && el.videoWidth && now-last>=83 && el.currentTime!==videoTime) {
          try {
            last=now; videoTime=el.currentTime;
            const start=performance.now();
            const result=task.detectForVideo(el,now);
            const ms=Math.round(performance.now()-start);
            const boxes=result.detections.flatMap(d=>d.boundingBox?[d.boundingBox]:[]);
            const frame=tracker.step(boxes,el.videoWidth,el.videoHeight,now);
            frames++;
            if(now-windowStart>=1000) {hz=Math.round(frames*1000/(now-windowStart)); frames=0;windowStart=now;}
            gaze.current=frame.point;
            setStats({...frame,state:'running',ms,hz,detail:''});
          } catch(error) {fail(error);return;}
        }
        raf=requestAnimationFrame(tick);
      };
      raf=requestAnimationFrame(tick);
    }
    void start().catch(fail);
    return ()=>{disposed=true;cancelAnimationFrame(raf);detector?.close();};
  },[active,video]);
  return {stats,gaze};
}
