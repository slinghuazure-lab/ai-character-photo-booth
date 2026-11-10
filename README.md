# AI 互動角色合照 · P0-6

以 P0-1 main 的 `6203978` 為基礎。保留原有攝影機、解析度、鏡像、全螢幕、除錯資訊、三語介面及本機設定。影像在瀏覽器內處理。

P0-3 加入 1–5 人逐人比讚 持續 1 秒的同意流程。[功能與實機驗收表](docs/p0-3-acceptance.md)

P0-4 可在全員同意後拍攝去背合照、預覽並下載 1920×1080 PNG。[P0-4 操作與驗收表](docs/p0-4-acceptance.md)

P0-5 支援手動分享正式合照，取得 QR Code 後可下載同一張 PNG。[模擬操作、Supabase 設定與驗收表](docs/p0-5-acceptance.md)

P0-6 新增正式合照的拍攝紀錄與 Supabase 跨展示機每日統計。[安裝、查詢與驗收表](docs/p0-6-acceptance.md)

## 使用

使用 Node.js 22.13+ 或 24 與 npm。在專案目錄執行：

```sh
npm ci
npm test
npm run build
npm run preview
```

開啟 localhost 下的 `/ai-character-photo-booth/`，按「開始展示」。詳見 [逐步部署與實機驗收表](docs/p0-2-acceptance.md)。

## 變更

- Three.js 在預覽左下角繪製透明背景的V15 北商大博士小菁鷹，雙眼具有獨立旋轉中心及眨眼動作。開啟展示後可測試待機、追蹤及比 YA 拍照姿勢（約 6 秒）。
- MediaPipe Face Detector 讀取既有攝影機串流。按方框面積選目標，利用約 250 ms 的切換等待、450 ms 的失焦寬限及時間加權插值平滑視線。
- DebugPanel 顯示偵測器、3D 角色、臉數、目標中心、推論頻率、耗時與動作。模型與 WASM 隨網站發布。
- 模型使用 [官方 BlazeFace short-range float16 v1](https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite)，SHA-256 為 `b4578f35940bf5a1a655214a1cce5cab13eba73c1297cd78e1a04c2380b0152f`。
