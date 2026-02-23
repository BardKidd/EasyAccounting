# PDF 帳單分析 (PDF Bill Analysis) - 程式碼閱讀指南

這份指南依照「系統架構」與「實際執行順序」整理了核心檔案的閱讀路徑，幫助您快速掌握 `@docs/specs/pdf-bill-analysis-rfc.md` 所描述功能的實作細節。建議您按照以下流程循序漸進地閱讀原始碼。

---

## 建議閱讀順序

1. **先看資料庫 Schema 與核心型別**：了解資料長什麼樣子。
2. **再看前端的起點**：了解本地如何把 PDF 轉成圖片上傳。
3. **接著看後端 API 如何接單**：了解連線與狀態管理的建立。
4. **最後看 Worker 處理與 AI 呼叫**：了解核心業務邏輯。

---

## 階段一：資料模型與核心型別 (Data Models)

建議最先了解 AI 回傳的結構與資料庫中追蹤任務的表格。

1. **AI 回傳格式定義**: `apps/backend/src/validation/llmResponseSchema.ts`
   - 使用 Zod 定義了 `TransactionSchema`，這是傳給 OpenRouter 的 JSON Schema，也是決定資料準確度的核心結構。
2. **Telemetry 與暫存結構**: (請查看 Prisma 或 Drizzle/Typeorm 的對應實體檔案）
   - `bill_parse_telemetry` 表格定義：負責追蹤任務狀態（`PROCESSING` / `COMPLETED`）
   - `pending_transaction` 表格定義：暫存 AI 解析的交易，等候用戶確認。
   - `merchant_mapping` 表格定義：商家名稱與分類的映射表。

---

## 階段二：前端上傳與 PDF 處理 (Frontend - Upload)

此階段在用戶瀏覽器中把 PDF 轉成圖片。

1. **PDF 轉圖片工具**: `apps/frontend/src/lib/pdfUtils.ts`
   - 包含 `pdfjs-dist` 的 Worker 配置與 `pdfToImages` 函式。這一段是將 PDF 每一頁 Canvas 渲染後轉成 JPEG 的核心。
2. **UI 與頁面入口**: `apps/frontend/src/app/(main)/bill-import/page.tsx`
   - 這是帳單匯入的主頁面，管理上傳、顯示縮圖、以及處理中 / 處理完成的狀態切換。
3. **組件層級**:
   - (若有) `FileUploader`: 處理圖片勾選或全選的 UI。

---

## 階段三：後端接單與即時通知 (Backend API & SSE)

當前端把圖片上傳後，後端的處理以及建立 SSE 長連線。

1. **API 路由**: `apps/backend/src/routes/pdfRoute.ts`
   - 負責定義所有的 PDF 相關端點：`POST /pdf/upload`、`POST /pdf/parse/:uploadId` 等。
2. **控制器**: `apps/backend/src/controllers/pdfController.ts`
   - `upload`：驗證上傳圖片並寫入 `bill_parse_telemetry`。
   - `triggerParse`：發送任務到 Service Bus Queue。
   - `stream`：建立 SSE 監聽，負責回傳即時狀態進度。
3. **狀態與上傳服務**: `apps/backend/src/services/pdfService.ts` & `apps/backend/src/utils/parseStatus.ts`
   - 包含了將短暫圖片上傳到 Azure Blob 暫存的邏輯。
   - In-memory EventEmitter 負責管理與推送各個上傳任務的處理進度。

---

## 階段四：背景解析與 AI 任務 (Worker & AI)

這是在背景執行的核心邏輯。

1. **Worker 進入點**: `apps/backend/src/worker.ts`
   - Azure Service Bus Consumer 的進入點，監聽 `bill-parse-queue` 的 Queue 訊息。
   - 這是控制後續幾個步驟的主幹 (`processMessage`)。
2. **AI 解析邏輯**: `apps/backend/src/services/openRouterService.ts`
   - `parseImages`：調用 OpenRouter (Gemini 2.5 Flash Lite) 的實作。內含 System Prompt 以及圖片參數。
3. **業務邏輯處理**: `apps/backend/src/services/billParseService.ts`
   - `saveParsedResults`：將 AI 吐回來的資料轉換後存進 `pending_transaction`。
   - `suggestCategory`：查詢 `merchant_mapping` 給予預設分類。
   - `matchExistingTransaction`：處理是否為現有分期交易的判斷。

---

## 階段五：確認與寫入 (Confirmation)

解析完成後，前端重新拉取資料，用戶手動修改並批次確認寫入真實的 `transaction` 表。

1. **前端表格元件**: (`apps/frontend/src/components/bill-import/` 下的 Table 相關元件)
   - 用戶修改類別、處理「略過」與「合併成折扣」操作的地方。
2. **控制器 API**: `apps/backend/src/controllers/pdfController.ts` 中的 `confirm`
3. **寫入服務**: `apps/backend/src/services/billParseService.ts` 中的確認寫入函式。
   - 將 `pending_transaction` 正式寫入 `transaction`。
   - 清除過期的暫存資料。
   - 更新 `merchant_mapping` 學習與 `bill_parse_telemetry` 的準確率統計。

---

> **💡 快速複習架構**：
> `[前端] pdfUtils.ts 轉圖片` -> `[後端 API] pdfController.ts 接單存 Blob & Queue` -> `[後端 Worker] worker.ts 呼叫 openRouterService.ts` -> `AI 解析完成寫入 Database` -> `[前端] SSE 收到通知拉取結果` -> `用戶確認後 API 收尾`。
