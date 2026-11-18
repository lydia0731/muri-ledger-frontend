# 木日記帳｜前端

繁體中文、木紋紙本風格的響應式記帳介面。此儲存庫僅包含靜態前端，不含帳務資料、後端或機密金鑰。

## 本地開發

完整專案使用 `npm run dev` 啟動前端與 Node.js API。此獨立前端需要搭配相容後端；不能單靠靜態頁面完成登入與記帳。

目前 `config.js` 的 API_URL 指向 `http://localhost:3001`，供本地開發使用。

## 未來 GitHub Pages 部署

1. 先部署後端，將 `config.js` 的 API_URL 設為後端 HTTPS origin。
2. 同步修改 `index.html` 中 CSP 的 `connect-src`，只允許該 API origin。
3. 在後端設定 FRONTEND_ORIGIN 為 GitHub Pages 網站的 origin（例如 `https://owner.github.io`，不含儲存庫路徑）。
4. 將本儲存庫根目錄發布至 Pages；所有資產使用相對路徑。

此版本未啟用 Pages，也尚未連接正式後端。私人儲存庫的 Pages 可用性依 GitHub 方案而定；是否公開程式碼應另行決定。

登入憑證僅放記憶體，重新整理需重新登入。20 分鐘期限由後端執行；前端計時器只負責介面鎖定。請勿在任何前端檔案加入 Email API key、DATA_KEY 或私人帳務資料。
