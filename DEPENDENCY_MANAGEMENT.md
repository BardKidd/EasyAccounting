# 依賴管理策略

本文件說明 EasyAccounting monorepo 的依賴管理策略。

## 依賴分層架構

```
根目錄 (package.json)
├── 開發工具 (所有專案共用)
│   ├── TypeScript 5.9.3
│   ├── @types/node 22.15.3
│   ├── Prettier
│   └── Turbo
│
packages/eslint-config (@repo/eslint-config)
├── 共享的 ESLint 配置
│   ├── base.js - 基礎配置
│   ├── next.js - Next.js 專用配置
│   └── react-internal.js - React 內部配置
│
packages/shared (@repo/shared)
├── 共享的運行時依賴
│   └── Zod 3.22.4
│
apps/backend
├── 透過 @repo/shared 使用 Zod
├── 透過根目錄使用 TypeScript
└── Backend 特定依賴 (Express, Sequelize 等)
│
apps/frontend
├── 透過 @repo/shared 使用 Zod
├── 透過 @repo/eslint-config 使用 ESLint 配置
├── 透過根目錄使用 TypeScript
└── Frontend 特定依賴 (Next.js, React 等)
```

## 核心原則

### 1. 開發工具提升到根目錄

**提升的依賴:**

- `typescript`: 5.9.3
- `@types/node`: 22.15.3

**原因:**

- 確保所有專案使用相同版本的 TypeScript 編譯器
- 避免工具鏈問題 (IDE、編譯器等)
- 減少重複安裝,節省磁碟空間

**使用方式:**
所有子專案自動繼承這些依賴,無需在各自的 `package.json` 中聲明。

### 2. 共享的運行時依賴放在 @repo/shared

**共享的依賴:**

- `zod`: 3.22.4

**原因:**

- Zod 用於定義前後端共享的 schemas
- 確保前後端使用相同版本的 Zod,避免驗證行為不一致
- 統一管理,只需要在一個地方更新版本

**使用方式:**

```json
// apps/backend/package.json 或 apps/frontend/package.json
{
  "dependencies": {
    "@repo/shared": "workspace:*"
  }
}
```

在程式碼中:

```typescript
// 可以直接使用 zod,因為它是 @repo/shared 的依賴
import { z } from 'zod';
import { transactionSchema } from '@repo/shared';

// 使用共享的 schema
const result = transactionSchema.parse(data);
```

### 3. 共享的 ESLint 配置放在 @repo/eslint-config

**共享的配置:**

- `base.js` - 基礎 ESLint 配置 (TypeScript, Turbo, Prettier)
- `next.js` - Next.js 專用配置 (React, Next.js 規則)
- `react-internal.js` - React 內部組件配置

**原因:**

- 確保所有專案遵循相同的程式碼規範
- 集中管理 ESLint 規則,避免配置不一致
- 減少重複配置,簡化維護

**使用方式:**

```javascript
// apps/frontend/eslint.config.mjs
import { nextJsConfig } from '@repo/eslint-config/next-js';

export default nextJsConfig;
```

```javascript
// apps/backend/eslint.config.mjs (如果需要)
import { config } from '@repo/eslint-config/base';

export default config;
```

### 4. 專案特定依賴保留在各自的 package.json

**Backend 特定:**

- Express, Sequelize, MongoDB, PostgreSQL 等

**Frontend 特定:**

- Next.js, React, Tailwind CSS 等

## 版本更新流程

### 更新 TypeScript

```bash
# 在根目錄更新
cd /Users/rinouo/Frontend/Projects/EasyAccounting
pnpm add -D -w typescript@latest
pnpm install
```

### 更新 Zod

```bash
# 在 shared 套件更新
cd packages/shared
pnpm add zod@latest
cd ../..
pnpm install
```

### 更新專案特定依賴

```bash
# Backend
cd apps/backend
pnpm add express@latest

# Frontend
cd apps/frontend
pnpm add next@latest
```

## 檢查依賴版本

```bash
# 查看所有專案的依賴樹
pnpm list --depth=0

# 查看特定套件的版本
pnpm list typescript
pnpm list zod
```

## 常見問題

### Q: 為什麼 TypeScript 不放在 @repo/shared?

A: TypeScript 是編譯工具,不是運行時依賴。放在根目錄可以:

- 讓所有專案的 IDE 和編譯器使用同一個版本
- 避免工具鏈找不到 TypeScript 的問題
- 符合 monorepo 的最佳實踐

### Q: 如果 frontend 不需要 Zod 怎麼辦?

A: 如果 frontend 不使用 `@repo/shared` 中的 schemas,可以移除 `@repo/shared` 依賴。但建議保留,因為:

- 前後端可以共享相同的資料驗證邏輯
- 確保 API 請求/回應的資料結構一致
- 提升類型安全性

### Q: 如何確保版本同步?

A:

1. TypeScript 和 @types/node: 由根目錄統一管理
2. Zod: 由 @repo/shared 統一管理
3. 其他共享依賴: 考慮加入 @repo/shared 或根目錄

## 優點總結

✅ **版本一致性**: 前後端使用相同版本的 TypeScript 和 Zod  
✅ **簡化維護**: 只需要在一個地方更新版本  
✅ **減少體積**: pnpm 可以更好地共享依賴,減少 node_modules 大小  
✅ **類型安全**: 確保前後端的類型定義完全一致  
✅ **避免衝突**: 不會出現不同版本的相同套件導致的問題

## 下次新增共享依賴時

1. **判斷依賴類型:**
   - 開發工具 (TypeScript, ESLint 等) → 根目錄 `devDependencies`
   - 前後端都需要的運行時套件 → `@repo/shared` 的 `dependencies`
   - 專案特定套件 → 各自的 `package.json`

2. **更新 package.json**

3. **執行 `pnpm install`**

4. **更新此文件** 📝
