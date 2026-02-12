# PDF Bill Analysis - Code Navigation Guide

本指南依照「資料流向」與「執行順序」整理了檔案閱讀路徑，幫助您快速掌握程式碼的全貌。

---

## 流程一：檔案上傳 (Upload)

使用者上傳 PDF 或圖片，後端驗證並存入 Azure Blob Storage。

1.  **進入點**: [`apps/backend/src/routes/pdfRoute.ts`](file:///Users/rinouo/Frontend/Projects/EasyAccounting/apps/backend/src/routes/pdfRoute.ts)
    - `POST /pdf/upload`: 定義路由與 multer 設定（記憶體暫存）。
2.  **控制器**: [`apps/backend/src/controllers/pdfController.ts`](file:///Users/rinouo/Frontend/Projects/EasyAccounting/apps/backend/src/controllers/pdfController.ts)
    - `upload`: 呼叫驗證邏輯與 Service，回傳 `uploadId`。
3.  **業務邏輯**: [`apps/backend/src/services/pdfService.ts`](file:///Users/rinouo/Frontend/Projects/EasyAccounting/apps/backend/src/services/pdfService.ts)
    - `validateUploadFiles`: 驗證檔案大小、類型、Magic Bytes。
    - `uploadPdf` / `uploadImages`: 上傳至 Azure Blob，回傳 Blob URL。

---

## 流程二：建立即時監聽 (SSE)

前端建立 EventSource 連線，準備接收解析進度。

1.  **進入點**: [`apps/backend/src/routes/pdfRoute.ts`](file:///Users/rinouo/Frontend/Projects/EasyAccounting/apps/backend/src/routes/pdfRoute.ts)
    - `GET /pdf/stream/:uploadId`
2.  **控制器**: [`apps/backend/src/controllers/pdfController.ts`](file:///Users/rinouo/Frontend/Projects/EasyAccounting/apps/backend/src/controllers/pdfController.ts)
    - `stream`: 設定 headers，建立 `onStatusChange` 監聽器。
3.  **狀態管理**: [`apps/backend/src/utils/parseStatus.ts`](file:///Users/rinouo/Frontend/Projects/EasyAccounting/apps/backend/src/utils/parseStatus.ts)
    - `EventEmitter`: 負責儲存狀態與發送事件 (In-memory Pub/Sub)。

---

## 流程三：觸發解析與 AI 處理 (The Core Loop)

這是最核心的流程：觸發 -> Worker -> AI -> DB。

### A. 觸發任務

1.  **進入點**: [`apps/backend/src/routes/pdfRoute.ts`](file:///Users/rinouo/Frontend/Projects/EasyAccounting/apps/backend/src/routes/pdfRoute.ts)
    - `POST /pdf/parse/:uploadId`
2.  **控制器**: [`apps/backend/src/controllers/pdfController.ts`](file:///Users/rinouo/Frontend/Projects/EasyAccounting/apps/backend/src/controllers/pdfController.ts)
    - `triggerParse`: 驗證請求，將任務推送到 Service Bus Queue。
3.  **訊息佇列**: [`apps/backend/src/utils/serviceBus.ts`](file:///Users/rinouo/Frontend/Projects/EasyAccounting/apps/backend/src/utils/serviceBus.ts)
    - `sendParseMessage`: 實際發送訊息至 Azure Service Bus。

### B. Worker 處理 (背景作業)

4.  **Worker 入口**: [`apps/backend/src/worker.ts`](file:///Users/rinouo/Frontend/Projects/EasyAccounting/apps/backend/src/worker.ts)
    - `initBillParseWorker`: 在 `app.ts` 啟動，監聽 Queue。
    - `processMessage`: 核心流程控制（更新狀態 -> 下載 -> 解析 -> 存檔 -> 清理）。
5.  **PDF 轉檔**: [`apps/backend/src/services/pdfService.ts`](file:///Users/rinouo/Frontend/Projects/EasyAccounting/apps/backend/src/services/pdfService.ts)
    - `downloadBlobToBuffer`: 下載 PDF。
    - `convertPdfToImages`: PDF 轉 JPEG (使用 pdfjs-dist + canvas)。
6.  **AI 解析**: [`apps/backend/src/services/groqService.ts`](file:///Users/rinouo/Frontend/Projects/EasyAccounting/apps/backend/src/services/groqService.ts)
    - `parseImages`: 呼叫 Groq API，處裡 Retry 與 Context。
    - 參照 Schema: [`apps/backend/src/validation/llmResponseSchema.ts`](file:///Users/rinouo/Frontend/Projects/EasyAccounting/apps/backend/src/validation/llmResponseSchema.ts) (Zod 驗證)。
7.  **資料寫入**: [`apps/backend/src/services/billParseService.ts`](file:///Users/rinouo/Frontend/Projects/EasyAccounting/apps/backend/src/services/billParseService.ts)
    - `suggestCategory`: 查詢 MerchantMapping。
    - `matchExistingTransaction`: 比對分期交易。
    - `saveParsedResults`: 寫入 `PendingTransaction` 資料表。

---

## 建議閱讀順序

1.  **先看資料結構**: `llmResponseSchema.ts` (定義了 AI 輸出的格式，這是核心資料結構)。
2.  **再看 Worker 流程**: `worker.ts` (串接了所有服務的樞紐)。
3.  **最後看各個 Service 實作**: 深入了解 PDF 處理、AI 呼叫或 DB 寫入細節。
