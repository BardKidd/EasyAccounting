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
