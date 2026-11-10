# P0-5 合照上傳與掃碼下載

本階段提供正式合照的手動分享。本機 PNG 與 QR 下載共用同一張已合成的照片。場地試拍只提供本機下載。

## 本機模擬

1. 使用 Node 22.13+ 與 npm，執行 `npm ci`、`npm run dev:share-demo -- --port 5175`，在同一台電腦開啟 `http://127.0.0.1:5175/ai-character-photo-booth/`。
2. 開始展示、比讚一秒，拍攝正式合照。先確認可下載本機 PNG，再按「上傳合照供手機掃碼下載」。畫面標示「本機模擬分享」。
3. 以 QR 解碼器讀取圖碼，或按「開啟下載連結」。此模式使用展示電腦的記憶體服務，預設網址只在該電腦上有效。關閉模擬服務會清空照片；逾時連結失效，下一次請求會清理過期照片。
4. 重拍後舊 QR 應從介面消失。兩組連結各自取回對應照片。故障時可重試，上傳失敗不影響本機下載。

## Supabase 正式串接（待實際專案驗收）

1. 在專用 Supabase 專案啟用 Anonymous Sign-Ins，讓展示機以暫時身分寫入自己的目錄。[匿名登入說明](https://supabase.com/docs/guides/auth/auth-anonymous)
2. 在 SQL Editor 執行 [photo-sharing.sql](../supabase/photo-sharing.sql)。使用私人 bucket `booth-photos`，限制 PNG 與單檔 10 MiB。確認專案內沒有其他寬鬆政策授權讀寫該 bucket。[Storage 存取控制](https://supabase.com/docs/guides/storage/security/access-control)
3. 本機測試可在專案根目錄的 `.env.local` 填入 `VITE_SUPABASE_URL` 及 `VITE_SUPABASE_PUBLISHABLE_KEY`（sb_publishable_ 開頭），重啟一般 `npm run dev`。GitHub Pages 使用同名 Actions **Variables**，設定後須重新建置。瀏覽器僅使用可公開金鑰。
4. 點分享後才上傳到隨機物件路徑。手機持有簽名連結即可下載，毋須登入。預設連結有效一小時，到期可由仍開著該合照的展示機重新分享。連結到期與雲端物件刪除是兩件事；展後需由專案管理者清理 bucket 和匿名帳戶。[簽名連結說明](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl)
5. 用實體手機掃描實際雲端 QR，在 Safari／Chrome 儲存或開啟照片，驗證檔名、尺寸、內容、斷網重試及連結到期。缺少設定時仍可在展示機下載本機 PNG。

## 驗收項目

|場景|通過條件|
|---|---|
|場地試拍、一般預覽|無自動上傳；試拍沒有分享按鈕|
|正式合照|明確按分享後才上傳；QR 與畫面下載連結一致|
|取回照片|透過 QR 取得的檔案與展示機的 PNG 位元組完全相同，尺寸為 1920×1080|
|重拍與重試|新照片取得獨立連結；上傳或簽名失敗可重試，本機 PNG 仍可下載|
|權限與效期|實際 Supabase 專案拒絕未授權讀寫；簽名網址到期；有效網址可從手機行動網路下載|

光線與去背畫質的真人驗收沿用 P0-4 的「待展場確認」。

2026-11-10 本機模擬已驗：試拍及正式照預覽均無自動上傳；分享失敗時本機下載仍可用，重試可完成。Chrome 連拍兩組，以獨立 QR 解碼器讀取各自的畫面圖碼，透過解碼網址取得 1920×1080 PNG，兩張的 SHA-256 各自與本機原檔一致。Supabase 真實服務、跨裝置手機下載與展場網路仍待實測。

### 2026-11-10 使用者本機模擬驗收

受測版本 `d98b343`。使用者確認正式合照分享後出現 QR Code，從「開啟下載連結」取得的照片與剛拍攝的合照相符，並確認檔案為 1920×1080 PNG。本機模擬分享流程通過。
