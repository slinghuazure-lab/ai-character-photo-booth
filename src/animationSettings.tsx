import type {Language} from './i18n';
export const clips=['Idle_01_Read_Kick','Idle_02_Think','Idle_03_Stand_Look','Gesture_Wave','Dance_01','Gesture_Heart','Gesture_YA','Gesture_Heart_Face','Gesture_ThankYou','Gesture_ThumbsUp'] as const;
export type Clip=string;
export type ClipOption={id:string;label:string};
export const builtinCatalog:ClipOption[]=clips.map(id=>({id,label:id}));
export type AnimationSet={idle:Clip[];hello:Clip;photo:Clip[]};
export const animationDefaults:AnimationSet={idle:clips.slice(0,3),hello:'Gesture_Wave',photo:clips.slice(4,7)};

export function loadAnimations(key='ntub-visitor-animations-v1',catalog=builtinCatalog,fallback=animationDefaults):AnimationSet{
  try{const a=JSON.parse(localStorage.getItem(key)??'null');
    if(a && catalog===builtinCatalog){
      const migrate=(clip:string)=>clip==='Hello'?'Gesture_Wave':clip;
      a.hello=migrate(a.hello);
      if(Array.isArray(a.idle))a.idle=a.idle.map(migrate);
      if(Array.isArray(a.photo))a.photo=a.photo.map(migrate);
    }
    if([a.idle,a.photo].every(group=>Array.isArray(group)&&group.length===3&&group.every(c=>catalog.some(o=>o.id===c)))&&catalog.some(o=>o.id===a.hello))return a;
  }catch{/* Use authored defaults. */}return fallback;
}
const names={'zh-TW':['閱讀踢腳','思考','站立張望','揮手問好','跳舞','比愛心','比 YA','臉旁愛心','致謝','比讚'],en:['Reading','Thinking','Standing','Hello wave','Dance','Heart','Peace','Face heart','Thank you','Thumbs up'],ja:['読書','考える','見回す','手を振る','ダンス','ハート','ピース','顔の横でハート','感謝','サムズアップ']};
type Props={value:AnimationSet;onChange:(v:AnimationSet)=>void;language:Language;catalog:ClipOption[];name:string;custom:boolean;busy:boolean;error:'invalid'|'none'|'store'|null;choose:(f:File|null)=>void};
export function AnimationSettings({value,onChange,language,catalog,name,custom,busy,error,choose}:Props){
 const t={'zh-TW':['角色動畫設定','待機','問好','拍照','匯入 GLB 角色','還原內建小菁鷹','正在讀取模型…','請選擇含內嵌資源、可載入的 GLB 2.0 檔案。','這個模型沒有動畫片段。','無法儲存角色設定，請檢查瀏覽器儲存空間。'],en:['Character animations','Idle','Hello','Photo','Import GLB character','Restore built-in owl','Loading model…','Choose a supported self-contained GLB 2.0 file.','This model has no animation clips.','Unable to save model settings. Check browser storage.'],ja:['キャラクター設定','待機','挨拶','撮影','GLBを読み込む','標準キャラクターに戻す','読込中…','内蔵素材のGLB 2.0を選んでください。','アニメーションがありません。','ブラウザ保存容量を確認してください。']}[language];
 return <details className="panel"><summary>{t[0]}</summary>
   <p>{name}</p><label>{t[4]}<input type="file" accept=".glb,model/gltf-binary" disabled={busy} onChange={e=>{
     const f=e.target.files?.[0];e.target.value='';if(f)choose(f);
   }}/></label>
   {custom&&<button className="subtle-button" disabled={busy} onClick={()=>choose(null)}>{t[5]}</button>}
   {busy&&<p role="status">{t[6]}</p>}{error&&<p role="alert">{t[error==='invalid'?7:error==='none'?8:9]}</p>}
   {(['idle','hello','photo'] as const).map((group,g)=>{
     const chosen=group==='hello'?[value.hello]:value[group];
     return chosen.map((clip,i)=><label key={group+i}>{t[g+1]} {group==='hello'?'':i+1}<select disabled={busy} value={clip} onChange={e=>{
       const choice=e.target.value;onChange({...value,[group]:group==='hello'?choice:chosen.map((c,j)=>i===j?choice:c)});
     }}>{catalog.map((c,j)=><option key={c.id} value={c.id}>{custom?c.label:names[language][j]}</option>)}</select></label>);
   })}</details>;
}
