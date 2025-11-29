# Backend 專案說明

## 專案結構

```
apps/backend/
├── database/              # Migration 相關檔案統一管理
│   ├── config.js         # 資料庫連線設定（給 CLI 使用）
│   ├── migrations/       # Migration 腳本存放處
│   ├── seeders/          # 種子資料存放處
│   └── models/           # CLI 產生的 models（可選用）
├── src/
│   ├── models/           # TypeScript models（實際使用）
│   ├── controllers/      # 控制器
│   ├── routes/           # 路由
│   ├── middlewares/      # 中介層
│   ├── services/         # 服務層
│   └── utils/
│       └── postgres.ts   # App 執行時的資料庫連線
└── .sequelizerc          # Sequelize CLI 設定檔
```

## 資料庫 Migration

本專案使用 **Sequelize CLI** 來管理資料庫結構變更（Migration）。

### 為什麼使用 Migration？

- ✅ 所有資料庫結構變更都有版本記錄
- ✅ 團隊成員的資料庫結構保持一致
- ✅ 可以追蹤誰在什麼時候做了什麼變更
- ✅ 部署到正式環境時可以自動執行
- ✅ 支援回退（Rollback）

### 拉下新版本後

當您從 Git 拉下新版本後，請執行以下指令來更新資料庫結構：

```bash
pnpm run db:migrate:up
# 輸入環境：dev（開發環境）或 prd（正式環境）
```

這會自動執行所有尚未執行的 migration。

### 檢查 Migration 狀態

想知道哪些 migration 已執行、哪些尚未執行：

```bash
npx sequelize-cli db:migrate:status
```

### 建立新的 Migration

當您需要修改資料庫結構（例如新增欄位、修改欄位、建立新表格）時：

```bash
pnpm run db:migrate
# 輸入 migration 名稱，例如：add-user-phone
```

這會在 `database/migrations/` 資料夾中產生一個新的 migration 檔案。

### 編輯 Migration 檔案

產生的 migration 檔案會有 `up` 和 `down` 兩個方法：

```javascript
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 執行變更（例如新增欄位）
    await queryInterface.addColumn(
      { tableName: 'users', schema: 'accounting' },
      'phone',
      {
        type: Sequelize.STRING,
        allowNull: true,
      }
    );
  },

  async down(queryInterface, Sequelize) {
    // 回退變更（例如移除欄位）
    await queryInterface.removeColumn(
      { tableName: 'users', schema: 'accounting' },
      'phone'
    );
  },
};
```

### ⚠️ 重要注意事項

1. **必須指定 schema**：本專案使用 `accounting` schema，所有 migration 都要明確指定：

   ```javascript
   { tableName: 'users', schema: 'accounting' }
   ```

2. **必須實作 `down` 方法**：確保 migration 可以回退，方便測試和緊急修復。

3. **不要直接用 SQL 修改結構**：所有資料庫結構變更都應該透過 migration 進行，否則團隊成員的資料庫會不一致。

4. **Migration 檔案不要刪除**：已經執行過的 migration 檔案不應該刪除或修改，如果需要修正，請建立新的 migration。

### 回退 Migration

如果需要回退最後一個 migration（通常只在開發環境使用）：

```bash
pnpm run db:migrate:down
# 輸入環境：dev
```

### 常用的 Migration 操作

#### 新增欄位

```javascript
await queryInterface.addColumn(
  { tableName: 'users', schema: 'accounting' },
  'age',
  { type: Sequelize.INTEGER, allowNull: true }
);
```

#### 移除欄位

```javascript
await queryInterface.removeColumn(
  { tableName: 'users', schema: 'accounting' },
  'age'
);
```

#### 建立新表格

```javascript
await queryInterface.createTable(
  { tableName: 'posts', schema: 'accounting' },
  {
    id: {
      type: Sequelize.UUID,
      primaryKey: true,
      defaultValue: Sequelize.UUIDV4,
    },
    title: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  }
);
```

#### 刪除表格

```javascript
await queryInterface.dropTable({
  tableName: 'posts',
  schema: 'accounting',
});
```

## 環境設定

本專案支援兩個環境：

- **dev**：開發環境
- **prd**：正式環境

環境設定檔位於 `database/config.js`，會根據 `NODE_ENV` 環境變數來決定使用哪個設定。

## 開發流程

### 日常開發

1. 拉下最新程式碼

   ```bash
   git pull
   ```

2. 安裝依賴

   ```bash
   pnpm install
   ```

3. 更新資料庫結構

   ```bash
   pnpm run db:migrate:up
   ```

4. 啟動開發伺服器
   ```bash
   pnpm run dev
   ```

### 新增功能需要修改資料庫時

1. 建立 migration

   ```bash
   pnpm run db:migrate
   ```

2. 編輯產生的 migration 檔案

3. 執行 migration 測試

   ```bash
   pnpm run db:migrate:up
   ```

4. 如果有問題，回退並修正

   ```bash
   pnpm run db:migrate:down
   # 修改 migration 檔案
   pnpm run db:migrate:up
   ```

5. 確認無誤後提交到版本控制
   ```bash
   git add database/migrations/
   git commit -m "Add migration: xxx"
   git push
   ```

## 部署到正式環境

部署時，記得執行 migration：

```bash
NODE_ENV=prd pnpm run db:migrate:up
```

或在部署腳本中加上：

```bash
#!/bin/bash
git pull
pnpm install
NODE_ENV=prd pnpm run db:migrate:up
pnpm run start
```

## 常見問題

### Q: 我可以修改已經執行過的 migration 嗎？

**不可以**。如果 migration 已經在其他環境（例如正式環境）執行過，修改它會導致資料庫不一致。正確做法是建立新的 migration 來修正。

### Q: 我不小心執行了錯誤的 migration，怎麼辦？

在開發環境可以用 `pnpm run db:migrate:down` 回退。在正式環境則需要謹慎評估，可能需要建立新的 migration 來修正。

### Q: Migration 和 Model 的關係是什麼？

- **Migration**：管理資料庫**結構**（表格、欄位）
- **Model**（`src/models/`）：定義資料的**操作方式**（查詢、新增、修改）

兩者需要保持一致，但是獨立管理。

### Q: 為什麼要用 Migration 而不是直接改資料庫？

因為直接改資料庫：

- 其他開發者不知道您改了什麼
- 無法追蹤變更歷史
- 部署時容易遺漏
- 無法回退

## 相關指令總覽

```bash
# Migration
pnpm run db:migrate              # 建立新的 migration
pnpm run db:migrate:up           # 執行所有未執行的 migration
pnpm run db:migrate:down         # 回退最後一個 migration
npx sequelize-cli db:migrate:status  # 查看 migration 狀態

# 開發
pnpm run dev                     # 啟動開發伺服器
pnpm run start                   # 啟動正式伺服器
```
