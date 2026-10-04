# 掌中書｜拍照看手相

手機瀏覽器開啟即可拍照，由 AI 依傳統手相說法解讀掌紋。娛樂用途，無科學依據。

## 檔案

- index.html：App 畫面與拍照流程
- manifest.webmanifest、icon.svg：加入主畫面用的名稱與圖示
- netlify/functions/read-palm.mjs：後端函式，負責呼叫 Claude API
- netlify.toml：後端平台的部署設定

## 重要：解讀功能需要後端

GitHub Pages 只能顯示畫面，無法執行後端，也不能存放 API 金鑰。
要讓「解讀掌紋」可用，請把這個儲存庫接到支援後端函式的平台（例如 Netlify）：

1. 在平台選擇「從 GitHub 匯入」並選取本儲存庫。
2. 新增環境變數 ANTHROPIC_API_KEY（到 https://console.anthropic.com 申請）。
   選填：CLAUDE_MODEL（模型名稱）、ALLOWED_ORIGIN（允許呼叫後端的網頁來源）。
3. 重新部署。此時該平台的網址即可完整使用。
4. 若網頁仍要放在 GitHub Pages，把 index.html 內的 API_URL
   改成後端的完整網址，例如 https://你的站名.netlify.app/api/read-palm。

API 金鑰絕對不要寫進任何檔案或提交到本儲存庫。

## 上線前必做

- 用 iPhone Safari 與 Android Chrome 實機測試。
- 在 Anthropic Console 設定每月費用上限。
- 補上隱私權政策，說明照片的蒐集目的、傳送對象與保存方式。
- 加上使用次數限制，避免被大量呼叫造成費用暴增。
