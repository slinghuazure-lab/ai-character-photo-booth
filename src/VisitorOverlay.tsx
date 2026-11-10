import type {Language} from './i18n';
import type {VisitorPhase} from './visitorFlow';
const words={
 'zh-TW':{idle:'小菁鷹正在等你',hello:'你好！我是小菁鷹',invite:'一起合照嗎？',countdown:'看鏡頭',processing:'正在製作合照',qr:'掃碼下載你的合照',error:'合照未完成',instruction:'請在自己的臉旁比讚。合照會自動上傳，供手機掃碼下載。',separate:'請先放下手、拉開距離，再在自己臉旁比讚。',reset:'回到待機',finish:'秒後回到待機',upload:'上傳失敗，可先下載這張合照。',model:'無法準備相機或模型，請重新開始。',save:'下載合照',settings:'展場設定',staff:'開啟工作人員試拍',exit:'結束試拍，回到展示'},
 en:{idle:'Meet the NTUB owl',hello:'Hello from the NTUB owl!',invite:'Take a photo together?',countdown:'Look at the camera',processing:'Preparing your photo',qr:'Scan to download your photo',error:'Photo not completed',instruction:'Give a thumbs-up beside your face. The photo will be uploaded for QR download.',separate:'Move apart so each face and body is visible, then give a thumbs-up again.',reset:'Back to idle',finish:'seconds until idle',upload:'Upload failed. You can download the photo here.',model:'Camera or model unavailable. Restart the exhibit.',save:'Download photo',settings:'Exhibit settings',staff:'Staff test mode',exit:'Return to exhibit'},
 ja:{idle:'小菁鷹と会おう',hello:'こんにちは！',invite:'一緒に写真を撮りますか？',countdown:'カメラを見てください',processing:'合成写真を作成中',qr:'スキャンして写真を保存',error:'撮影を完了できませんでした',instruction:'自分の顔の横で親指を立ててください。写真をアップロードしてQRで共有します。',separate:'間隔を空け、顔と体が見える状態でもう一度親指を立ててください。',reset:'待機に戻る',finish:'秒後に待機',upload:'アップロード失敗。写真は保存できます。',model:'カメラまたはモデルを確認してください。',save:'写真を保存',settings:'展示設定',staff:'スタッフ試写',exit:'展示に戻る'}
};
export const visitorText=(language:Language)=>words[language];
export function VisitorOverlay({view,language,reset}:{view:{phase:VisitorPhase;seconds:number;separate:boolean;qr:string;link:string;photo:string;error:string};language:Language;reset:()=>void}){
 const t=words[language];
 if(view.phase==='qr')return <div className="visitor-result"><img className="visitor-photo" src={view.photo} alt={t.save}/><div><h2>{t.qr}</h2><a href={view.link} target="_blank" rel="noreferrer"><img className="visitor-qr" src={view.qr} alt={t.qr}/></a><p>{view.seconds} {t.finish}</p></div></div>;
 return <div className={'visitor-message phase-'+view.phase} role="status"><h2>{t[view.phase]}</h2>
 {view.phase==='invite'&&<p>{view.separate?t.separate:t.instruction}</p>}
 {view.phase==='countdown'&&<><strong>{view.seconds}</strong>{view.separate&&<p>{t.separate}</p>}</>}
 {view.phase==='error'&&<><p>{view.error==='upload'?t.upload:t.model}</p>{view.photo&&<a href={view.photo} download="NTUB-1920x1080.png">{t.save}</a>} <button className="subtle-button" onClick={reset}>{t.reset}</button></>}
 </div>;
}
