# AI 聊天助手面板

> Status: DRAFT
> Created: 2026-03-11
> Last Updated: 2026-03-11

## Summary

在系統內嵌入 AI 聊天助手面板，使用者可透過 Header 上的按鈕展開右側對話面板。面板不覆蓋現有內容，而是將主內容區域縮小以騰出空間。AI 助手使用 RAG + 向量資料庫，僅回答系統邏輯與操作流程相關問題。

## Background & Motivation

使用者在使用 EasyAccounting 期間，可能對系統功能或操作流程有疑問。透過內建的 AI 助手，使用者能即時獲得系統操作指引，無需離開當前頁面或查閱外部文件。

## Requirements

### Functional Requirements

- [ ] FR-1: Header 新增 AI 聊天 icon 按鈕（`MessageSquare` 或類似 icon）
- [ ] FR-2: 點擊按鈕從右側展開聊天面板，再次點擊收起
- [ ] FR-3: 面板展開時主內容區域自動縮小（非覆蓋），面板寬度與 Sidebar 相當（~250px）
- [ ] FR-4: 使用者可在面板內輸入問題，AI 即時回覆
- [ ] FR-5: AI 使用 RAG + 向量資料庫，僅回答系統邏輯與操作流程
- [ ] FR-6: 對話紀錄在頁面重整或離開時清除（不持久化）
- [ ] FR-7: 手機版全螢幕顯示聊天面板
- [ ] FR-8: 訪客和註冊用戶皆可使用
- [ ] FR-9: AI 回覆進行中時，禁用輸入框（不可發送新訊息）
- [ ] FR-10: AI 回覆進行中時，顯示「停止」按鈕，按下後中斷串流並保留已生成的內容

### Non-Functional Requirements

- [ ] NFR-1: 聊天回覆使用 SSE streaming + typewriter effect（逐字/逐 token 顯示，非全部跑完才貼上）
- [ ] NFR-2: 面板展開/收起應有平滑動畫 transition
- [ ] NFR-3: 符合現有深色/淺色模式設計系統

## Technical Design

### Architecture: RAG + Vector DB

```
使用者提問 → Backend API → Embedding → MongoDB Vector Search 檢索相關文件 → Gemini 2.5 Flash 生成回答 → SSE 串流回前端
```

- **LLM**: Google Gemini 2.5 Flash（透過 OpenRouter，複用現有 `openRouterService` 模式，model ID: `google/gemini-2.5-flash`）
- **向量資料庫**: MongoDB Atlas Vector Search（M0 免費集群，複用現有 mongoose/mongodb 基礎建設）
- **Embedding Model**: Google `text-embedding-004`（透過 `@google/generative-ai` SDK，OpenRouter 不支援 embedding）
- **知識文件**: `docs/specs/*.md` 中的所有 spec 文件，透過 seed script 切 chunk → embed → 存入 MongoDB

### Data Model

#### MongoDB Collection: `knowledge_chunks`

```typescript
{
  _id: ObjectId,
  content: string,          // 文件原文 chunk
  embedding: number[],      // 向量 embedding (768 or 1536 dim)
  metadata: {
    source: string,         // 來源文件名
    section: string,        // 章節標題
  },
  createdAt: Date,
}
```

需要建立 MongoDB Atlas Vector Search Index。

### API Changes

#### `POST /api/chat` (SSE streaming)

- **Request**: `{ message: string, history: { role: string, content: string }[] }`
- **Response**: Server-Sent Events，每個 event 包含 `data: { content: string }` 的 chunk
- **Headers**: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`
- **Process**:
  1. 用 Google `text-embedding-004` 將 user message 轉為向量
  2. 在 `knowledge_chunks` 集合中做 MongoDB Atlas Vector Search 取 top-5 相關 chunks
  3. 將 chunks 作為 context + system prompt + user message + 最近歷史送給 Gemini 2.5 Flash
  4. 串流回覆給前端（逐 token SSE event）
  5. 前端可隨時中斷連線（AbortController），後端偵測到斷線停止生成

#### `POST /api/chat/seed` (Development/Admin only)

- 讀取知識文件、分 chunk、生成 embedding、存入 MongoDB
- 用於初始化或更新知識庫

### Frontend Changes

#### 狀態管理

- 在 `MainLayout` 層級管理 `isChatOpen` state
- 透過 React Context 或 prop drilling 傳遞 toggle function 給 Header

#### 元件架構

```
MainLayout
├── Sidebar
├── Content Area (flex-1, 帶 transition)
│   ├── Header (含 AI chat toggle button)
│   └── main
└── ChatPanel (conditional, 帶 slide-in animation)
```

#### 新增檔案

- `components/chat/ChatPanel.tsx` — 主面板容器（header、訊息列表、輸入框）
- `components/chat/ChatMessage.tsx` — 單則訊息氣泡
- `components/chat/ChatInput.tsx` — 輸入框 + 送出按鈕
- `hooks/useChat.ts` — 管理聊天狀態、SSE 連線、訊息陣列
- `services/chatService.ts` — 呼叫 `/api/chat` 的 SSE fetch

## Edge Cases & Error Handling

- **API 超時/錯誤**: 顯示錯誤訊息在對話中，允許重試
- **空白訊息**: 禁用送出按鈕
- **超長回覆**: 聊天區域自動捲動到底部
- **知識庫為空**: 回傳通用「我目前無法回答這個問題」
- **使用者中斷串流**: 前端 AbortController 中斷 SSE，保留已生成的文字
- **Rate limiting**: 前端 debounce + 後端考慮 rate limit

## Out of Scope

- 對話紀錄持久化到 DB
- AI 存取使用者個人交易資料
- 多輪 context window 管理（僅傳最近 5 輪歷史）
- 管理者後台管理知識庫 UI
- Markdown 渲染（AI 回覆先以純文字顯示）

## Open Questions

- [x] ~~MongoDB Atlas 環境是否已設定？~~ → 需要設定 M0 免費集群，取得 `MONGODB_URL`
- [x] ~~OpenRouter 是否支援 Gemini 2.5 Flash？~~ → 是，model ID: `google/gemini-2.5-flash`
- [x] ~~Embedding model 的選擇~~ → Google `text-embedding-004`（透過 `@google/generative-ai` SDK）
- [x] ~~知識文件內容從哪來？~~ → `docs/specs/*.md`
- [ ] 需要確認使用者是否有 Google AI API Key（用於 embedding）
- [ ] 需要設定 MongoDB Atlas M0 並取得連線字串
