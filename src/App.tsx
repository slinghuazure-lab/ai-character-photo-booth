import BackgroundSettings from './BackgroundSettings';
import {Component,lazy,Suspense,type ReactNode,useCallback,useEffect,useRef,useState} from 'react';
import {Camera,CameraOff,Settings2,Activity,Maximize,Minimize,ShieldCheck,Monitor,RotateCcw} from 'lucide-react';
import {cameraSupported,cameraErrorMessage,getCameraInfo,listCameras,startCamera,stopCamera,type CameraDevice,type CameraInfo,type Resolution} from './camera';
import {loadSettings,saveSettings,defaults,type ExhibitSettings} from './settings';
import {t,type MessageKey} from './i18n';

import {AnimationSettings} from './animationSettings';
import {useCharacterModel} from './useCharacterModel';
import {useVisitor,type Observation} from './useVisitor';
import {VisitorOverlay,visitorText} from './VisitorOverlay';
import PhotoHistory from './PhotoHistory';
import PhotoPanel,{type CharacterPainter,type ShotRequest} from './PhotoPanel';
import {useDetector} from './useDetector';
import {exhibitLabels} from './exhibitLabels';
import type {Cue} from './Character';
const Character=lazy(()=>import('./Character'));
class CharacterBoundary extends Component<{children:ReactNode;onError:()=>void},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(){this.props.onError();}
  render(){return this.state.failed?null:this.props.children;}
}
type Status='ready'|'loading'|'active'|'error';
export default function App(){
  const [settings,setSettings]=useState<ExhibitSettings>(loadSettings);
  const [devices,setDevices]=useState<CameraDevice[]>([]);
  const [status,setStatus]=useState<Status>('ready');
  const [error,setError]=useState<MessageKey|null>(null);
  const [info,setInfo]=useState<CameraInfo|null>(null);
  const [fps,setFps]=useState(0);
  const [viewport,setViewport]=useState(`${window.innerWidth} × ${window.innerHeight}`);
  const stagePanel=useRef<HTMLElement>(null);
  const [fullscreen,setFullscreen]=useState(false);
  const videoRef=useRef<HTMLVideoElement>(null);
  const request:ShotRequest=useRef(null);
  const painter:CharacterPainter=useRef(null);
  const captureLock=useRef<import("./matte").FaceBox[]|null>(null);
  const observe=useRef<Observation|null>(null);
  const character=useCharacterModel();
  const animations=character.model.slots;
  const [staff,setStaff]=useState(false);
  const [inspectCamera,setInspectCamera]=useState(false);
  const [plate,setPlate]=useState<ImageData|null>(null);
  const audio=useRef<AudioContext|null>(null);
  const shutterSound=()=>{
    const ctx=audio.current;if(!ctx||ctx.state!=='running')return;
    const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.12),ctx.sampleRate);
    const data=buffer.getChannelData(0);
    for(let i=0;i<data.length;i++){const time=i/ctx.sampleRate;data[i]=(Math.random()*2-1)*.42*(Math.exp(-time*85)+(time>.05?Math.exp(-(time-.05)*95)*.65:0));}
    const source=ctx.createBufferSource();source.buffer=buffer;source.connect(ctx.destination);source.start();
  };
  const {stats,gaze,gestureState,gestureShot,lighting}=useDetector(status==='active',videoRef,request,observe,captureLock);
  const labels=exhibitLabels(settings.language);
  const [renderer,setRenderer]=useState<'ready'|'error'|'loading'>('loading');
  const exhibition=useVisitor({active:status==='active'&&!staff,ready:renderer==='ready'&&gestureState==='running',
    animations,assetKey:character.model.key,mirror:settings.mirror,request,painter,observe,captureLock,sound:shutterSound,plate});
  useEffect(()=>setRenderer('loading'),[character.model.key]);
  const guest=status==='active'&&!staff;
  const visibleCamera=staff||exhibition.view.phase==='countdown';
  const checking=guest && exhibition.view.phase==='idle';
  useEffect(()=>{if(!checking)setInspectCamera(false);},[checking]);
  const cameraHelp={
    'zh-TW':['人臉偵測載入中','人臉偵測失敗，請停止並重新開始展示','偵測人臉數','檢查鏡頭','關閉鏡頭小預覽'],
    en:['Loading face detector','Face detector failed. Restart the exhibit.','Faces detected','Check camera','Close camera check'],
    ja:['顔検出を準備中','顔検出エラー。展示を再開してください','検出した顔の数','カメラを確認','確認を閉じる']
  }[settings.language];
  const guestText=visitorText(settings.language);
  const [cue,setCue]=useState<{kind:Cue;at:number}>({kind:'photo',at:-Infinity});
  const [action,setAction]=useState<Cue|null>(null);
  const timer=useRef(0);
  useEffect(()=>{
    if(status!=='active'){setRenderer('loading');setAction(null);setCue({kind:'photo',at:-Infinity});}
    return ()=>window.clearTimeout(timer.current);
  },[status]);
  const play=(kind:Cue)=>{
    window.clearTimeout(timer.current);setCue({kind,at:performance.now()});setAction(kind);
    timer.current=window.setTimeout(()=>setAction(null),kind==='photo'?6000:650);
  };
  const streamRef=useRef<MediaStream|null>(null);
  const opRef=useRef(0);
  const settingsRef=useRef(settings);
  const l=(key:MessageKey)=>t(settings.language,key);
  const update=(patch:Partial<ExhibitSettings>)=>setSettings(prev=>({...prev,...patch}));
  useEffect(()=>{settingsRef.current=settings;saveSettings(settings);document.documentElement.lang=settings.language;},[settings]);
  const refreshDevices=useCallback(async()=>{try{setDevices(await listCameras());}catch{setDevices([]);}},[]);
  useEffect(()=>{void refreshDevices();const handle=()=>{void refreshDevices();};navigator.mediaDevices?.addEventListener?.('devicechange',handle);return()=>navigator.mediaDevices?.removeEventListener?.('devicechange',handle);},[refreshDevices]);
  const stop=useCallback(()=>{opRef.current++;stopCamera(streamRef.current);streamRef.current=null;if(videoRef.current)videoRef.current.srcObject=null;setInfo(null);setFps(0);setStatus('ready');setError(null);},[]);
  const start=useCallback(async(override?:Partial<ExhibitSettings>)=>{
    setPlate(null);
    try{audio.current??=new AudioContext();void audio.current.resume().catch(()=>{});}catch{/* Audio unavailable */}
    const op=++opRef.current;
    stopCamera(streamRef.current);streamRef.current=null;
    if(videoRef.current)videoRef.current.srcObject=null;
    setStatus('loading');setError(null);setInfo(null);
    if(!cameraSupported()){setStatus('error');setError('unsupported');return;}
    try{
      const stream=await startCamera({...settingsRef.current,...override});
      if(op!==opRef.current){stopCamera(stream);return;}
      streamRef.current=stream;
      if(videoRef.current){videoRef.current.srcObject=stream;await videoRef.current.play().catch(()=>{});}
      if(op!==opRef.current){stopCamera(stream);return;}
      setInfo(getCameraInfo(stream));setStatus('active');void refreshDevices();
      stream.getVideoTracks()[0]?.addEventListener('ended',()=>{if(op===opRef.current){streamRef.current=null;setInfo(null);setStatus('error');setError('unavailable');}});
    }catch(e){if(op===opRef.current){setStatus('error');setError(cameraErrorMessage(e));}}
  },[refreshDevices]);
  useEffect(()=>{const handler=()=>setViewport(`${window.innerWidth} × ${window.innerHeight}`);window.addEventListener('resize',handler);return()=>window.removeEventListener('resize',handler);},[]);
  useEffect(()=>{const handler=()=>setFullscreen(document.fullscreenElement===stagePanel.current);document.addEventListener('fullscreenchange',handler);return()=>document.removeEventListener('fullscreenchange',handler);},[]);
  useEffect(()=>{if(status!=='active')return;let raf=0;let last=performance.now();let frames=0;const tick=(now:number)=>{frames++;if(now-last>=1000){setFps(Math.round(frames*1000/(now-last)));frames=0;last=now;}raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf);},[status]);
  useEffect(()=>()=>{opRef.current++;stopCamera(streamRef.current);},[]);
  const switchCamera=(deviceId:string)=>{update({deviceId});if(status==='active'||status==='loading')void start({deviceId});};
  const switchResolution=(resolution:Resolution)=>{update({resolution});if(status==='active'||status==='loading')void start({resolution});};
  const toggleFullScreen=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await stagePanel.current?.requestFullscreen();}catch{/* Fullscreen is optional */}};
  return <div className="app-shell">
    <header className="topbar"><div className="brand"><span className="brand-icon"><Camera size={23}/></span><div><strong>{l('title')}</strong><small>{l('subtitle')}</small></div></div><div className="header-actions"><span className="version">P0-6</span><select aria-label={l('language')} value={settings.language} onChange={e=>update({language:e.target.value as ExhibitSettings['language']})}><option value="zh-TW">繁體中文</option><option value="en">English</option><option value="ja">日本語</option></select></div></header>
    <main className="dashboard exhibit-dashboard"><section ref={stagePanel} className="stage-panel"><div className="stage-toolbar"><span className={`status-chip ${status}`}><span className="dot"/>{l(status)}</span><button className="icon-button" onClick={()=>void toggleFullScreen()} title={fullscreen?l('exitFullScreen'):l('fullScreen')} aria-label={fullscreen?l('exitFullScreen'):l('fullScreen')}>{fullscreen?<Minimize size={19}/>:<Maximize size={19}/>}</button></div>
      <div className={'stage '+(guest?'visitor-stage ':'')+(guest&&!visibleCamera?'character-stage':'')} data-check-camera={checking&&inspectCamera} data-phase={guest?exhibition.view.phase:undefined} data-animation={guest?exhibition.view.clip:undefined}><video ref={videoRef} playsInline muted autoPlay className={settings.mirror?'mirrored':''} aria-label={l('camera')}/>{status!=='active'&&<div className="empty-state"><div className="empty-icon">{status==='error'?<CameraOff size={43}/>:<Camera size={43}/>}</div><h2>{status==='error'?l('cameraError'):status==='loading'?l('loading'):l('noCamera')}</h2><p>{status==='error'?l(error||'cameraError'):l('permission')}</p></div>}{status==='active'&&<CharacterBoundary onError={()=>setRenderer('error')}><Suspense fallback={null}><Character composing={guest&&exhibition.view.phase==='processing'} onPoseComplete={exhibition.onPoseComplete} source={character.model.source} idle={animations.idle[0]} pose={animations.photo[0]} photoSecond={guest&&['countdown','processing'].includes(exhibition.view.phase)?exhibition.view.photoSecond:undefined} clip={guest?exhibition.view.clip:undefined} painter={painter} tracking={stats.tracking} gaze={gaze} mirror={settings.mirror} cue={cue} onState={setRenderer}/></Suspense></CharacterBoundary>}{guest&&<VisitorOverlay custom={!!character.model.source} view={exhibition.view} language={settings.language} reset={exhibition.reset}/>} {status==='active'&&visibleCamera&&<div className="preview-label"><span className="live-dot"/> LIVE · {info?.width}×{info?.height}</div>}</div>
      {checking&&<div className="camera-check"><span>{stats.state==='running'?cameraHelp[2]+' '+stats.count:stats.state==='error'?cameraHelp[1]:cameraHelp[0]}</span>
        <button className="subtle-button" aria-pressed={inspectCamera} onClick={()=>setInspectCamera(v=>!v)}>{cameraHelp[inspectCamera?4:3]}</button></div>}
      {status==='active'&&staff&&<button className="subtle-button" onClick={()=>setStaff(false)}>{guestText.exit}</button>}
      {status==='active'&&staff&&<PhotoPanel plate={plate} setPlate={setPlate} gestureShot={gestureShot} lighting={lighting} video={videoRef} empty={stats.state==='running' && stats.count===0 && !stats.tracking} language={settings.language} mirror={settings.mirror}
        ready={stats.state==='running' && renderer==='ready'} request={request} painter={painter}/>}
      <div className="stage-footer"><div className="privacy"><ShieldCheck size={17}/><span>{l('privacy')}</span></div><div className="controls">{status==='active'&&staff&&(['left','right','photo'] as const).map(kind=><button key={kind} disabled={renderer!=='ready'} className="subtle-button" onClick={()=>play(kind)}>{labels[kind]}</button>)}{status==='active'?<button className="danger-button" onClick={stop}><CameraOff size={18}/>{l('stop')}</button>:<button className="primary-button" disabled={status==='loading'} onClick={()=>void start()}><Camera size={18}/>{status==='error'?l('retry'):l('start')}</button>}</div></div>
    </section>
    <details className="exhibit-settings"><summary>{guestText.settings}</summary><aside className="sidebar"><AnimationSettings language={settings.language} value={animations} onChange={character.setSlots} choose={character.choose} catalog={character.model.catalog} name={character.model.name} custom={!!character.model.source} busy={character.busy} error={character.error}/><button className="subtle-button" onClick={()=>setStaff(v=>!v)}>{staff?guestText.exit:guestText.staff}</button><section className="panel"><div className="panel-title"><Settings2 size={19}/><h2>{l('camera')}</h2></div><label htmlFor="camera-select">{l('cameraHelp')}</label><select id="camera-select" value={devices.some(d=>d.deviceId===settings.deviceId)?settings.deviceId:''} onChange={e=>switchCamera(e.target.value)}><option value="">{l('auto')}</option>{devices.map((d,i)=><option key={d.deviceId||i} value={d.deviceId}>{d.label}</option>)}</select><label htmlFor="resolution-select">{l('resolution')}</label><select id="resolution-select" value={settings.resolution} onChange={e=>switchResolution(e.target.value as Resolution)}><option value="auto">{l('auto')} (720p)</option><option value="640">640 × 480</option><option value="1280">1280 × 720</option><option value="1920">1920 × 1080</option></select><p className="hint">{l('resolutionNote')}</p><label className="switch-line"><input type="checkbox" checked={settings.mirror} onChange={e=>update({mirror:e.target.checked})}/><span>{l('mirror')}</span></label><button className="subtle-button" onClick={()=>{setSettings(defaults);stop();}}><RotateCcw size={16}/>{l('reset')}</button></section>
    <section className="panel"><div className="panel-title"><Activity size={19}/><h2>{l('debug')}</h2></div><button className="subtle-button" onClick={()=>update({showDebug:!settings.showDebug})}>{settings.showDebug?l('hideDebug'):l('showDebug')}</button>{settings.showDebug&&<dl className="debug-list"><div><dt>{l('status')}</dt><dd>{l(status)}</dd></div><div><dt>{l('device')}</dt><dd className="truncate" title={info?.deviceId||'-'}>{info?.deviceId?.slice(0,12)||'-'}</dd></div><div><dt>{l('requested')}</dt><dd>{settings.resolution==='auto'?'Auto':settings.resolution+'p'}</dd></div><div><dt>{l('actual')}</dt><dd>{info?`${info.width} × ${info.height}`:'-'}</dd></div><div><dt>{l('fps')}</dt><dd>{status==='active'?fps:'-'}</dd></div><div><dt>{l('viewport')}</dt><dd>{viewport}</dd></div><div><dt>{l('secure')}</dt><dd>{window.isSecureContext?l('yes'):l('no')}</dd></div>{[
      [labels.detector,labels[stats.state]], [labels.handDetector,labels[gestureState]], [labels.character,labels[status==='active'?renderer:'off']],
      [labels.faces,stats.state==='running'?stats.count:'—'],
      [labels.target,stats.tracking?stats.point.x.toFixed(2)+' / '+stats.point.y.toFixed(2):'—'],
      [labels.speed,stats.state==='running'?stats.hz+' Hz / '+stats.ms+' ms':'—'],
      [labels.mode,status==='active' && renderer==='ready'?labels[action??(stats.tracking?'tracking':'idle')]:'—']
    ].map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>}{(stats.state==='error'||renderer==='error')&&<p className="hint" role="alert">{stats.state==='error'?labels.detector:labels.character} · {labels.error}. {labels.help} {stats.detail}</p>}</section>
    <BackgroundSettings language={settings.language}/><PhotoHistory language={settings.language}/></aside></details></main><footer className="footer"><Monitor size={15}/> <span>NTUB DMD [AI Interactive Character Photo Booth] · P0-6</span><a href="mailto:slinghu@ntub.edu.tw">{l('designer')}</a></footer>
  </div>;
}
