# User API Specification

這份文件定義了 User 模組的 API 行為規格，將作為測試與實作的依據。

## 1. 註冊 (Registration)

- **Endpoint**: `POST /api/user`
- **Auth**: 公開 (Public)，不需要 Cookie。
- **Input (Body)**:
  - `name`: string (必填)
  - `email`: string (必填, 格式驗證)
  - `password`: string (必填)
- **行為 (Behavior)**:
  1.  **密碼加密**: 系統必須將密碼加密 (Hash) 後存入 `user` table。
  2.  **初始化通知**: 註冊成功後，必須**同步呼叫** `personnelNotificationServices.postPersonnelNotification`。
      - 預設設定:
        - `isDailyNotification`: false
        - `isWeeklySummaryNotification`: false
        - `isMonthlyAnalysisNotification`: **true** (只開啟月報)
  3.  **歡迎信**: 系統會發送歡迎信 (Welcome Email)。
- **Output**: 201 Created.

- **Endpoint**: `POST /api/auth/logout`
- **行為 (Behavior)**:
  - 清除使用者的 Cookie (`token`)。
  - 無需 Cookie 即可呼叫（如果不強制檢查 Login 狀態的話），但通常用於已登入者。
- **Output**: 200 OK.

## 2. 編輯使用者 (Edit User)

- **Endpoint**: `PUT /api/user/:id`
- **Auth**: 需要登入 (Auth Required)。
- **Input (Body)**: 同註冊 Schema (前後端一致)。
  - `name`, `email`, `password` 等。
- **行為 (Behavior)**:
  - 若傳入 `password`，系統必須**重新加密**後更新。
  - 需先檢查使用者是否存在。
- **Output**: 200 OK (回傳完整 User Object 或 Success Message)。

## 3. 刪除使用者 (Delete User)

- **Endpoint**: `DELETE /api/user/:id`
- **Auth**: 需要登入 (Auth Required)。
- **行為 (Behavior)**:
  - 根據 URL 帶入的 ID 刪除使用者。
  - **Cascade Delete (Soft Delete)**:
    - 系統啟用 **軟刪除 (Soft Delete)** (`paranoid: true`)。
    - **應用層連動 (Application Cascade)**: 透過 Sequelize Hook (`hooks: true`) 實作。
    - 當 User 被軟刪除時，系統會自動搜尋並軟刪除其下屬資料：
      - **Account**
      - **Transaction**
      - **PersonnelNotification**
      - **Category**
    - **資料庫層 (DB Level)**: 使用 `onDelete: 'CASCADE'` 作為硬刪除 (Hard Delete) 的最後防線，但在一般軟刪除操作中不觸發。
- **Output**: 200 OK.
