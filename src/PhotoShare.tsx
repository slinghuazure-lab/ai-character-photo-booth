import {useEffect,useRef,useState} from 'react';
import type {Language} from './i18n';

import {sharingConfigured,demoSharing,linkLifetime} from './shareConfig';
import type {PhotoRecord} from './photoRecord';
import {writeRecord} from './photoHistoryStore';
const labels={
 'zh-TW':{share:'上傳合照供手機掃碼下載',busy:'正在準備下載連結…',failed:'分享失敗，請重試；仍可下載本機 PNG。',disabled:'雲端分享尚未設定，可先下載 PNG。',scan:'用手機掃碼下載合照',link:'開啟下載連結',valid:'連結有效 1 小時，持有連結的人均可下載。',expired:'下載連結已到期，可再次分享。'},
 ko:{
    share:"사진 업로드 및 다운로드 QR 코드 생성",
    busy:"다운로드 링크 준비 중…",
    failed:"공유에 실패했습니다. 다시 시도하거나 PNG를 기기에 다운로드하세요.",
    disabled:"클라우드 공유가 설정되지 않았습니다. PNG를 다운로드할 수 있습니다.",
    scan:"스캔하여 사진 다운로드",
    link:"다운로드 링크 열기",
    valid:"링크를 가진 사람은 1시간 동안 사진을 다운로드할 수 있습니다.",
    expired:"링크가 만료되었습니다. 다시 공유해 새 링크를 만드세요."
  },
  th:{
    share:"อัปโหลดภาพเพื่อดาวน์โหลดผ่าน QR Code",
    busy:"กำลังเตรียมลิงก์ดาวน์โหลด…",
    failed:"แชร์ไม่สำเร็จ โปรดลองอีกครั้งหรือดาวน์โหลด PNG ลงเครื่อง",
    disabled:"ยังไม่ได้ตั้งค่าการแชร์บนคลาวด์ คุณสามารถดาวน์โหลด PNG ได้",
    scan:"สแกนเพื่อดาวน์โหลดภาพ",
    link:"เปิดลิงก์ดาวน์โหลด",
    valid:"ผู้ที่มีลิงก์ดาวน์โหลดภาพได้ภายใน 1 ชั่วโมง",
    expired:"ลิงก์หมดอายุแล้ว โปรดแชร์อีกครั้งเพื่อสร้างลิงก์ใหม่"
  },
  en:{share:'Upload photo for QR download',busy:'Preparing download link…',failed:'Sharing failed. Retry or download the local PNG.',disabled:'Cloud sharing is not configured. You can download the PNG.',scan:'Scan to download the photo',link:'Open download link',valid:'Anyone with the link can download for one hour.',expired:'Link expired. Share again for a new link.'},
 ja:{share:'合成写真をアップロードしてQRコードで共有',busy:'リンクを準備中…',failed:'共有に失敗しました。再試行するかPNGを保存してください。',disabled:'クラウド共有は未設定です。PNGは保存できます。',scan:'スキャンして写真を保存',link:'ダウンロードリンクを開く',valid:'リンクを知っている人は1時間ダウンロードできます。',expired:'リンクの期限が切れました。再度共有できます。'}
};
export default function PhotoShare({url,language,record}:{url:string;language:Language;record:PhotoRecord}){
  const t=labels[language];
  const pending=useRef<AbortController|null>(null);
  const [state,setState]=useState<'ready'|'busy'|'failed'|'expired'>('ready');
  const [link,setLink]=useState<{url:string;qr:string;until:number}|null>(null);
  useEffect(()=>()=>{pending.current?.abort();},[]);
  useEffect(()=>{
    if(!link)return;
    const expire=()=>{if(Date.now()>=link.until){setLink(null);setState('expired');}};
    const timer=window.setTimeout(expire,Math.max(0,link.until-Date.now()));
    document.addEventListener('visibilitychange',expire);
    return ()=>{window.clearTimeout(timer);document.removeEventListener('visibilitychange',expire);};
  },[link]);
  async function share(){
    if(pending.current || link)return;
    const request=new AbortController();pending.current=request;setState('busy');
    try{
      const [{sharePng},qr]=await Promise.all([import('./sharePng'),import('qrcode')]);
      const signed=await sharePng(url,record.id,request.signal);
      const until=Date.now()+linkLifetime*1000;
      const png=await qr.toDataURL(signed,{margin:4,width:400,errorCorrectionLevel:'M'});
      if(!request.signal.aborted){writeRecord({...record,shareStatus:'shared'});setLink({url:signed,qr:png,until});setState('ready');}
    }catch{if(!request.signal.aborted){writeRecord({...record,shareStatus:'failed'});setState('failed');}}
    finally{pending.current=null;}
  }
  if(!sharingConfigured && !demoSharing)return <p>{t.disabled}</p>;
  return <div className="photo-share">
    {demoSharing&&<p>{{'zh-TW':'本機模擬分享',ko:"로컬 공유 모의 테스트",
  th:"จำลองการแชร์บนเครื่อง",
  en:'Local sharing simulation',ja:'ローカル共有テスト'}[language]}</p>}
    {link?<><img src={link.qr} alt={t.scan}/><a href={link.url} target="_blank" rel="noreferrer">{t.link}</a><p>{t.valid}</p></>:
      <button className="subtle-button" disabled={state==='busy'} onClick={share}>{state==='busy'?t.busy:t.share}</button>}
    {(state==='failed'||state==='expired')&&<p role="status">{t[state]}</p>}
  </div>;
}
