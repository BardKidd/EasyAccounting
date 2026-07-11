# AI 聊天助手面板 — Implementation Tasks

> Spec: [spec.md](./spec.md)
> Status: SHIPPED — 任務 1–4.3 全部完成，僅剩 4.4 手動 E2E（見 spec.md ⚠️ 三處實作差異，尤 FR-5 範圍）

## Tasks

### 1. Data Layer (MongoDB + Vector Search)

- [x] 1.1 建立 MongoDB `knowledge_chunks` collection schema (Mongoose model)
- [x] 1.2 建立 MongoDB Atlas Vector Search Index
- [x] 1.3 建立知識文件 seed 腳本（讀取 markdown → chunk → embed → 存入 MongoDB）

### 2. Backend

- [x] 2.1 安裝 `@google/generative-ai` SDK（用於 embedding）
- [x] 2.2 建立 `chatService.ts`（embedding 生成、vector search、Gemini 呼叫、SSE streaming）
- [x] 2.3 建立 `chatController.ts`（處理 SSE streaming response + 偵測客戶端斷線）
- [x] 2.4 建立 `chatRoute.ts` + 註冊到 `app.ts`
- [x] 2.5 建立 seed endpoint 或 CLI script 來初始化知識庫（讀取 `docs/specs/*.md`）
- [x] 2.6 啟用 MongoDB 連線（取消 `app.ts` 中的 `mongoConnection()` 註解）

### 3. Frontend

- [x] 3.1 修改 `MainLayout` — 加入 `isChatOpen` state 並調整 layout（主內容區域縮小）
- [x] 3.2 修改 `Header` — 新增 AI chat toggle button icon
- [x] 3.3 建立 `hooks/useChat.ts` — 聊天狀態管理 + SSE 連線 + AbortController（停止生成）
- [x] 3.4 建立 `services/chatService.ts` — SSE fetch wrapper with abort support
- [x] 3.5 建立 `components/chat/ChatPanel.tsx` — 面板主容器（header + 訊息列表 + 輸入區）
- [x] 3.6 建立 `components/chat/ChatMessage.tsx` — 訊息氣泡（支援 streaming 逐字顯示）
- [x] 3.7 建立 `components/chat/ChatInput.tsx` — 輸入框 + 送出按鈕 + 停止按鈕（生成中切換）
- [x] 3.8 手機版全螢幕模式處理
- [x] 3.9 深色/淺色模式適配

### 4. Testing

- [x] 4.1 後端 chatService unit test（mock OpenRouter + Google embedding）
- [x] 4.2 前端 ChatPanel 元件 render test
- [x] 4.3 前端 useChat hook test
- [ ] 4.4 手動 E2E 測試：開啟面板、發送訊息、streaming 顯示、停止生成、關閉面板
