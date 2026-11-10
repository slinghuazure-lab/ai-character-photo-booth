import type {Language} from './i18n';
export const clips=['Idle_01_Read_Kick','Idle_02_Think','Idle_03_Stand_Look','Hello','Dance_01','Gesture_Heart','Gesture_YA'] as const;
export type Clip=typeof clips[number];
export type AnimationSet={idle:Clip[];hello:Clip;photo:Clip[]};
export const animationDefaults:AnimationSet={idle:clips.slice(0,3),hello:'Hello',photo:clips.slice(4)};
const key='ntub-visitor-animations-v1';
export function loadAnimations():AnimationSet{
  try{const a=JSON.parse(localStorage.getItem(key)??'null');
    if([a.idle,a.photo].every(group=>Array.isArray(group)&&group.length===3&&new Set(group).size===3&&group.every(c=>clips.includes(c)))&&clips.includes(a.hello))return a;
  }catch{/* Use authored defaults. */}return animationDefaults;
}
const names={'zh-TW':['閱讀踢腳','思考','站立張望','揮手問好','跳舞','比愛心','比 YA'],en:['Reading','Thinking','Standing','Hello wave','Dance','Heart','Peace'],ja:['読書','考える','見回す','手を振る','ダンス','ハート','ピース']};
export function AnimationSettings({value,onChange,language}:{value:AnimationSet;onChange:(v:AnimationSet)=>void;language:Language}){
 const labels={'zh-TW':['角色動畫設定','待機','問好','拍照'],en:['Character animations','Idle','Hello','Photo'],ja:['キャラクター設定','待機','挨拶','撮影']}[language];
 return <details className="panel"><summary>{labels[0]}</summary>{(['idle','hello','photo'] as const).map((group,g)=>{
   const chosen=group==='hello'?[value.hello]:value[group];
   return chosen.map((clip,i)=><label key={group+i}>{labels[g+1]} {group==='hello'?'':i+1}<select value={clip} onChange={e=>{
     const choice=e.target.value as Clip;const v={...value,[group]:group==='hello'?choice:chosen.map((c,j)=>i===j?choice:c)};
     onChange(v);try{localStorage.setItem(key,JSON.stringify(v));}catch{/* session settings remain usable */}
   }}>{clips.map((c,j)=><option key={c} value={c} disabled={chosen.includes(c)&&c!==clip}>{names[language][j]}</option>)}</select></label>);
 })}</details>;
}
