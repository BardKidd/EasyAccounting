export const mockUser = {
  id: 'user1',
  email: 'test@example.com',
  name: 'Test User',
};

export const mockAccount = {
  id: 'acc1',
  name: 'Test Account',
  userId: 'user1',
  type: '銀行',
  balance: 1000,
  initialBalance: 1000,
  save: () => Promise.resolve(),
};

export const mockAccount2 = {
  id: 'acc2',
  name: 'Target Account',
  userId: 'user1',
  type: '銀行',
  balance: 500,
  initialBalance: 500,
  save: () => Promise.resolve(),
};

export const mockCategoryMain = {
  id: 'catMain',
  name: 'ExcelTestMain',
  parentId: null,
};

export const mockCategorySub = {
  id: 'catSub',
  name: 'ExcelTestSub',
  parentId: 'catMain',
};

export const mockTransaction = {
  id: 'tx1',
  amount: 100,
  description: 'Excel Expense Test',
  save: () => Promise.resolve(),
  update: () => Promise.resolve(),
  toJSON: () => mockTransaction,
};

import { vi } from 'vitest';

/**
 * 建立一筆「可被編輯」的收入/支出交易實例（供編輯模式測試使用）。
 * 帶上 vi.fn 的 update，方便斷言 updateIncomeExpense 是否真的更新了它。
 */
export const makeEditableTransaction = (overrides: Record<string, any> = {}) => {
  const tx: any = {
    id: 'editTx1',
    type: '支出',
    amount: 100,
    accountId: mockAccount.id,
    categoryId: mockCategorySub.id,
    transactionExtraId: null,
    transactionExtra: null,
    linkId: null,
    date: '2026-02-01',
    time: '12:00:00',
    description: 'Editable Expense',
    receipt: '',
    isReconciled: false,
    reconciliationDate: null,
    update: vi.fn().mockResolvedValue(undefined),
    toJSON: () => ({ id: tx.id }),
    ...overrides,
  };
  return tx;
};

/**
 * 建立一對互相關聯的轉帳交易實例（來源 EXPENSE / 目標 INCOME），
 * 供編輯轉帳測試使用。匯出帶回的 id 為來源側 (from) id。
 */
export const makeEditableTransferPair = () => {
  const fromTx: any = {
    id: 'editTransferFrom',
    type: '支出',
    amount: 50,
    accountId: mockAccount.id, // 來源帳戶
    targetAccountId: mockAccount2.id, // 目標帳戶
    categoryId: mockCategorySub.id,
    transactionExtraId: null,
    transactionExtra: null,
    linkId: 'editTransferTo',
    date: '2026-02-01',
    time: '12:00:00',
    description: 'Editable Transfer',
    receipt: '',
    isReconciled: false,
    reconciliationDate: null,
    update: vi.fn().mockResolvedValue(undefined),
    toJSON: () => ({ id: 'editTransferFrom' }),
  };
  const toTx: any = {
    id: 'editTransferTo',
    type: '收入',
    amount: 50,
    accountId: mockAccount2.id, // 目標帳戶
    targetAccountId: mockAccount.id, // 來源帳戶
    categoryId: mockCategorySub.id,
    transactionExtraId: null,
    transactionExtra: null,
    linkId: 'editTransferFrom',
    date: '2026-02-01',
    time: '12:00:00',
    description: 'Editable Transfer',
    receipt: '',
    isReconciled: false,
    reconciliationDate: null,
    update: vi.fn().mockResolvedValue(undefined),
    toJSON: () => ({ id: 'editTransferTo' }),
  };
  return { fromTx, toTx };
};
