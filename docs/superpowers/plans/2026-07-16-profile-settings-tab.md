# 個人檔案 Tab 與設定入口 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Header 頭像 dropdown 的「個人檔案」「設定」兩顆按鈕生效：設定 → `/settings`，個人檔案 → `/settings?tab=profile` 新 tab（改名、變更密碼、刪除帳號）。

**Architecture:** 前後端共用 `@repo/shared` zod schemas；後端新增三個 self-scoped endpoints（`PATCH /user/profile`、`PATCH /user/password`、`DELETE /user/me`），身分一律取自 JWT token；前端新增四個 settings 元件（三卡片 + 容器），settings 頁支援 `?tab=` 深連結白名單。

**Tech Stack:** Express 5 + Sequelize（backend）、Next.js 16 App Router + RHF + zodResolver + shadcn/ui + sonner（frontend）、vitest（兩端測試）。

**Spec:** `docs/superpowers/specs/2026-07-16-profile-settings-tab-design.md`

## Global Constraints

- **資安（硬性）**：新 API 禁止從 URL path 或 body 接收 userId；身分一律 `(req as any).user?.userId`（token）。新路由不得含 `:id`。
- 新路由必須註冊在 `userRoute.ts` 既有 `/user/:id` 系列**之前**，避免被 `:id` 攔截。
- 密碼 hash 一律 `bcrypt.hash(pw, 12)`；改密碼必 `tokenVersion + 1`（與 reset-password 行為一致，authController.ts:510 同款）。
- UI 文案繁體中文；表單訊息由 `@repo/shared` schema 提供。
- 工作目錄：worktree `.claude/worktrees/feat-profile-settings-tab`（已存在，branch `worktree-feat-profile-settings-tab`）。
- 後端單元測試走 mock-model 模式（參考 `apps/backend/tests/unit/account_controller.test.ts`），單檔不需 DB。
- 指令都在 repo 根目錄或對應 app 目錄跑；型別檢查用根目錄 `pnpm check-types`。

---

### Task 1: Shared schemas

**Files:**
- Modify: `packages/shared/src/schemas/user.schema.ts`

**Interfaces:**
- Produces: `updateProfileSchema`（`{ name: string }`）、`changePasswordSchema`（`{ currentPassword, newPassword }`）、`changePasswordFormSchema`（+ `confirmNewPassword` + 一致性 refine）、types `UpdateProfileInput` / `ChangePasswordInput` / `ChangePasswordFormInput`。已由 `packages/shared/src/index.ts` 的 `export * from './schemas/user.schema'` 自動匯出。

- [ ] **Step 1: 加 schemas**

在 `packages/shared/src/schemas/user.schema.ts` 檔尾（type 區塊前）加入：

```ts
// 個人檔案（self-scoped）：身分一律取自 JWT token，schema 不含 userId
export const updateProfileSchema = z.object({
  name: z.string().min(1, '使用者名稱為必填'),
});

// 變更密碼 — 後端驗證用（不含 confirm）
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, '請輸入目前密碼'),
  newPassword: z.string().min(8, '密碼至少需要 8 個字元'),
});

// 變更密碼 — 前端表單用：加 confirmNewPassword + 一致性檢查
export const changePasswordFormSchema = changePasswordSchema
  .extend({ confirmNewPassword: z.string().min(1, '請再次輸入新密碼') })
  .refine((d) => d.newPassword === d.confirmNewPassword, {
    message: '兩次輸入的密碼不一致',
    path: ['confirmNewPassword'],
  });
```

檔尾 type 區塊加：

```ts
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ChangePasswordFormInput = z.infer<typeof changePasswordFormSchema>;
```

- [ ] **Step 2: 型別檢查**

Run: `pnpm check-types`（repo 根目錄）
Expected: 全部 workspace PASS。

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/schemas/user.schema.ts
git commit -m "feat(shared): 個人檔案與變更密碼 schemas"
```

---

### Task 2: Backend `PATCH /user/profile`

**Files:**
- Modify: `apps/backend/src/controllers/userController.ts`
- Modify: `apps/backend/src/routes/userRoute.ts`
- Test: `apps/backend/tests/unit/user_profile_controller.test.ts`（新檔）

**Interfaces:**
- Consumes: `updateProfileSchema`（Task 1）、`userServices.getUserFromDB(req, res)`（回 user instance 或 undefined，undefined 時已自行回 404）。
- Produces: `userController.updateProfile(req, res)`；route `PATCH /api/user/profile`。

- [ ] **Step 1: 寫失敗測試**

建立 `apps/backend/tests/unit/user_profile_controller.test.ts`：

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import bcrypt from 'bcrypt';
import userController from '@/controllers/userController';
import User from '@/models/user';
import { clearAuthCookie } from '@/utils/auth';

const { createMockModel } = vi.hoisted(() => ({
  createMockModel: () => ({
    create: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    destroy: vi.fn(),
    findByPk: vi.fn(),
    findAll: vi.fn(),
    addHook: vi.fn(),
    hasMany: vi.fn(),
    belongsTo: vi.fn(),
    belongsToMany: vi.fn(),
    hasOne: vi.fn(),
  }),
}));

vi.mock('@/models/user', () => ({ default: createMockModel() }));

vi.mock('@/utils/postgres', () => {
  const mSequelize = {
    transaction: vi.fn(() => ({ commit: vi.fn(), rollback: vi.fn() })),
    define: vi.fn(() => ({
      hasMany: vi.fn(),
      belongsTo: vi.fn(),
      belongsToMany: vi.fn(),
      hasOne: vi.fn(),
      addHook: vi.fn(),
    })),
  };
  return {
    default: mSequelize,
    TABLE_DEFAULT_SETTING: { underscored: true, timestamps: true, paranoid: true },
  };
});

vi.mock('@/utils/common', () => ({
  simplifyTryCatch: async (req: any, res: any, fn: any) => {
    try {
      await fn();
    } catch (error) {
      res.status(500).json({ error });
    }
  },
  responseHelper: (isSuccess: boolean, data: any, message: string, error: any) => ({
    isSuccess,
    data,
    message,
    error,
  }),
}));

vi.mock('@/services/emailService', () => ({
  default: { sendWelcomeEmail: vi.fn() },
}));
vi.mock('@/services/personnelNotificationServices', () => ({
  default: { postPersonnelNotification: vi.fn() },
}));
vi.mock('@/services/baseCurrencyService', () => ({
  changeBaseCurrency: vi.fn(),
}));
vi.mock('@/utils/auth', () => ({
  clearAuthCookie: vi.fn(),
}));

const mockRequest = (body: Record<string, any> = {}) =>
  ({
    user: { userId: 'user-123' },
    body,
    params: {},
    query: {},
  }) as unknown as Request;

const mockResponse = () => {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe('userController self-scoped endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateProfile', () => {
    it('以 token 身分更新 name，body 夾帶 userId 不影響對象', async () => {
      const instance = { update: vi.fn().mockResolvedValue(undefined) };
      (User.findByPk as any).mockResolvedValue(instance);

      const req = mockRequest({ name: '新名字', userId: 'attacker-999' });
      const res = mockResponse();
      await userController.updateProfile(req, res);

      expect(User.findByPk).toHaveBeenCalledWith('user-123');
      expect(instance.update).toHaveBeenCalledWith({ name: '新名字' });
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ isSuccess: true, data: { name: '新名字' } }),
      );
    });

    it('找不到使用者回 404', async () => {
      (User.findByPk as any).mockResolvedValue(null);

      const req = mockRequest({ name: '新名字' });
      const res = mockResponse();
      await userController.updateProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(StatusCodes.NOT_FOUND);
    });
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd apps/backend && pnpm test:run tests/unit/user_profile_controller.test.ts`
Expected: FAIL — `userController.updateProfile is not a function`。

- [ ] **Step 3: 實作 controller**

`apps/backend/src/controllers/userController.ts`：在 `deleteUser` 之後加（`clearAuthCookie` import 留到 Task 4 才加，避免 unused import 卡型別檢查）：

```ts
// ── 個人檔案（self-scoped）：身分一律取自 token，不吃 URL/body 的 userId ──

const updateProfile = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const userInstance = await userServices.getUserFromDB(req, res);
    if (!userInstance) return; // getUserFromDB 已回 404
    const { name } = req.body;
    await userInstance.update({ name });
    res
      .status(StatusCodes.OK)
      .json(responseHelper(true, { name }, '個人資料已更新', null));
  });
};
```

`export default` 物件加 `updateProfile`。

- [ ] **Step 4: 跑測試確認通過**

Run: `cd apps/backend && pnpm test:run tests/unit/user_profile_controller.test.ts`
Expected: PASS（2 tests）。

- [ ] **Step 5: 掛路由**

`apps/backend/src/routes/userRoute.ts`：import 區改為（自 `@repo/shared` 多拉兩個 schema，`changePasswordSchema` 供 Task 3 用，本步先加 `updateProfileSchema` 即可）：

```ts
import { createUserSchema, changeBaseCurrencySchema, updateProfileSchema } from '@repo/shared';
```

在 `router.get('/user/:id', ...)` **之前**插入：

```ts
// 個人檔案（self-scoped）：一律以 token 身分操作，禁止 :id。
// 必須註冊在 /user/:id 系列之前，避免被萬用參數路由攔截。
router.patch(
  '/user/profile',
  authMiddleware,
  validate(updateProfileSchema),
  userController.updateProfile,
);
```

- [ ] **Step 6: 型別檢查 + Commit**

Run: `pnpm check-types`
Expected: PASS。

```bash
git add apps/backend/src/controllers/userController.ts apps/backend/src/routes/userRoute.ts apps/backend/tests/unit/user_profile_controller.test.ts
git commit -m "feat(backend): PATCH /user/profile self-scoped 改名端點"
```

---

### Task 3: Backend `PATCH /user/password`

**Files:**
- Modify: `apps/backend/src/controllers/userController.ts`
- Modify: `apps/backend/src/routes/userRoute.ts`
- Test: `apps/backend/tests/unit/user_profile_controller.test.ts`（追加）

**Interfaces:**
- Consumes: `changePasswordSchema`（Task 1）。
- Produces: `userController.changePassword(req, res)`；route `PATCH /api/user/password`。舊密碼錯 → 400 `目前密碼不正確`；成功 → 200 `密碼已更新，請重新登入`，`tokenVersion + 1`。

- [ ] **Step 1: 追加失敗測試**

`user_profile_controller.test.ts` 的 describe 內追加：

```ts
  describe('changePassword', () => {
    it('目前密碼錯誤回 400，不更新', async () => {
      const instance = {
        password: await bcrypt.hash('correct-old-pw', 4),
        tokenVersion: 5,
        update: vi.fn().mockResolvedValue(undefined),
      };
      (User.findByPk as any).mockResolvedValue(instance);

      const req = mockRequest({
        currentPassword: 'wrong-pw',
        newPassword: 'NewPassword123',
      });
      const res = mockResponse();
      await userController.changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ isSuccess: false, message: '目前密碼不正確' }),
      );
      expect(instance.update).not.toHaveBeenCalled();
    });

    it('目前密碼正確：更新為新 hash 且 tokenVersion +1', async () => {
      const instance = {
        password: await bcrypt.hash('correct-old-pw', 4),
        tokenVersion: 5,
        update: vi.fn().mockResolvedValue(undefined),
      };
      (User.findByPk as any).mockResolvedValue(instance);

      const req = mockRequest({
        currentPassword: 'correct-old-pw',
        newPassword: 'NewPassword123',
      });
      const res = mockResponse();
      await userController.changePassword(req, res);

      expect(instance.update).toHaveBeenCalledTimes(1);
      const arg = (instance.update as any).mock.calls[0][0];
      expect(arg.tokenVersion).toBe(6);
      expect(await bcrypt.compare('NewPassword123', arg.password)).toBe(true);
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    });
  });
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd apps/backend && pnpm test:run tests/unit/user_profile_controller.test.ts`
Expected: FAIL — `userController.changePassword is not a function`。

- [ ] **Step 3: 實作 controller**

`userController.ts` 的 `updateProfile` 之後加：

```ts
const changePassword = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const userInstance = await userServices.getUserFromDB(req, res);
    if (!userInstance) return;
    const { currentPassword, newPassword } = req.body;
    const isMatch = await bcrypt.compare(currentPassword, userInstance.password);
    if (!isMatch) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(responseHelper(false, null, '目前密碼不正確', null));
    }
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    // 安全性：與 reset-password 一致，tokenVersion +1 使全裝置既有 session 立即失效
    await userInstance.update({
      password: hashedPassword,
      tokenVersion: (userInstance.tokenVersion ?? 0) + 1,
    });
    res
      .status(StatusCodes.OK)
      .json(responseHelper(true, null, '密碼已更新，請重新登入', null));
  });
};
```

`export default` 加 `changePassword`。

- [ ] **Step 4: 跑測試確認通過**

Run: `cd apps/backend && pnpm test:run tests/unit/user_profile_controller.test.ts`
Expected: PASS（4 tests）。

- [ ] **Step 5: 掛路由**

`userRoute.ts` import 補 `changePasswordSchema`，在 `/user/profile` 路由之後、`/user/:id` 之前加：

```ts
router.patch(
  '/user/password',
  authMiddleware,
  validate(changePasswordSchema),
  userController.changePassword,
);
```

- [ ] **Step 6: 型別檢查 + Commit**

Run: `pnpm check-types`
Expected: PASS。

```bash
git add apps/backend/src/controllers/userController.ts apps/backend/src/routes/userRoute.ts apps/backend/tests/unit/user_profile_controller.test.ts
git commit -m "feat(backend): PATCH /user/password 驗舊密碼並 bump tokenVersion"
```

---

### Task 4: Backend `DELETE /user/me`

**Files:**
- Modify: `apps/backend/src/controllers/userController.ts`
- Modify: `apps/backend/src/routes/userRoute.ts`
- Test: `apps/backend/tests/unit/user_profile_controller.test.ts`（追加）

**Interfaces:**
- Consumes: `clearAuthCookie(req, res)`（`@/utils/auth`，清 `accessToken`/`refreshToken` cookie）。
- Produces: `userController.deleteMe(req, res)`；route `DELETE /api/user/me`。soft-delete 自己 + 清 cookie。

- [ ] **Step 1: 追加失敗測試**

```ts
  describe('deleteMe', () => {
    it('soft-delete token 使用者並清除 auth cookies', async () => {
      const instance = { destroy: vi.fn().mockResolvedValue(undefined) };
      (User.findByPk as any).mockResolvedValue(instance);

      const req = mockRequest();
      const res = mockResponse();
      await userController.deleteMe(req, res);

      expect(User.findByPk).toHaveBeenCalledWith('user-123');
      expect(instance.destroy).toHaveBeenCalledTimes(1);
      expect(clearAuthCookie).toHaveBeenCalledWith(req, res);
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    });
  });
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd apps/backend && pnpm test:run tests/unit/user_profile_controller.test.ts`
Expected: FAIL — `userController.deleteMe is not a function`。

- [ ] **Step 3: 實作 controller**

`userController.ts` import 區加（若 Task 2 未加）：

```ts
import { clearAuthCookie } from '@/utils/auth';
```

`changePassword` 之後加：

```ts
const deleteMe = (req: Request, res: Response) => {
  simplifyTryCatch(req, res, async () => {
    const userInstance = await userServices.getUserFromDB(req, res);
    if (!userInstance) return;
    // soft-delete；models/index.ts 的 afterDestroy cascade hooks 連帶清理子資料
    await userInstance.destroy();
    clearAuthCookie(req, res);
    res
      .status(StatusCodes.OK)
      .json(responseHelper(true, null, '帳號已刪除', null));
  });
};
```

`export default` 加 `deleteMe`。

- [ ] **Step 4: 跑測試確認通過**

Run: `cd apps/backend && pnpm test:run tests/unit/user_profile_controller.test.ts`
Expected: PASS（5 tests）。

- [ ] **Step 5: 掛路由**

`userRoute.ts`，`/user/password` 之後、`/user/:id` 之前：

```ts
router.delete('/user/me', authMiddleware, userController.deleteMe);
```

- [ ] **Step 6: 型別檢查 + Commit**

Run: `pnpm check-types`
Expected: PASS。

```bash
git add apps/backend/src/controllers/userController.ts apps/backend/src/routes/userRoute.ts apps/backend/tests/unit/user_profile_controller.test.ts
git commit -m "feat(backend): DELETE /user/me 自助刪除帳號並清 cookie"
```

---

### Task 5: 前端 userService + tab 白名單 helper

**Files:**
- Create: `apps/frontend/src/services/userService.ts`
- Create: `apps/frontend/src/components/settings/settingsTabs.ts`
- Test: `apps/frontend/src/components/settings/settingsTabs.test.ts`

**Interfaces:**
- Consumes: `apiHandler(url, method, data)`（`@/lib/utils`）、Task 1 types。
- Produces:
  - `updateProfile(data: UpdateProfileInput): Promise<ResponseHelper<{ name: string }>>`
  - `changePassword(data: ChangePasswordInput): Promise<ResponseHelper<null>>`
  - `deleteAccount(): Promise<ResponseHelper<null>>`
  - `resolveSettingsTab(param: string | string[] | undefined): SettingsTab`、`SETTINGS_TABS`

- [ ] **Step 1: 寫 helper 失敗測試**

`apps/frontend/src/components/settings/settingsTabs.test.ts`：

```ts
import { resolveSettingsTab } from './settingsTabs';

test('有效 tab 值原樣回傳', () => {
  expect(resolveSettingsTab('profile')).toBe('profile');
  expect(resolveSettingsTab('categories')).toBe('categories');
  expect(resolveSettingsTab('notifications')).toBe('notifications');
  expect(resolveSettingsTab('currency')).toBe('currency');
  expect(resolveSettingsTab('tags')).toBe('tags');
});

test('無效值 / 未帶 / 陣列一律 fallback categories', () => {
  expect(resolveSettingsTab('hacker')).toBe('categories');
  expect(resolveSettingsTab(undefined)).toBe('categories');
  expect(resolveSettingsTab(['profile', 'tags'])).toBe('categories');
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd apps/frontend && pnpm test:run src/components/settings/settingsTabs.test.ts`
Expected: FAIL — 模組不存在。

- [ ] **Step 3: 實作 helper**

`apps/frontend/src/components/settings/settingsTabs.ts`：

```ts
export const SETTINGS_TABS = [
  'categories',
  'notifications',
  'currency',
  'tags',
  'profile',
] as const;

export type SettingsTab = (typeof SETTINGS_TABS)[number];

// tab 深連結白名單：無效值或未帶參數一律回 categories（維持現行預設）
export function resolveSettingsTab(
  param: string | string[] | undefined,
): SettingsTab {
  return typeof param === 'string' &&
    (SETTINGS_TABS as readonly string[]).includes(param)
    ? (param as SettingsTab)
    : 'categories';
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `cd apps/frontend && pnpm test:run src/components/settings/settingsTabs.test.ts`
Expected: PASS（2 tests）。

- [ ] **Step 5: 寫 userService**

`apps/frontend/src/services/userService.ts`：

```ts
import { apiHandler } from '@/lib/utils';
import {
  ResponseHelper,
  UpdateProfileInput,
  ChangePasswordInput,
} from '@repo/shared';

// 個人檔案 API 一律 self-scoped：不帶 userId，後端以 token 識別身分

export const updateProfile = async (
  data: UpdateProfileInput,
): Promise<ResponseHelper<{ name: string }>> => {
  return await apiHandler('/user/profile', 'patch', data);
};

export const changePassword = async (
  data: ChangePasswordInput,
): Promise<ResponseHelper<null>> => {
  return await apiHandler('/user/password', 'patch', data);
};

export const deleteAccount = async (): Promise<ResponseHelper<null>> => {
  return await apiHandler('/user/me', 'delete', null);
};
```

- [ ] **Step 6: 型別檢查 + Commit**

Run: `pnpm check-types`
Expected: PASS。

```bash
git add apps/frontend/src/services/userService.ts apps/frontend/src/components/settings/settingsTabs.ts apps/frontend/src/components/settings/settingsTabs.test.ts
git commit -m "feat(frontend): userService 與 settings tab 白名單 helper"
```

---

### Task 6: ProfileInfoCard（帳號資料卡）

**Files:**
- Create: `apps/frontend/src/components/settings/profileInfoCard.tsx`
- Test: `apps/frontend/src/components/settings/profileInfoCard.test.tsx`

**Interfaces:**
- Consumes: `checkSession()`（`@/services/authService`）、`updateProfile()`（Task 5）、`updateProfileSchema` / `UpdateProfileInput`（Task 1）。
- Produces: `<ProfileInfoCard />`（無 props，自行 fetch）。改名成功後更新 `localStorage('user')` 並 `window.dispatchEvent(new Event('user-updated'))`（Task 10 header 監聽）。

- [ ] **Step 1: 寫失敗測試**

`profileInfoCard.test.tsx`：

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { ProfileInfoCard } from './profileInfoCard';

vi.mock('@/services/authService', () => ({
  checkSession: vi.fn().mockResolvedValue({
    isSuccess: true,
    data: {
      name: '小明',
      email: 'ming@example.com',
      isGuest: false,
      baseCurrencyCode: 'TWD',
    },
  }),
}));

const updateProfileMock = vi.fn().mockResolvedValue({
  isSuccess: true,
  data: { name: '新名字' },
  message: '個人資料已更新',
});
vi.mock('@/services/userService', () => ({
  updateProfile: (...args: any[]) => updateProfileMock(...args),
}));

beforeEach(() => {
  updateProfileMock.mockClear();
  localStorage.setItem(
    'user',
    JSON.stringify({ name: '小明', email: 'ming@example.com', isGuest: false }),
  );
});

test('顯示唯讀 email 與現有名稱', async () => {
  render(<ProfileInfoCard />);
  expect(await screen.findByDisplayValue('小明')).toBeInTheDocument();
  expect(screen.getByDisplayValue('ming@example.com')).toBeInTheDocument();
  expect(screen.getByDisplayValue('ming@example.com')).toBeDisabled();
});

test('名稱清空送出顯示驗證錯誤，不打 API', async () => {
  render(<ProfileInfoCard />);
  const nameInput = await screen.findByDisplayValue('小明');
  fireEvent.change(nameInput, { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: '儲存變更' }));
  expect(await screen.findByText('使用者名稱為必填')).toBeInTheDocument();
  expect(updateProfileMock).not.toHaveBeenCalled();
});

test('送出成功呼叫 updateProfile 並更新 localStorage', async () => {
  render(<ProfileInfoCard />);
  const nameInput = await screen.findByDisplayValue('小明');
  fireEvent.change(nameInput, { target: { value: '新名字' } });
  fireEvent.click(screen.getByRole('button', { name: '儲存變更' }));
  await waitFor(() =>
    expect(updateProfileMock).toHaveBeenCalledWith({ name: '新名字' }),
  );
  await waitFor(() =>
    expect(JSON.parse(localStorage.getItem('user')!).name).toBe('新名字'),
  );
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd apps/frontend && pnpm test:run src/components/settings/profileInfoCard.test.tsx`
Expected: FAIL — 模組不存在。

- [ ] **Step 3: 實作元件**

`profileInfoCard.tsx`：

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateProfileSchema, type UpdateProfileInput } from '@repo/shared';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { checkSession } from '@/services/authService';
import { updateProfile } from '@/services/userService';

export function ProfileInfoCard() {
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { name: '' },
  });

  useEffect(() => {
    let mounted = true;
    checkSession()
      .then((res) => {
        if (!mounted || !res?.isSuccess || !res.data) return;
        setEmail(res.data.email);
        form.reset({ name: res.data.name });
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (data: UpdateProfileInput) => {
    setSaving(true);
    try {
      const res = await updateProfile(data);
      if (res.isSuccess) {
        // 同步 header 顯示名稱（header 讀 localStorage + 監聽 user-updated）
        const userStr = localStorage.getItem('user');
        if (userStr) {
          localStorage.setItem(
            'user',
            JSON.stringify({ ...JSON.parse(userStr), name: data.name }),
          );
          window.dispatchEvent(new Event('user-updated'));
        }
        toast.success(res.message || '個人資料已更新');
      } else {
        toast.error(res.message || '更新失敗');
      }
    } catch (err: any) {
      toast.error(err?.message || '更新失敗');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>帳號資料</CardTitle>
        <CardDescription>
          更新顯示名稱。電子郵件為登入帳號，目前不支援修改。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-md">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel>顯示名稱</FormLabel>
                  <FormControl>
                    <Input placeholder="請輸入您的名字" autoComplete="name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormItem className="space-y-1">
              <FormLabel>電子郵件</FormLabel>
              <FormControl>
                <Input value={email} disabled readOnly />
              </FormControl>
            </FormItem>
            <Button type="submit" disabled={saving}>
              {saving ? '儲存中…' : '儲存變更'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default ProfileInfoCard;
```

- [ ] **Step 4: 跑測試確認通過**

Run: `cd apps/frontend && pnpm test:run src/components/settings/profileInfoCard.test.tsx`
Expected: PASS（3 tests）。

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/components/settings/profileInfoCard.tsx apps/frontend/src/components/settings/profileInfoCard.test.tsx
git commit -m "feat(frontend): 帳號資料卡（改顯示名稱、email 唯讀）"
```

---

### Task 7: ChangePasswordCard（變更密碼卡）

**Files:**
- Create: `apps/frontend/src/components/settings/changePasswordCard.tsx`
- Test: `apps/frontend/src/components/settings/changePasswordCard.test.tsx`

**Interfaces:**
- Consumes: `changePasswordFormSchema` / `ChangePasswordFormInput`（Task 1）、`changePassword()`（Task 5）、`clearPushOnLogout()`（`@/lib/pushCleanup`）。
- Produces: `<ChangePasswordCard />`。成功後清 `localStorage('user')`、best-effort `clearPushOnLogout()`、導向 `/login`（後端已 bump tokenVersion + 本次不換發新 token，必須重登）。

- [ ] **Step 1: 寫失敗測試**

`changePasswordCard.test.tsx`：

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { ChangePasswordCard } from './changePasswordCard';

const changePasswordMock = vi.fn().mockResolvedValue({
  isSuccess: true,
  data: null,
  message: '密碼已更新，請重新登入',
});
vi.mock('@/services/userService', () => ({
  changePassword: (...args: any[]) => changePasswordMock(...args),
}));
vi.mock('@/lib/pushCleanup', () => ({
  clearPushOnLogout: vi.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  changePasswordMock.mockClear();
});

const fill = (label: string, value: string) => {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
};

test('兩次新密碼不一致顯示錯誤，不打 API', async () => {
  render(<ChangePasswordCard />);
  fill('目前密碼', 'old-password');
  fill('新密碼', 'NewPassword123');
  fill('確認新密碼', 'Different123');
  fireEvent.click(screen.getByRole('button', { name: '更新密碼' }));
  expect(await screen.findByText('兩次輸入的密碼不一致')).toBeInTheDocument();
  expect(changePasswordMock).not.toHaveBeenCalled();
});

test('新密碼過短顯示錯誤', async () => {
  render(<ChangePasswordCard />);
  fill('目前密碼', 'old-password');
  fill('新密碼', 'short');
  fill('確認新密碼', 'short');
  fireEvent.click(screen.getByRole('button', { name: '更新密碼' }));
  expect(
    await screen.findByText('密碼至少需要 8 個字元'),
  ).toBeInTheDocument();
  expect(changePasswordMock).not.toHaveBeenCalled();
});

test('成功送出只帶 currentPassword/newPassword', async () => {
  render(<ChangePasswordCard />);
  fill('目前密碼', 'old-password');
  fill('新密碼', 'NewPassword123');
  fill('確認新密碼', 'NewPassword123');
  fireEvent.click(screen.getByRole('button', { name: '更新密碼' }));
  await waitFor(() =>
    expect(changePasswordMock).toHaveBeenCalledWith({
      currentPassword: 'old-password',
      newPassword: 'NewPassword123',
    }),
  );
});
```

註：jsdom 不支援真實導頁，`window.location.href` 設定在 jsdom 會丟 navigation not implemented 警告但不會 fail；測試只驗 API payload。

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd apps/frontend && pnpm test:run src/components/settings/changePasswordCard.test.tsx`
Expected: FAIL — 模組不存在。

- [ ] **Step 3: 實作元件**

`changePasswordCard.tsx`：

```tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  changePasswordFormSchema,
  type ChangePasswordFormInput,
} from '@repo/shared';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { changePassword } from '@/services/userService';
import { clearPushOnLogout } from '@/lib/pushCleanup';

export function ChangePasswordCard() {
  const [saving, setSaving] = useState(false);

  const form = useForm<ChangePasswordFormInput>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  const onSubmit = async (data: ChangePasswordFormInput) => {
    setSaving(true);
    try {
      const res = await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      if (res.isSuccess) {
        // tokenVersion 已 +1，所有裝置舊 session 作廢；本地也清乾淨後重登
        toast.success(res.message || '密碼已更新，請重新登入');
        localStorage.removeItem('user');
        await clearPushOnLogout();
        window.location.href = '/login';
      } else {
        form.setError('currentPassword', {
          message: res.message || '目前密碼不正確',
        });
      }
    } catch (err: any) {
      toast.error(err?.message || '更新失敗，請再試一次');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>變更密碼</CardTitle>
        <CardDescription>
          更新密碼後，所有裝置都需要重新登入。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-md">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel>目前密碼</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="current-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel>新密碼</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmNewPassword"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel>確認新密碼</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={saving}>
              {saving ? '更新中…' : '更新密碼'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default ChangePasswordCard;
```

- [ ] **Step 4: 跑測試確認通過**

Run: `cd apps/frontend && pnpm test:run src/components/settings/changePasswordCard.test.tsx`
Expected: PASS（3 tests）。

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/components/settings/changePasswordCard.tsx apps/frontend/src/components/settings/changePasswordCard.test.tsx
git commit -m "feat(frontend): 變更密碼卡（成功後全裝置重登）"
```

---

### Task 8: DeleteAccountCard（危險區）

**Files:**
- Create: `apps/frontend/src/components/settings/deleteAccountCard.tsx`
- Test: `apps/frontend/src/components/settings/deleteAccountCard.test.tsx`

**Interfaces:**
- Consumes: `deleteAccount()`（Task 5）、`clearPushOnLogout()`。
- Produces: `<DeleteAccountCard />`。AlertDialog 需輸入「刪除」才可確認；成功後清本地資料導 `/login`（後端已清 cookie）。

- [ ] **Step 1: 寫失敗測試**

`deleteAccountCard.test.tsx`：

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { DeleteAccountCard } from './deleteAccountCard';

const deleteAccountMock = vi.fn().mockResolvedValue({
  isSuccess: true,
  data: null,
  message: '帳號已刪除',
});
vi.mock('@/services/userService', () => ({
  deleteAccount: (...args: any[]) => deleteAccountMock(...args),
}));
vi.mock('@/lib/pushCleanup', () => ({
  clearPushOnLogout: vi.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  deleteAccountMock.mockClear();
});

test('未輸入「刪除」時確認鈕 disabled', async () => {
  render(<DeleteAccountCard />);
  fireEvent.click(screen.getByRole('button', { name: '刪除帳號' }));
  const confirmBtn = await screen.findByRole('button', { name: '確認刪除' });
  expect(confirmBtn).toBeDisabled();
});

test('輸入「刪除」後可確認並呼叫 deleteAccount', async () => {
  render(<DeleteAccountCard />);
  fireEvent.click(screen.getByRole('button', { name: '刪除帳號' }));
  const input = await screen.findByPlaceholderText('請輸入「刪除」');
  fireEvent.change(input, { target: { value: '刪除' } });
  const confirmBtn = screen.getByRole('button', { name: '確認刪除' });
  expect(confirmBtn).not.toBeDisabled();
  fireEvent.click(confirmBtn);
  await waitFor(() => expect(deleteAccountMock).toHaveBeenCalledTimes(1));
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd apps/frontend && pnpm test:run src/components/settings/deleteAccountCard.test.tsx`
Expected: FAIL — 模組不存在。

- [ ] **Step 3: 實作元件**

`deleteAccountCard.tsx`：

```tsx
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { deleteAccount } from '@/services/userService';
import { clearPushOnLogout } from '@/lib/pushCleanup';

export function DeleteAccountCard() {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const doDelete = async () => {
    setDeleting(true);
    try {
      const res = await deleteAccount();
      if (res.isSuccess) {
        // 後端已 soft-delete + 清 auth cookies；本地清乾淨後回登入頁
        localStorage.removeItem('user');
        await clearPushOnLogout();
        toast.success(res.message || '帳號已刪除');
        window.location.href = '/login';
      } else {
        toast.error(res.message || '刪除失敗');
      }
    } catch (err: any) {
      toast.error(err?.message || '刪除失敗');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="text-destructive">危險區</CardTitle>
        <CardDescription>
          刪除帳號會一併移除所有交易、帳戶、預算等資料，此操作無法復原。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="destructive"
          onClick={() => {
            setConfirmText('');
            setOpen(true);
          }}
        >
          刪除帳號
        </Button>
      </CardContent>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除帳號？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作無法復原。所有交易、帳戶、預算與設定將一併刪除。
              請輸入「刪除」以確認。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="請輸入「刪除」"
            disabled={deleting}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmText !== '刪除' || deleting}
              onClick={(e) => {
                e.preventDefault();
                doDelete();
              }}
            >
              {deleting ? '刪除中…' : '確認刪除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export default DeleteAccountCard;
```

- [ ] **Step 4: 跑測試確認通過**

Run: `cd apps/frontend && pnpm test:run src/components/settings/deleteAccountCard.test.tsx`
Expected: PASS（2 tests）。

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/components/settings/deleteAccountCard.tsx apps/frontend/src/components/settings/deleteAccountCard.test.tsx
git commit -m "feat(frontend): 刪除帳號危險區卡（輸入確認）"
```

---

### Task 9: ProfileSettings 容器 + settings 頁第 5 tab 與深連結

**Files:**
- Create: `apps/frontend/src/components/settings/profileSettings.tsx`
- Modify: `apps/frontend/src/app/(main)/settings/page.tsx`

**Interfaces:**
- Consumes: Task 6–8 三卡、`resolveSettingsTab`（Task 5）。
- Produces: `<ProfileSettings />`；settings 頁支援 `?tab=profile|categories|notifications|currency|tags`。

- [ ] **Step 1: 容器元件**

`profileSettings.tsx`：

```tsx
import { ProfileInfoCard } from './profileInfoCard';
import { ChangePasswordCard } from './changePasswordCard';
import { DeleteAccountCard } from './deleteAccountCard';

export function ProfileSettings() {
  return (
    <div className="space-y-6">
      <ProfileInfoCard />
      <ChangePasswordCard />
      <DeleteAccountCard />
    </div>
  );
}

export default ProfileSettings;
```

- [ ] **Step 2: settings 頁改造**

`apps/frontend/src/app/(main)/settings/page.tsx`：

1. import 加：

```tsx
import { ProfileSettings } from '@/components/settings/profileSettings';
import { resolveSettingsTab } from '@/components/settings/settingsTabs';
```

2. 函式簽名改為（Next.js 15+ `searchParams` 是 Promise，同 `transactions/page.tsx` 模式）：

```tsx
interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SettingsPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const activeTab = resolveSettingsTab(searchParams.tab);
  const categories = await service.getCategories();
  const notifications = await service.getPersonnelNotification();
```

3. `<Tabs defaultValue="categories"` 改 `<Tabs defaultValue={activeTab}`。

4. TabsTrigger 的超長 className 現在要重複第 5 次 — 抽成常數（放在元件外）：

```tsx
const TAB_TRIGGER_CLASS =
  'cursor-pointer rounded-full px-8 py-2 md:px-10 text-sm font-medium transition-all duration-300 data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/20 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 data-[state=active]:hover:text-white max-md:w-full max-md:px-3';
```

既有 4 個 `TabsTrigger` 的 className 全換成 `{TAB_TRIGGER_CLASS}`，並在 `tags` trigger 後加：

```tsx
<TabsTrigger value="profile" className={TAB_TRIGGER_CLASS}>
  個人檔案
</TabsTrigger>
```

5. `tags` 的 `TabsContent` 後加：

```tsx
<TabsContent
  value="profile"
  className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-500"
>
  <ProfileSettings />
</TabsContent>
```

- [ ] **Step 3: 型別檢查**

Run: `pnpm check-types`
Expected: PASS。

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/components/settings/profileSettings.tsx 'apps/frontend/src/app/(main)/settings/page.tsx'
git commit -m "feat(frontend): settings 新增個人檔案 tab 與 ?tab= 深連結"
```

---

### Task 10: Header 兩顆按鈕生效 + 名稱即時同步

**Files:**
- Modify: `apps/frontend/src/components/layout/header.tsx`

**Interfaces:**
- Consumes: Task 9 的 `/settings?tab=profile` 深連結；Task 6 發出的 `user-updated` 事件。
- Produces: dropdown「個人檔案」「設定」變成 `Link`；header 監聽 `user-updated` 重讀 localStorage。

- [ ] **Step 1: 加 import**

```tsx
import Link from 'next/link';
```

- [ ] **Step 2: 兩顆按鈕換成 Link**

`header.tsx:192-202` 的 `!isGuest` 區塊改為：

```tsx
{!isGuest && (
  <>
    <DropdownMenuItem
      asChild
      className="cursor-pointer py-2.5 px-3 focus:bg-accent focus:text-accent-foreground rounded-md m-1"
    >
      <Link href="/settings?tab=profile">個人檔案</Link>
    </DropdownMenuItem>
    <DropdownMenuItem
      asChild
      className="cursor-pointer py-2.5 px-3 focus:bg-accent focus:text-accent-foreground rounded-md m-1"
    >
      <Link href="/settings">設定</Link>
    </DropdownMenuItem>
    <DropdownMenuSeparator className="bg-border" />
  </>
)}
```

- [ ] **Step 3: 監聽 user-updated**

`header.tsx:52-57` 既有 useEffect 改為：

```tsx
useEffect(() => {
  const syncUser = () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  };
  syncUser();
  // 個人檔案改名後（profileInfoCard 發出）即時更新 header 顯示
  window.addEventListener('user-updated', syncUser);
  return () => window.removeEventListener('user-updated', syncUser);
}, []);
```

- [ ] **Step 4: 型別檢查 + Commit**

Run: `pnpm check-types`
Expected: PASS。

```bash
git add apps/frontend/src/components/layout/header.tsx
git commit -m "feat(frontend): header 個人檔案/設定按鈕生效並同步顯示名稱"
```

---

### Task 11: 全量驗證

**Files:** 無新增。

- [ ] **Step 1: 型別檢查**

Run: `pnpm check-types`（根目錄）
Expected: 全 workspace PASS。

- [ ] **Step 2: 後端測試**

Run: `cd apps/backend && pnpm test:run tests/unit/user_profile_controller.test.ts`
Expected: PASS（5 tests）。
（全套 `pnpm test:run` 需可連線 PostgreSQL；環境有 DB 才跑全套。）

- [ ] **Step 3: 前端測試**

Run: `cd apps/frontend && pnpm test:run`
Expected: 全 PASS（含新增 4 個測試檔）。

- [ ] **Step 4: 範圍檢查**

Run: `git diff --stat main...HEAD`
Expected: 只動 spec/plan 文件 + `packages/shared/src/schemas/user.schema.ts` + 後端 `userController.ts`/`userRoute.ts`/新測試檔 + 前端 `services/userService.ts`、`components/settings/`（6 新檔 + page.tsx）、`components/layout/header.tsx`。出現其他檔案 = 越界，回查。

- [ ] **Step 5: 回報**

驗證輸出貼給使用者，確認後才 push / 開 PR（依專案規範，push 與 PR 需使用者明說）。
