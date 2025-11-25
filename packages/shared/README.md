# @repo/shared

共用的 TypeScript 程式碼,包含:

- **Zod Schemas** - API 請求/回應的驗證 schema
- **TypeScript Types** - 前後端共用的型別定義
- **Constants** - 常數定義 (enums, 設定值等)

## 使用方式

### 在 Backend 中使用

```typescript
import { createCategorySchema, MainType, SubType } from '@repo/shared';
import { validate } from '../middlewares/validate';

// 在 route 中使用驗證
router.post(
  '/category',
  validate(createCategorySchema),
  categoryController.postCategory
);

// 在程式碼中使用 enum
const mainTypes = Object.values(MainType);
```

### 在 Frontend 中使用

```typescript
import {
  createCategorySchema,
  type CreateCategoryInput,
  MainType,
} from '@repo/shared';

// 使用型別
const categoryData: CreateCategoryInput = {
  name: '飲食',
  type: MainType.EXPENSE,
  userId: null,
};

// 驗證資料
const result = createCategorySchema.safeParse(categoryData);
if (result.success) {
  // 資料有效
  await api.createCategory(result.data);
}
```
