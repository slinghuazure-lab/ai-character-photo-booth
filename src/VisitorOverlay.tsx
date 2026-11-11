import type {Language} from './i18n';
import type {VisitorPhase} from './visitorFlow';
const words={
 'zh-TW':{idle:'小菁鷹正在等你',hello:'你好！我是小菁鷹',invite:'一起合照嗎？',countdown:'看鏡頭',release:'已比讚者已計入，每人一次。可以放下手，請留在畫面中。',processing:'正在製作合照',qr:'掃碼下載你的合照',error:'合照未完成',instruction:'請在自己的臉旁比讚。合照會自動上傳，供手機掃碼下載。',separate:'請先放下手、拉開距離，再在自己臉旁比讚。',reset:'回到待機',finish:'秒後回到待機',upload:'上傳失敗，可先下載這張合照。',model:'無法準備相機或模型，請重新開始。',save:'下載合照',settings:'展場設定',staff:'開啟工作人員試拍',exit:'結束試拍，回到展示'},
 ko:{
    idle:"부엉이가 기다리고 있어요",
    hello:"안녕하세요! 저는 NTUB 부엉이예요",
    invite:"함께 사진 찍을까요?",
    countdown:"카메라를 보세요",
    release:"참여자는 한 번만 집계됩니다. 손을 내리고 화면 안에 있어 주세요.",
    processing:"합성 사진을 만드는 중",
    qr:"스캔하여 사진 다운로드",
    error:"촬영을 완료하지 못했습니다",
    instruction:"자기 얼굴 옆에서 엄지를 들어 주세요. 사진은 자동으로 업로드되며 QR 코드로 다운로드할 수 있습니다.",
    separate:"손을 내리고 서로 간격을 둔 뒤, 자기 얼굴 옆에서 다시 엄지를 들어 주세요.",
    reset:"대기 화면으로",
    finish:"초 후 대기 화면으로 돌아갑니다",
    upload:"업로드에 실패했습니다. 여기서 사진을 다운로드할 수 있습니다.",
    model:"카메라 또는 모델을 준비할 수 없습니다. 다시 시작해 주세요.",
    save:"사진 다운로드",
    settings:"전시 설정",
    staff:"직원 시험 촬영",
    exit:"시험 촬영 종료 및 전시로 돌아가기"
  },
  th:{
    idle:"นกฮูก NTUB กำลังรอคุณอยู่",
    hello:"สวัสดี! ฉันคือนกฮูก NTUB",
    invite:"มาถ่ายรูปด้วยกันไหม?",
    countdown:"มองกล้องนะ",
    release:"นับผู้เข้าร่วมคนละหนึ่งครั้ง ลดมือลงได้และอยู่ในภาพต่อไป",
    processing:"กำลังเตรียมภาพถ่าย",
    qr:"สแกนเพื่อดาวน์โหลดภาพของคุณ",
    error:"ถ่ายภาพไม่สำเร็จ",
    instruction:"ชูนิ้วโป้งข้างใบหน้าของตัวเอง ภาพจะถูกอัปโหลดอัตโนมัติเพื่อให้สแกน QR Code ดาวน์โหลดได้",
    separate:"ลดมือลงแล้วขยับห่างกัน จากนั้นชูนิ้วโป้งข้างใบหน้าของตัวเองอีกครั้ง",
    reset:"กลับสู่หน้าสแตนด์บาย",
    finish:"วินาทีก่อนกลับสู่หน้าสแตนด์บาย",
    upload:"อัปโหลดไม่สำเร็จ คุณดาวน์โหลดภาพได้ที่นี่",
    model:"เตรียมกล้องหรือโมเดลไม่ได้ โปรดเริ่มใหม่",
    save:"ดาวน์โหลดภาพ",
    settings:"ตั้งค่าการแสดง",
    staff:"ทดลองถ่ายสำหรับเจ้าหน้าที่",
    exit:"จบการทดลองและกลับสู่การแสดง"
  },
  en:{idle:'Meet the NTUB owl',hello:'Hello from the NTUB owl!',invite:'Take a photo together?',countdown:'Look at the camera',release:'Each participant is counted once. You can lower your hand and stay in view.',processing:'Preparing your photo',qr:'Scan to download your photo',error:'Photo not completed',instruction:'Give a thumbs-up beside your face. The photo will be uploaded for QR download.',separate:'Move apart so each face and body is visible, then give a thumbs-up again.',reset:'Back to idle',finish:'seconds until idle',upload:'Upload failed. You can download the photo here.',model:'Camera or model unavailable. Restart the exhibit.',save:'Download photo',settings:'Exhibit settings',staff:'Staff test mode',exit:'Return to exhibit'},
 ja:{idle:'小菁鷹と会おう',hello:'こんにちは！',invite:'一緒に写真を撮りますか？',countdown:'カメラを見てください',release:'参加者は一人一回だけ数えます。手を下ろして、そのまま画面内でお待ちください。',processing:'合成写真を作成中',qr:'スキャンして写真を保存',error:'撮影を完了できませんでした',instruction:'自分の顔の横で親指を立ててください。写真をアップロードしてQRで共有します。',separate:'間隔を空け、顔と体が見える状態でもう一度親指を立ててください。',reset:'待機に戻る',finish:'秒後に待機',upload:'アップロード失敗。写真は保存できます。',model:'カメラまたはモデルを確認してください。',save:'写真を保存',settings:'展示設定',staff:'スタッフ試写',exit:'展示に戻る'}
};
export const visitorText=(language:Language)=>words[language];
export function VisitorOverlay({view,language,reset,custom}:{custom:boolean;view:{phase:VisitorPhase;participants:number;seconds:number;reposition:boolean;separate:boolean;qr:string;link:string;photo:string;error:string};language:Language;reset:()=>void}){
 const t=words[language];
 if(view.phase==='qr')return <div className="visitor-result"><img className="visitor-photo" src={view.photo} alt={t.save}/><div><h2>{t.qr}</h2><a href={view.link} target="_blank" rel="noreferrer"><img className="visitor-qr" src={view.qr} alt={t.qr}/></a><p>{view.seconds} {t.finish}</p></div></div>;
 return <div className={'visitor-message phase-'+view.phase} role="status"><h2>{custom&&view.phase==='hello'?{'zh-TW':'你好！',ko:"안녕하세요!",
  th:"สวัสดี!",
  en:'Hello!',ja:'こんにちは！'}[language]:custom&&view.phase==='idle'?{'zh-TW':'等你來合照',ko:"함께 사진 찍을 준비가 됐어요",
  th:"พร้อมถ่ายรูปด้วยกันแล้ว",
  en:'Ready for a photo',ja:'撮影をお待ちしています'}[language]:t[view.phase]}</h2>
 {view.phase==='hello'&&<p>{{'zh-TW':'面向鏡頭，合照邀請倒數',ko:"카메라를 바라보세요. 촬영 초대까지",
  th:"มองกล้อง อีกสักครู่จะมีคำเชิญถ่ายภาพ เหลือ",
  en:'Face the camera · photo invitation in',ja:'カメラを向いてください・撮影のお誘いまで'}[language]} {view.seconds} s</p>}
 {view.phase==='invite'&&<p>{view.separate?t.separate:t.instruction}</p>}
 {(view.phase==='countdown'||view.phase==='processing')&&<p className="participant-count">{{'zh-TW':`入鏡人數：${view.participants} 人`,ko:`촬영 인원 ${view.participants}명`,
  th:`จำนวนคนในภาพ ${view.participants} คน`,
  en:`People in photo: ${view.participants}`,ja:`撮影人数：${view.participants} 人`}[language]}</p>}
 {view.phase==='countdown'&&<><strong>{view.seconds}</strong><p>{view.reposition?{'zh-TW':'請稍微站開，讓鏡頭看清每個人的臉和肩膀。倒數後會再拍一次，可以放下手。',ko:"얼굴과 어깨가 보이도록 간격을 두세요. 손을 내린 채로 기다리면 다시 촬영합니다.",
  th:"ขยับห่างกันให้เห็นใบหน้าและไหล่ของทุกคน ลดมือลงได้ ระบบจะถ่ายใหม่เมื่อครบเวลา",
  en:'Move apart so each face and shoulders are visible. Keep your hands down for the retake.',ja:'顔と肩が見えるように間隔を空けてください。手を下ろしたまま再撮影します。'}[language]:view.separate?t.separate:t.release}</p></>}
 {view.phase==='error'&&<><p>{view.error==='tracking'?{'zh-TW':'快門時未能確認已比讚者的位置。請讓每張臉完整入鏡，再重新拍攝。',ko:"촬영 순간에 참여자의 위치를 확인할 수 없었습니다. 얼굴이 모두 보이도록 서서 다시 촬영하세요.",
  th:"ยืนยันตำแหน่งผู้เข้าร่วมตอนถ่ายไม่ได้ ให้เห็นใบหน้าของทุกคนชัดเจนแล้วถ่ายใหม่",
  en:'Could not confirm the participants at the shutter. Keep each face visible and try again.',ja:'撮影時に参加者の位置を確認できませんでした。全員の顔を映して撮り直してください。'}[language]:view.error==='pose'?{'zh-TW':'無法將人臉對應到身體。請退後半步，讓臉和雙肩完整入鏡，再重新拍攝。',ko:"얼굴과 몸을 연결할 수 없습니다. 반걸음 물러나 얼굴과 양쪽 어깨가 보이도록 한 뒤 다시 촬영하세요.",
  th:"จับคู่ใบหน้ากับลำตัวไม่ได้ ถอยครึ่งก้าวให้เห็นใบหน้าและไหล่ทั้งสองข้างแล้วถ่ายใหม่",
  en:'Could not match a face to its body. Step back so faces and shoulders are visible and try again.',ja:'顔と体を照合できませんでした。少し後ろに下がり、顔と両肩を映して撮り直してください。'}[language]:view.error==='separation'?{'zh-TW':'無法安全分開入鏡者，這次合照已取消。請兩人站開，讓肩膀之間留有空隙，再回到待機重拍。',ko:"인물을 분리할 수 없어 촬영을 취소했습니다. 서로 어깨가 닿지 않도록 선 뒤 대기 화면으로 돌아가 다시 촬영하세요.",
  th:"แยกบุคคลในภาพไม่ได้ จึงยกเลิกการถ่ายครั้งนี้ โปรดยืนให้ไหล่ห่างกันแล้วกลับสู่หน้าสแตนด์บายเพื่อถ่ายใหม่",
  en:'The people could not be separated. Leave a gap between shoulders, then return to idle to try again.',ja:'人物を分離できませんでした。肩の間に隙間を空け、待機画面に戻って撮り直してください。'}[language]:view.error==='upload'?t.upload:view.error==='camera'?{'zh-TW':'快門未收到新的攝影畫面，請確認鏡頭預覽會動，再重新拍攝。',ko:"카메라에서 새 영상을 받지 못했습니다. 미리보기가 움직이는지 확인하고 다시 촬영하세요.",
  th:"ไม่ได้รับภาพใหม่จากกล้อง ตรวจสอบว่าภาพตัวอย่างเคลื่อนไหวแล้วถ่ายอีกครั้ง",
  en:'No new camera frame arrived. Check that the camera preview is moving and try again.',ja:'カメラから新しい映像を取得できません。プレビューを確認してください。'}[language]:view.error==='compose'?{'zh-TW':'照片合成失敗，請確認人物清楚入鏡，再重新拍攝。',ko:"사진을 합성하지 못했습니다. 인물이 선명하게 보이는지 확인한 뒤 다시 촬영하세요.",
  th:"รวมภาพไม่สำเร็จ ตรวจดูว่ากล้องเห็นคนชัดเจนแล้วถ่ายใหม่",
  en:'Photo composition failed. Make sure the people are visible and try again.',ja:'写真を合成できませんでした。人物が映っていることを確認してください。'}[language]:view.error==='qr'?{'zh-TW':'無法產生 QR Code，可直接下載合照。',ko:"QR 코드를 만들 수 없습니다. 여기서 사진을 다운로드하세요.",
  th:"สร้าง QR Code ไม่ได้ ดาวน์โหลดภาพได้ที่นี่",
  en:'QR code unavailable. Download the photo here.',ja:'QRコードを生成できません。写真をダウンロードできます。'}[language]:t.model}</p>{view.photo&&<a href={view.photo} download="NTUB-1920x1080.png">{t.save}</a>} <button className="subtle-button" onClick={reset}>{t.reset}</button></>}
 </div>;
}
