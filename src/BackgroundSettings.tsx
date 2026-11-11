import {useState} from 'react';
import type {Language} from './i18n';
import {backgroundSlots,readBackground,saveBackground} from './photoBackgrounds';

const labels={
  'zh-TW':['合照背景圖','每次合照會從已設定的圖片中隨機選一張。建議使用 1920 × 1080 橫圖。','背景','移除','無法儲存背景，請確認圖片格式與瀏覽器儲存空間。'],
  ko:["합성 사진 배경", "촬영할 때마다 설정한 배경 중 하나를 무작위로 사용합니다. 1920 × 1080 가로 이미지를 권장합니다.", "배경", "삭제", "배경을 저장할 수 없습니다. 이미지 형식과 브라우저 저장 공간을 확인하세요."],
  th:["พื้นหลังภาพถ่าย", "ระบบสุ่มภาพพื้นหลังที่ตั้งไว้ทุกครั้งที่ถ่าย แนะนำภาพแนวนอนขนาด 1920 × 1080", "พื้นหลัง", "นำออก", "บันทึกพื้นหลังไม่ได้ โปรดตรวจสอบรูปแบบไฟล์และพื้นที่เก็บข้อมูลของเบราว์เซอร์"],
  en:['Photo backgrounds','Each photo uses a random configured image. Use a 1920 × 1080 landscape image.','Background','Remove','Could not save the background. Check the image and browser storage.'],
  ja:['合成写真の背景','設定した画像から撮影ごとにランダムに選びます。1920 × 1080 の横長画像を推奨します。','背景','削除','画像形式とブラウザーの空き容量を確認してください。']
};
export default function BackgroundSettings({language}:{language:Language}){
  const t=labels[language];
  const [images,setImages]=useState(()=>backgroundSlots.map(slot=>{try{return readBackground(slot);}catch{return null;}}));
  const [busy,setBusy]=useState(false),[error,setError]=useState(false);
  async function update(slot:number,file:File|null){
    setBusy(true);setError(false);
    try{
      await saveBackground(slot,file);
      setImages(backgroundSlots.map(readBackground));
    }catch{setError(true);}finally{setBusy(false);}
  }
  return <section className="panel"><h2>{t[0]}</h2><p className="hint">{t[1]}</p>
    {backgroundSlots.map(slot=><div key={slot}>
      <label htmlFor={'photo-bg-'+slot}>{t[2]} {slot}</label>
      <input id={'photo-bg-'+slot} type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e=>{
        const file=e.target.files?.[0];e.target.value='';if(file)void update(slot,file);
      }}/>
      {images[slot-1]&&<div><img width="144" height="81" src={images[slot-1]!} alt={t[2]+' '+slot}/>{' '}
        <button className="subtle-button" disabled={busy} onClick={()=>void update(slot,null)}>{t[3]}</button></div>}
    </div>)}
    {error&&<p role="alert">{t[4]}</p>}
  </section>;
}
