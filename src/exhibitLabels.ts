import type {Language} from './i18n';
const labels={
 'zh-TW':{photo:'拍照動作',left:'左眼眨眼',right:'右眼眨眼',detector:'人臉偵測器',character:'3D 角色',faces:'偵測人臉數',target:'目標中心（原始影像）',speed:'偵測頻率／耗時',mode:'角色動作',off:'未啟動',loading:'載入中',running:'運作中',ready:'就緒',error:'失敗',idle:'待機',tracking:'追蹤',help:'停止並重新開始展示可重試。'},
 en:{photo:'Photo pose',left:'Wink left eye',right:'Wink right eye',detector:'Face detector',character:'3D character',faces:'Faces detected',target:'Target center (source)',speed:'Detection rate / time',mode:'Animation',off:'Off',loading:'Loading',running:'Running',ready:'Ready',error:'Failed',idle:'Idle',tracking:'Tracking',help:'Stop and restart the exhibit to retry.'},
 ja:{photo:'撮影ポーズ',left:'左目ウインク',right:'右目ウインク',detector:'顔検出器',character:'3D キャラクター',faces:'検出した顔の数',target:'対象の中心（元映像）',speed:'検出頻度／所要時間',mode:'動作',off:'停止中',loading:'読み込み中',running:'動作中',ready:'準備完了',error:'失敗',idle:'待機',tracking:'追跡',help:'展示を停止して再開すると再試行できます。'}
};
export const exhibitLabels=(lang:Language)=>labels[lang];
