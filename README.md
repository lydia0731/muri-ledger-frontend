# 木日記帳｜前端

繁體中文、紙本風格的響應式記帳介面。此公開儲存庫僅含靜態前端，不含帳務資料或機密金鑰。

網站：https://lydia0731.github.io/muri-ledger-frontend/

前端由 GitHub Pages 發布，Node.js API 及 SQLite 持久儲存部署於 Railway。config.js 與 index.html 的 CSP 只允許正式 API origin。

以管理者預先建立的 UserID、Email 及信箱驗證碼登入；登入憑證僅放記憶體，重新整理需重新登入。20 分鐘期限由後端執行。

請勿將 Email API key、DATA_KEY、.env 或帳務資料加入此儲存庫。
