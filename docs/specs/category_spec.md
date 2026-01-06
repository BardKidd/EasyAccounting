# Category API Specification

## 1. 階層結構 (Hierarchy)

系統採用三層式分類結構：

1.  **Root Category (根分類)**
    - `parentId`: NULL (或系統預定義的頂層)
    - 代表大方向 (如：收入、支出、操作)。
    - 對應代碼中的 `MainType` (INCOME, EXPENSE, OPERATE)。
    - User **不能** 建立 Root Category。

2.  **Main Category (主分類)**
    - `parentId`: 指向 Root Category 的 ID。
    - User 可以建立。
    - 可以沒有 Sub Category。

3.  **Sub Category (子分類)**
    - **Rename Note**: 原本程式碼中的 `detailCategory` **必須** 更名為 `subCategory`。
    - `parentId`: 指向 Main Category 的 ID。
    - User 可以建立，但必須指向某個 Main Category，否則需要視為 Main Category(parentId 為某個 Root Category)。

## 2. 權限與擁有權 (Ownership & Permissions)

- **預設分類 (Default Categories)**
  - `userId`: NULL
  - 所有使用者皆可見。
  - **唯讀 (Read-only)**: 使用者無法修改或刪除 (Delete/Update 需擋下)。

- **自訂分類 (User Custom Categories)**
  - `userId`: 必填 (UUID)
  - 只有該使用者可見。
  - **可完全控制 (Full Control)**: 使用者可編輯、刪除。

## 3. 資料庫行為 (DB Behavior)

- **刪除 (Deletion)**
  - **硬刪除 (Hard Delete)**: `Category` Model 設定 `paranoid: false` (已確認)。
  - **Cascade**: 刪除父分類時，子分類必須被一併刪除。
    - `Main` 刪除 -> `Sub` 一併刪除。

## 4. API Endpoints

### GET /api/category

- **Auth**: Required.
- **Response**:
  - 回傳巢狀結構 (Nested Structure) 或 包含 Parent 資訊的 List。
  - 需合併：`Default Categories` + `User's Categories`.

### POST /api/category

- **Auth**: Required.
- **Body**:
  - `name`: string
  - `parentId`: string (Required)
  - `icon`: string (Optional, Default: `'tag'`)
  - `color`: string (Optional, Default: `'#3b82f6'`)
- **Logic**:
  - 自動填入 `auth.userId`。
  - 驗證 `parentId` 是否合法 (存在且符合階層規則)。

### PUT /api/category/:id

- **Auth**: Required.
- **Logic**:
  - **權限檢查**: 只能修改 `userId == currentUserId` 的資料。
  - 若嘗試修改 Default Category -> 403 Forbidden.

### DELETE /api/category/:id

- **Auth**: Required.
- **Logic**:
  - **權限檢查**: 只能刪除 `userId == currentUserId` 的資料。
  - 執行硬刪除 (Hard Delete)。
