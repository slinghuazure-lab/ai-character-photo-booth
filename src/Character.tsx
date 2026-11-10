import {useEffect,useRef,type RefObject} from 'react';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {fileLoader,releaseModel} from './modelImport';
import {eyeRotation,type Point} from './tracking';

import type {CharacterPainter} from './PhotoPanel';
import type {Clip} from './animationSettings';
export type Cue='photo'|'left'|'right';
type Props={source:string|null;idle:Clip;pose:Clip;clip?:Clip;painter:CharacterPainter; gaze:RefObject<Point>; tracking:boolean; mirror:boolean; cue:{kind:Cue;at:number}; onState:(value:'ready'|'error')=>void};
const modelUrl=import.meta.env.BASE_URL+'models/NTUB_Doctoral_Owl_6_Actions.glb';

function bindEye(root:THREE.Object3D,side:'left'|'right') {
  let joint:THREE.Bone|undefined, lid:THREE.Mesh|undefined;
  root.traverse(node=>{
    if(node instanceof THREE.Bone && node.userData.runtime_role==='eye_'+side)joint=node;
    if(node instanceof THREE.Mesh && node.userData.name==='Upper eyelid.'+(side==='left'?'L':'R'))lid=node;
  });
  if(!joint || !lid || !lid.morphTargetInfluences || lid.morphTargetDictionary?.Blink===undefined)
    return null;
  const bone=joint, rest=bone.quaternion.clone(), animated=rest.clone();
  const weights=lid.morphTargetInfluences, blink=lid.morphTargetDictionary.Blink;
  const up=new THREE.Vector3().fromArray(bone.userData.local_up_axis).normalize();
  const pitchAxis=new THREE.Vector3().fromArray(bone.userData.local_forward_axis).cross(up).normalize();
  const rotation=new THREE.Quaternion();
  let authoredBlink=weights[blink];
  return {
    restore(){bone.quaternion.copy(animated);weights[blink]=authoredBlink;},
    apply(props:Props,now:number){
      animated.copy(bone.quaternion);authoredBlink=weights[blink];
      if(props.tracking){
        const {yaw,pitch}=eyeRotation(props.gaze.current,side==='left'?0.34:-0.34,props.mirror);
        bone.quaternion.copy(rest)
          .multiply(rotation.setFromAxisAngle(up,THREE.MathUtils.clamp(yaw,-0.244,0.244)))
          .multiply(rotation.setFromAxisAngle(pitchAxis,THREE.MathUtils.clamp(-pitch,-0.192,0.192)));
      }
      const age=now-props.cue.at;
      if(props.cue.kind===side && age>=0 && age<650)
        weights[blink]=Math.max(authoredBlink,Math.sin(Math.PI*age/650));
    }
  };
}

export default function Character(props:Props) {
  const mount=useRef<HTMLDivElement>(null), live=useRef(props);
  useEffect(()=>{live.current=props;},[props]);
  useEffect(()=>{
    const host=mount.current!;
    let renderer:THREE.WebGLRenderer;
    try {renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});}
    catch {live.current.onState('error');return;}
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    host.appendChild(renderer.domElement);
    const scene=new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xfffaf0,0xa4a7bb,2));
    const light=new THREE.DirectionalLight(0xffffff,2);
    light.position.set(2,5,6);scene.add(light);
    const camera=new THREE.OrthographicCamera(-3,3,2.6,-2.6,0.1,30);
    camera.position.set(0,2.26,9);
    function fit(){
      const w=host.clientWidth,h=host.clientHeight;
      if(!w||!h)return;
      const height=Math.max(5.2,4.3*h/w);
      camera.top=height/2;camera.bottom=-camera.top;
      camera.right=height*w/h/2;camera.left=-camera.right;
      camera.updateProjectionMatrix();renderer.setSize(w,h,false);
    }
    const resize=new ResizeObserver(fit);
    resize.observe(host);fit();
    let disposed=false, failed=false, raf=0;
    let model:THREE.Object3D|undefined, mixer:THREE.AnimationMixer|undefined;
    const fail=()=>{
      if(disposed)return;
      failed=true;cancelAnimationFrame(raf);live.current.onState('error');
    };
    renderer.domElement.addEventListener('webglcontextlost',fail);
    async function load(){
      const custom=!!props.source;
      const gltf=custom?await fileLoader().loadAsync(props.source!):await new GLTFLoader().loadAsync(modelUrl);
      if(disposed||failed){releaseModel(gltf.scene);return;}
      model=gltf.scene;
      if(custom){
        const wrap=new THREE.Group();wrap.add(model);
        const bounds=new THREE.Box3().setFromObject(model,true),size=bounds.getSize(new THREE.Vector3());
        const scale=Math.min(4.5/Math.max(size.y,.001),4.1/Math.max(size.x,.001),4.1/Math.max(size.z,.001));
        wrap.scale.setScalar(scale);
        const center=bounds.getCenter(new THREE.Vector3());
        wrap.position.set(-center.x*scale,2.26-center.y*scale,-center.z*scale);
        scene.add(wrap);
      }else scene.add(model);
      const eyes=[bindEye(model,'left'),bindEye(model,'right')];
      const animator=new THREE.AnimationMixer(model);mixer=animator;
      const action=(name:string)=>{
        const clip=custom?(gltf.animations[Number(name.split('/')[1])]??gltf.animations[0]):THREE.AnimationClip.findByName(gltf.animations,name);
        if(!clip)throw new Error('Animation unavailable: '+name);
        return animator.clipAction(clip);
      };
      const idle=()=>custom?live.current.idle:'Idle_03_Stand_Look';
      let stand=action(idle()).play();
      let activeClip:Clip|undefined;
      const arm=model.getObjectByProperty('name','upper_armR')??model.getObjectByName('upper_arm.R');
      const animatedArm=new THREE.Quaternion();let waved=false;
      let pose=action(custom?live.current.pose:'Gesture_YA');
      pose.clampWhenFinished=true;
      animator.addEventListener('finished',()=>{
        stand.reset().setLoop(THREE.LoopRepeat,Infinity).setEffectiveWeight(1).play();if(pose!==stand)pose.crossFadeTo(stand,0.25,false);
      });
      let last=performance.now(), playedAt=-Infinity;
      function draw(now:number){
        const {cue}=live.current;
        const clip=live.current.clip??idle();
        if(clip!==activeClip){
          const next=action(!custom&&clip==='Hello'?'Idle_03_Stand_Look':clip);
          next.setLoop(THREE.LoopRepeat,Infinity);
          if(next!==stand){next.reset().setEffectiveWeight(1).play();stand.crossFadeTo(next,0.35,false);stand=next;}
          activeClip=clip;
        }
        if(!live.current.clip && cue.kind==='photo' && cue.at>playedAt){
          playedAt=cue.at;
          pose=action(custom?live.current.pose:'Gesture_YA');pose.clampWhenFinished=true;
          pose.reset().setLoop(THREE.LoopOnce,1).setEffectiveWeight(1).play();
          if(stand!==pose&&stand.isRunning())stand.crossFadeTo(pose,0.2,false);
        }
        eyes.forEach(eye=>eye?.restore());
        if(arm&&waved)arm.quaternion.copy(animatedArm);
        animator.update(Math.max(0,(now-last)/1000));last=now;
        waved=clip==='Hello' && !!arm;
        if(arm&&waved){animatedArm.copy(arm.quaternion);arm.rotateZ(-0.72+0.24*Math.sin(now/160));}
        eyes.forEach(eye=>eye?.apply(live.current,now));
        renderer.render(scene,camera);raf=requestAnimationFrame(draw);
      }
      live.current.painter.current=ctx=>{
        // Render the current pose into the export at its own aspect ratio.
        const width=800,height=780, exportCamera=camera.clone();
        exportCamera.top=2.6;exportCamera.bottom=-2.6;
        exportCamera.right=2.6*width/height;exportCamera.left=-exportCamera.right;
        exportCamera.updateProjectionMatrix();
        try{
          renderer.setSize(width,height,false);
          renderer.render(scene,exportCamera);
          ctx.drawImage(renderer.domElement,0,1080-height,width,height);
        }finally{fit();}
      };
      draw(performance.now());live.current.onState('ready');
    }
    void load().catch(error=>{console.error('V15 model',error);fail();});
    return ()=>{
      live.current.painter.current=null;disposed=true;cancelAnimationFrame(raf);resize.disconnect();
      mixer?.stopAllAction();
      if(model){mixer?.uncacheRoot(model);releaseModel(model);}
      renderer.domElement.removeEventListener('webglcontextlost',fail);
      renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();
    };
  },[props.source]);
  return <div className="character" ref={mount} aria-hidden="true"/>;
}
