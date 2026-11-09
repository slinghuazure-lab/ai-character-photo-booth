import {useEffect,useRef,type RefObject} from 'react';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {eyeRotation,type Point} from './tracking';

export type Cue='photo'|'left'|'right';
type Props={gaze:RefObject<Point>; tracking:boolean; mirror:boolean; cue:{kind:Cue;at:number}; onState:(value:'ready'|'error')=>void};
const modelUrl=import.meta.env.BASE_URL+'models/NTUB_Doctoral_Owl_6_Actions.glb';

function releaseModel(root:THREE.Object3D) {
  const textures=new Set<THREE.Texture>();
  root.traverse(node=>{
    if(!(node instanceof THREE.Mesh))return;
    node.geometry.dispose();
    if(node instanceof THREE.SkinnedMesh)node.skeleton.dispose();
    for(const material of Array.isArray(node.material)?node.material:[node.material]){
      for(const value of Object.values(material))if(value instanceof THREE.Texture)textures.add(value);
      material.dispose();
    }
  });
  for(const texture of textures){
    texture.dispose();
    texture.source.data?.close?.();
  }
}

function bindEye(root:THREE.Object3D,side:'left'|'right') {
  let joint:THREE.Bone|undefined, lid:THREE.Mesh|undefined;
  root.traverse(node=>{
    if(node instanceof THREE.Bone && node.userData.runtime_role==='eye_'+side)joint=node;
    if(node instanceof THREE.Mesh && node.userData.name==='Upper eyelid.'+(side==='left'?'L':'R'))lid=node;
  });
  if(!joint || !lid || !lid.morphTargetInfluences || lid.morphTargetDictionary?.Blink===undefined)
    throw new Error('Missing V15 eye rig: '+side);
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
      const gltf=await new GLTFLoader().loadAsync(modelUrl);
      if(disposed||failed){releaseModel(gltf.scene);return;}
      model=gltf.scene;scene.add(model);
      const eyes=[bindEye(model,'left'),bindEye(model,'right')];
      const animator=new THREE.AnimationMixer(model);mixer=animator;
      const action=(name:string)=>{
        const clip=THREE.AnimationClip.findByName(gltf.animations,name);
        if(!clip)throw new Error('Missing V15 animation: '+name);
        return animator.clipAction(clip);
      };
      const stand=action('Idle_03_Stand_Look').play();
      const pose=action('Gesture_YA').setLoop(THREE.LoopOnce,1);
      pose.clampWhenFinished=true;
      animator.addEventListener('finished',()=>{
        stand.reset().setEffectiveWeight(1).play();pose.crossFadeTo(stand,0.25,false);
      });
      let last=performance.now(), playedAt=-Infinity;
      function draw(now:number){
        const {cue}=live.current;
        if(cue.kind==='photo' && cue.at>playedAt){
          playedAt=cue.at;
          pose.reset().setEffectiveWeight(1).play();
          if(stand.isRunning())stand.crossFadeTo(pose,0.2,false);
        }
        eyes.forEach(eye=>eye.restore());
        animator.update(Math.max(0,(now-last)/1000));last=now;
        eyes.forEach(eye=>eye.apply(live.current,now));
        renderer.render(scene,camera);raf=requestAnimationFrame(draw);
      }
      draw(performance.now());live.current.onState('ready');
    }
    void load().catch(error=>{console.error('V15 model',error);fail();});
    return ()=>{
      disposed=true;cancelAnimationFrame(raf);resize.disconnect();
      mixer?.stopAllAction();
      if(model){mixer?.uncacheRoot(model);releaseModel(model);}
      renderer.domElement.removeEventListener('webglcontextlost',fail);
      renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();
    };
  },[]);
  return <div className="character" ref={mount} aria-hidden="true"/>;
}
