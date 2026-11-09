import {useEffect,useRef,type RefObject} from 'react';
import * as THREE from 'three';
import {eyeRotation,type Point} from './tracking';

export type Cue='photo'|'left'|'right';
type Props={gaze:RefObject<Point>; mirror:boolean; cue:{kind:Cue;at:number}; onState:(value:'ready'|'error')=>void};
export default function Character(props:Props) {
  const mount=useRef<HTMLDivElement>(null);
  const live=useRef(props);
  useEffect(()=>{live.current=props;},[props]);
  useEffect(()=>{
    const host=mount.current!;
    let renderer:THREE.WebGLRenderer;
    try {renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});}
    catch {live.current.onState('error');return;}
    host.appendChild(renderer.domElement);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    const scene=new THREE.Scene();
    const camera=new THREE.OrthographicCamera(-1.6,1.6,1.6,-1.6,0.1,20);
    camera.position.z=6;
    const robot=new THREE.Group();
    scene.add(robot,new THREE.HemisphereLight(0xfff5df,0x899cb5,2));
    const light=new THREE.DirectionalLight(0xffffff,2.5);
    light.position.set(2,4,5);scene.add(light);
    const sphere=new THREE.SphereGeometry(1,32,24);
    const materials=new Map<number,THREE.MeshStandardMaterial>();
    function oval(parent:THREE.Object3D,color:number,pos:number[],scale:number[]) {
      if(!materials.has(color)) materials.set(color,new THREE.MeshStandardMaterial({color,roughness:0.4}));
      const mesh=new THREE.Mesh(sphere,materials.get(color));
      mesh.position.set(pos[0],pos[1],pos[2]);mesh.scale.set(scale[0],scale[1],scale[2]);
      parent.add(mesh);return mesh;
    }
    const teal=0x48d6c0, ink=0x163445;
    oval(robot,teal,[0,-0.75,0],[0.58,0.62,0.46]);
    oval(robot,teal,[0,0.17,0],[0.94,0.72,0.61]);
    oval(robot,ink,[0,0.22,0.39],[0.82,0.48,0.3]);
    oval(robot,0xffc358,[0,1.0,0],[0.13,0.22,0.13]);
    const arms=[-1,1].map(side=>oval(robot,teal,[side*0.66,-0.62,0],[0.17,0.38,0.19]));
    // Character's own left is on the viewer's right.
    const eyes=[0.34,-0.34].map(x=>{
      const lid=new THREE.Group(), pivot=new THREE.Group();
      lid.position.set(x,0.27,0.63);robot.add(lid);lid.add(pivot);
      oval(pivot,0xfffaf0,[0,0,0],[0.245,0.25,0.21]);
      oval(pivot,ink,[0,0,0.19],[0.115,0.13,0.05]);
      oval(pivot,0xffffff,[-0.038,0.044,0.235],[0.028,0.028,0.015]);
      return {lid,pivot,x};
    });
    const resize=new ResizeObserver(()=>{
      const w=host.clientWidth,h=host.clientHeight;
      if(!w || !h)return;
      camera.left=-1.6*w/h;camera.right=1.6*w/h;
      camera.updateProjectionMatrix();renderer.setSize(w,h,false);
    });
    resize.observe(host);
    let raf=0;
    function draw(now:number) {
      const {cue,gaze,mirror}=live.current;
      const age=now-cue.at;
      const pose=cue.kind==='photo' && age>=0 && age<1600?Math.sin(Math.PI*age/1600):0;
      robot.position.y=0.04*Math.sin(now/520)+pose*0.10;
      robot.rotation.z=pose*0.14;
      arms[0].rotation.z=-0.25-pose*1.9;arms[1].rotation.z=0.25+pose*1.9;
      eyes.forEach(({lid,pivot,x},i)=>{
        const {yaw,pitch}=eyeRotation(gaze.current,x,mirror);
        pivot.rotation.set(pitch,yaw,0);
        const wink=age>=0 && age<650 && cue.kind===(i===0?'left':'right');
        lid.scale.y=wink?1-0.94*Math.sin(Math.PI*age/650):1;
      });
      renderer.render(scene,camera);
      raf=requestAnimationFrame(draw);
    }
    const lost=(event:Event)=>{event.preventDefault();cancelAnimationFrame(raf);live.current.onState('error');};
    renderer.domElement.addEventListener('webglcontextlost',lost);
    raf=requestAnimationFrame(draw);live.current.onState('ready');
    return ()=>{
      cancelAnimationFrame(raf);resize.disconnect();sphere.dispose();
      materials.forEach(m=>m.dispose());
      renderer.domElement.removeEventListener('webglcontextlost',lost);
      renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();
    };
  },[]);
  return <div className="character" ref={mount} aria-hidden="true"/>;
}
