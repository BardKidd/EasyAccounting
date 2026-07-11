import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import { StatusCodes } from 'http-status-codes';
import ExcelJS from 'exceljs';
import { transactionColumns } from '@/excelColumns/transactionColumns';
import { RootType, ExcelImportMode } from '@repo/shared';

// Rules Engine Phase B：本檔以 mock 隔離 DB，而 Excel 匯入共用的 createTransaction 現會呼叫
// resolveCategorization（查 TransactionRule/Category）。以 no-op mock 隔離規則引擎；
// 規則引擎自身有專屬真實 DB 整合測試。
vi.mock('@/services/categorizationService', () => ({
  resolveCategorization: vi.fn(async () => ({
    categoryId: null,
    tagIds: [],
    source: 'none',
  })),
}));
// Import fixtures
import {
  mockUser,
  mockAccount,
  mockAccount2,
  mockCategoryMain,
  mockCategorySub,
  mockTransaction,
  makeEditableTransaction,
  makeEditableTransferPair,
} from '../fixtures/excel_mocks';

// 1. Mock Auth Middleware to bypass login
vi.mock('@/middlewares/authMiddleware', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    req.user = { userId: mockUser.id, email: mockUser.email };
    next();
  },
}));

// 2. Mock Models
vi.mock('@/models', () => {
  const createMockModel = () => ({
    findOne: vi.fn(),
    findByPk: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    destroy: vi.fn(),
    belongsTo: vi.fn(),
    hasMany: vi.fn(),
    hasOne: vi.fn(),
    addHook: vi.fn(), // Mock hooks
  });

  return {
    User: createMockModel(),
    Account: createMockModel(),
    Category: createMockModel(),
    Transaction: createMockModel(),
    TransactionExtra: createMockModel(),
    CreditCardDetail: createMockModel(),
    sequelize: {
      transaction: vi.fn(() => ({
        commit: vi.fn(),
        rollback: vi.fn(),
      })),
    },
  };
});

import {
  User,
  Account,
  Category,
  Transaction,
  TransactionExtra,
} from '@/models';

// 3. Mock Azure Blob
import { uploadFileToBlob, generateSasUrl } from '@/utils/azureBlob';

vi.mock('@/utils/azureBlob', () => ({
  uploadFileToBlob: vi.fn(() => Promise.resolve()),
  generateSasUrl: vi.fn(() => 'https://mock-sas-url.com/file.xlsx'),
}));

// Mock Data Arrays
const mockAccounts = [mockAccount, mockAccount2];
const mockCategories = [mockCategoryMain, mockCategorySub];

// Mock Transaction Service if needed (or let Controller call mocked models)
// Since we are testing Integration of API -> Controller -> Service -> Model,
// mocking Models is often sufficient if Service logic is thin or verified in Unit Tests.
// However, Complex Service logic might be better mocked at Service layer for Controller tests.
// For now, adhering to "Legacy Refactor", we keep testing the flow but mock the DB bottom layer.

describe('Excel Import/Export API Test (Mocked)', () => {
  vi.setConfig({ testTimeout: 20000 });
  const agent = request.agent(app);

  // Helper to create Excel buffer
  const createExcelBuffer = async (rows: any[]) => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Transactions');
    sheet.columns = transactionColumns.map((col) => ({
      header: col.header,
      key: col.key,
      width: col.width,
    }));
    sheet.addRows(rows);

    // Create hidden _Options sheet (required by validation logic usually, strictly speaking for import maybe not if backend doesn't validate it dependent on the sheet existing, but good to have)
    const optionSheet = workbook.addWorksheet('_Options');
    optionSheet.state = 'hidden';

    return await workbook.xlsx.writeBuffer();
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default Mock Responses likely needed by all tests
    (User.findByPk as any).mockResolvedValue(mockUser);
    (Account.findAll as any).mockResolvedValue(mockAccounts);
    (Category.findAll as any).mockResolvedValue(mockCategories);
    (Account.findByPk as any).mockResolvedValue(mockAccount);
    (Category.findByPk as any).mockResolvedValue(mockCategoryMain);
    (uploadFileToBlob as any).mockResolvedValue('http://mock-blob-url');
    (generateSasUrl as any).mockReturnValue('https://mock-sas-url.com');
    (Transaction.create as any).mockResolvedValue(mockTransaction);
    (TransactionExtra.create as any).mockResolvedValue({});
  });

  // ==========================================
  // Positive Tests
  // ==========================================
  it('should import valid transactions (Income, Expense, Operate)', async () => {
    // Setup Mock Responses for finding Account/Category during Import Logic

    // 1. Account Lookup (findByName)
    (Account.findOne as any).mockImplementation(({ where }: any) => {
      // 支援名稱查找（excel 帳戶對應）與 id 查找（createTransaction 擁有權 {id,userId}）
      if (where?.name === mockAccount.name || where?.id === mockAccount.id)
        return Promise.resolve(mockAccount);
      if (where?.name === mockAccount2.name || where?.id === mockAccount2.id)
        return Promise.resolve(mockAccount2);
      return Promise.resolve(null);
    });

    // 2. Category Lookup (Need to handle Main-Sub parsing logic in service)
    // The service usually splits string and looks up categories.
    // We mock finding them.
    (Category.findOne as any).mockImplementation(({ where }: any) => {
      if (where?.name === mockCategoryMain.name && where?.parentId === null)
        return Promise.resolve(mockCategoryMain);
      if (
        where?.name === mockCategorySub.name &&
        where?.parentId === mockCategoryMain.id
      )
        return Promise.resolve(mockCategorySub);
      return Promise.resolve(null);
    });

    // 3. Mock Transaction Creation
    (Transaction.create as any).mockResolvedValue({
      ...mockTransaction,
      id: 'newTx',
    });
    (TransactionExtra.create as any).mockResolvedValue({ id: 'extra1' });

    const rows = [
      {
        date: '2026-02-01',
        time: '12:00:00',
        type: RootType.EXPENSE,
        amount: 100,
        account: mockAccount.name,
        targetAccount: null,
        category: `${mockCategoryMain.name}-${mockCategorySub.name}`,
        description: 'Excel Expense Test',
        receipt: null,
      },
      {
        date: '2026-02-01',
        time: '13:00:00',
        type: RootType.OPERATE, // Transfer
        amount: 50,
        account: mockAccount.name,
        targetAccount: mockAccount2.name,
        category: `${mockCategoryMain.name}-${mockCategorySub.name}`, // Transfers often ignore category or use a default, assuming backend handles it or we pass valid one
        description: 'Excel Transfer Test',
      },
    ];

    const buffer = await createExcelBuffer(rows);

    const res = await agent
      .post('/api/excel/import-transactions')
      .attach('file', buffer as any, 'valid_import.xlsx');

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body.isSuccess).toBe(true);

    // Verify Transaction.create was called for both transactions
    expect(Transaction.create).toHaveBeenCalledTimes(3); // 1 expense, 2 for transfer (source/target)
  });

  it('should export transactions correctly', async () => {
    (Transaction.findAll as any).mockResolvedValue([
      {
        ...mockTransaction,
        date: '2026-02-01',
        account: mockAccount,
        category: mockCategorySub,
        toJSON: () => ({
          ...mockTransaction,
          date: '2026-02-01',
          account: mockAccount,
          category: mockCategorySub,
        }), // often need toJSON
      },
    ]);

    const res = await agent.get('/api/excel/user-transactions');

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body.isSuccess).toBe(true);
    expect(res.body.data).toContain('https://mock-sas-url.com');
  });

  // ==========================================
  // Negative Tests
  // ==========================================
  it('should return Error Excel when validation fails (Missing Fields)', async () => {
    // Mock Account lookup success but maybe data is bad
    (Account.findOne as any).mockResolvedValue(mockAccount);

    const rows = [
      {
        date: '', // Missing date
        type: RootType.EXPENSE,
        amount: 100,
        account: mockAccount.name,
        category: 'Food-Lunch',
      },
    ];

    const buffer = await createExcelBuffer(rows);
    const res = await agent
      .post('/api/excel/import-transactions')
      .attach('file', buffer as any, 'invalid.xlsx');

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body.isSuccess).toBe(true);
    expect(res.body.data.errorUrl).toBeTruthy();
    expect(res.body.data.message).toMatch(/失敗/);
  });

  it('should return Error Excel for Logical Errors (Negative Amount, Invalid Types)', async () => {
    (Account.findOne as any).mockResolvedValue(mockAccount);

    const rows = [
      {
        date: '2026-02-01',
        time: '12:00:00',
        type: RootType.EXPENSE,
        amount: -500, // Negative
        account: mockAccount.name,
        category: 'Food-Lunch',
      },
    ];

    const buffer = await createExcelBuffer(rows);
    const res = await agent
      .post('/api/excel/import-transactions')
      .attach('file', buffer as any, 'negative.xlsx');

    expect(res.body.isSuccess).toBe(true);
    expect(res.body.data.errorUrl).toBeTruthy();
  });

  it('should return Error Excel for Operate without Target Account', async () => {
    (Account.findOne as any).mockResolvedValue(mockAccount);
    (Category.findOne as any).mockImplementation(({ where }: any) => {
      if (where?.name === mockCategoryMain.name && where?.parentId === null)
        return Promise.resolve(mockCategoryMain);
      if (
        where?.name === mockCategorySub.name &&
        where?.parentId === mockCategoryMain.id
      )
        return Promise.resolve(mockCategorySub);
      return Promise.resolve(null);
    });

    const rows = [
      {
        date: '2026-02-01',
        time: '12:00:00',
        type: RootType.OPERATE,
        amount: 100,
        account: mockAccount.name,
        category: `${mockCategoryMain.name}-${mockCategorySub.name}`,
        targetAccount: null, // Missing!
      },
    ];

    const buffer = await createExcelBuffer(rows);
    const res = await agent
      .post('/api/excel/import-transactions')
      .attach('file', buffer as any, 'bad_operate.xlsx');

    expect(res.body.isSuccess).toBe(true);
    expect(res.body.data.errorUrl).toBeTruthy();
  });

  // ==========================================
  // Edge Case Tests
  // ==========================================
  it('should handle re-upload of Error Excel (ignore first column)', async () => {
    // Mock Database Calls
    const mockUserValue = {
      id: mockUser.id,
      email: mockUser.email,
    };

    (User.findByPk as any).mockResolvedValue(mockUserValue);
    (Account.findAll as any).mockResolvedValue(mockAccounts);
    // Ensure Category.findAll returns data that supports the tree structure logic in getAllCategoriesHyphenString
    (Category.findAll as any).mockResolvedValue(mockCategories);

    // Mock uploadFileToBlob to avoid actual Azure calls
    (uploadFileToBlob as any).mockResolvedValue('http://mock-blob-url');

    // Mock generateSasUrl to return a fake URL
    (generateSasUrl as any).mockReturnValue('https://mock-sas-url');
    // Determine account names
    (Account.findOne as any).mockResolvedValue(mockAccount);
    (Category.findOne as any).mockImplementation(({ where }: any) => {
      if (where?.name === mockCategoryMain.name && where?.parentId === null)
        return Promise.resolve(mockCategoryMain);
      if (
        where?.name === mockCategorySub.name &&
        where?.parentId === mockCategoryMain.id
      )
        return Promise.resolve(mockCategorySub);
      return Promise.resolve(null);
    });
    (Transaction.create as any).mockResolvedValue({
      ...mockTransaction,
      id: 'newTxReupload',
    });

    // Construct rows that simulate an Error Excel: Col 1 is error, subsequent are data
    // Shifted columns:
    // Col 1: Error
    // Col 2: Date
    // Col 3: Time ...

    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Transactions'); // Sheet name must be 'Transactions'

    // Headers with Error at start
    const headers = ['錯誤說明', ...transactionColumns.map((c) => c.header)];
    sheet.addRow(headers);

    // Row 1: Valid data (fixed by user), but shifted
    // Error msg (empty or previous error), Date, Time, Type, Amount, Account, Target, Category, ...
    const rowValues = [
      'Previous Error', // Ignored col
      '2026-03-01',
      '10:00:00',
      RootType.EXPENSE,
      'NTD', // 幣別：舊代碼，匯入端 normalizeCurrencyCode 會映射成 TWD（合法別名）
      200,
      mockAccount.name,
      null, // Target
      `${mockCategoryMain.name}-${mockCategorySub.name}`,
      null, // Receipt
      'Fixed Error Re-upload',
    ];
    sheet.addRows([rowValues]);

    // Create hidden _Options sheet
    const optionSheet = wb.addWorksheet('_Options');
    optionSheet.state = 'hidden';

    const buffer = await wb.xlsx.writeBuffer();

    const res = await agent
      .post('/api/excel/import-transactions')
      .attach('file', buffer as any, 'reupload.xlsx');

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body.isSuccess).toBe(true);
    expect(Transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Fixed Error Re-upload',
        amount: 200,
      }),
      expect.any(Object)
    );
  });

  it('should export headers even if no transactions exist (Edge Case)', async () => {
    // Mock findAll to return an empty array
    (Transaction.findAll as any).mockResolvedValue([]);

    const res = await agent.get('/api/excel/user-transactions');
    expect(res.status).toBe(StatusCodes.OK);
    // Should return URL
    expect(res.body.data).toContain('https://mock-sas-url.com');
  });

  // ==========================================
  // Edit Mode Tests（mode=edit）
  // ==========================================

  // 建立帶隱藏 id 欄的編輯用 Excel（id 固定在最後一欄）
  const createEditExcelBuffer = async (rows: any[]) => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Transactions');
    sheet.columns = [
      ...transactionColumns.map((col) => ({
        header: col.header,
        key: col.key,
        width: col.width,
      })),
      { header: 'id', key: 'id', width: 20 },
    ];
    sheet.addRows(rows);
    const optionSheet = workbook.addWorksheet('_Options');
    optionSheet.state = 'hidden';
    return await workbook.xlsx.writeBuffer();
  };

  // 帳戶查詢同時支援以 name（建立 Map 用）與 id（更新時 where {id,userId}）查找
  const mockAccountLookupByNameAndId = () => {
    (Account.findOne as any).mockImplementation(({ where }: any) => {
      if (where?.name === mockAccount.name) return Promise.resolve(mockAccount);
      if (where?.name === mockAccount2.name)
        return Promise.resolve(mockAccount2);
      if (where?.id === mockAccount.id) return Promise.resolve(mockAccount);
      if (where?.id === mockAccount2.id) return Promise.resolve(mockAccount2);
      return Promise.resolve(null);
    });
  };

  const mockCategoryLookup = () => {
    (Category.findOne as any).mockImplementation(({ where }: any) => {
      if (where?.name === mockCategoryMain.name && where?.parentId === null)
        return Promise.resolve(mockCategoryMain);
      if (
        where?.name === mockCategorySub.name &&
        where?.parentId === mockCategoryMain.id
      )
        return Promise.resolve(mockCategorySub);
      return Promise.resolve(null);
    });
  };

  const validCategory = `${mockCategoryMain.name}-${mockCategorySub.name}`;

  it('編輯模式：依 id 更新既有收入/支出交易（走 updateIncomeExpense）', async () => {
    mockAccountLookupByNameAndId();
    mockCategoryLookup();

    // 預載：該 User 擁有 editTx1
    (Transaction.findAll as any).mockResolvedValue([{ id: 'editTx1' }]);

    const editableTx = makeEditableTransaction();
    (Transaction.findOne as any).mockResolvedValue(editableTx);

    const rows = [
      {
        date: '2026-03-15',
        time: '09:30:00',
        type: RootType.EXPENSE,
        amount: 888,
        account: mockAccount.name,
        targetAccount: null,
        category: validCategory,
        receipt: null,
        description: '更新後的支出',
        id: 'editTx1',
      },
    ];

    const buffer = await createEditExcelBuffer(rows);
    const res = await agent
      .post('/api/excel/import-transactions')
      .field('mode', ExcelImportMode.EDIT)
      .attach('file', buffer as any, 'edit_income_expense.xlsx');

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body.isSuccess).toBe(true);
    expect(res.body.data.message).toMatch(/成功匯入 1 筆/);
    // 應走更新而非新增
    expect(editableTx.update).toHaveBeenCalled();
    expect(Transaction.create).not.toHaveBeenCalled();
  });

  it('編輯模式：依 id 更新既有轉帳交易（走 updateTransfer，兩側同步）', async () => {
    mockAccountLookupByNameAndId();
    mockCategoryLookup();

    (Transaction.findAll as any).mockResolvedValue([
      { id: 'editTransferFrom' },
    ]);

    const { fromTx, toTx } = makeEditableTransferPair();
    (Transaction.findOne as any).mockImplementation(({ where }: any) => {
      if (where?.id === 'editTransferFrom') return Promise.resolve(fromTx);
      if (where?.id === 'editTransferTo') return Promise.resolve(toTx);
      return Promise.resolve(null);
    });

    const rows = [
      {
        date: '2026-03-20',
        time: '15:00:00',
        type: RootType.OPERATE,
        amount: 120,
        account: mockAccount.name,
        targetAccount: mockAccount2.name,
        category: validCategory,
        receipt: null,
        description: '更新後的轉帳',
        id: 'editTransferFrom',
      },
    ];

    const buffer = await createEditExcelBuffer(rows);
    const res = await agent
      .post('/api/excel/import-transactions')
      .field('mode', ExcelImportMode.EDIT)
      .attach('file', buffer as any, 'edit_transfer.xlsx');

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body.isSuccess).toBe(true);
    expect(res.body.data.message).toMatch(/成功匯入 1 筆/);
    // 轉帳兩側都應被更新
    expect(fromTx.update).toHaveBeenCalled();
    expect(toTx.update).toHaveBeenCalled();
    expect(Transaction.create).not.toHaveBeenCalled();
  });

  it('編輯模式：混合（有 id 更新 + 無 id 新增）', async () => {
    mockAccountLookupByNameAndId();
    mockCategoryLookup();

    (Transaction.findAll as any).mockResolvedValue([{ id: 'editTx1' }]);

    const editableTx = makeEditableTransaction();
    (Transaction.findOne as any).mockResolvedValue(editableTx);
    (Transaction.create as any).mockResolvedValue({
      ...mockTransaction,
      id: 'brandNew',
    });

    const rows = [
      {
        // 有 id → 更新
        date: '2026-03-15',
        time: '09:30:00',
        type: RootType.EXPENSE,
        amount: 200,
        account: mockAccount.name,
        targetAccount: null,
        category: validCategory,
        description: '更新列',
        id: 'editTx1',
      },
      {
        // 無 id → 新增
        date: '2026-03-16',
        time: '10:00:00',
        type: RootType.INCOME,
        amount: 300,
        account: mockAccount.name,
        targetAccount: null,
        category: validCategory,
        description: '新增列',
        id: null,
      },
    ];

    const buffer = await createEditExcelBuffer(rows);
    const res = await agent
      .post('/api/excel/import-transactions')
      .field('mode', ExcelImportMode.EDIT)
      .attach('file', buffer as any, 'edit_mixed.xlsx');

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body.isSuccess).toBe(true);
    expect(res.body.data.message).toMatch(/成功匯入 2 筆/);
    expect(editableTx.update).toHaveBeenCalled(); // 更新那一列
    expect(Transaction.create).toHaveBeenCalledTimes(1); // 新增那一列
  });

  it('編輯模式：id 不存在/越權 → 列入錯誤報告，不執行更新', async () => {
    mockAccountLookupByNameAndId();
    mockCategoryLookup();

    // 該 User 只擁有 editTx1，Excel 卻帶了別人的 id
    (Transaction.findAll as any).mockResolvedValue([{ id: 'editTx1' }]);

    const rows = [
      {
        date: '2026-03-15',
        time: '09:30:00',
        type: RootType.EXPENSE,
        amount: 200,
        account: mockAccount.name,
        targetAccount: null,
        category: validCategory,
        description: '越權嘗試',
        id: 'someone-else-tx',
      },
    ];

    const buffer = await createEditExcelBuffer(rows);
    const res = await agent
      .post('/api/excel/import-transactions')
      .field('mode', ExcelImportMode.EDIT)
      .attach('file', buffer as any, 'edit_unauthorized.xlsx');

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body.isSuccess).toBe(true);
    expect(res.body.data.errorUrl).toBeTruthy();
    expect(res.body.data.message).toMatch(/失敗 1 筆/);
    // 不應嘗試查找或更新該交易
    expect(Transaction.findOne).not.toHaveBeenCalled();
    expect(Transaction.create).not.toHaveBeenCalled();
  });

  it('編輯模式：單列 apply 失敗不中斷整批，列入錯誤報告', async () => {
    mockAccountLookupByNameAndId();
    mockCategoryLookup();

    // 兩筆都是本人的交易
    (Transaction.findAll as any).mockResolvedValue([
      { id: 'editTx1' },
      { id: 'notTransfer' },
    ]);

    const editableTx = makeEditableTransaction();
    // notTransfer 是一筆普通支出（linkId = null），卻被當成 OPERATE 編輯 → updateTransfer 應丟錯
    const nonTransferTx = makeEditableTransaction({
      id: 'notTransfer',
      linkId: null,
    });
    (Transaction.findOne as any).mockImplementation(({ where }: any) => {
      if (where?.id === 'editTx1') return Promise.resolve(editableTx);
      if (where?.id === 'notTransfer') return Promise.resolve(nonTransferTx);
      return Promise.resolve(null);
    });

    const rows = [
      {
        date: '2026-03-15',
        time: '09:30:00',
        type: RootType.EXPENSE,
        amount: 200,
        account: mockAccount.name,
        targetAccount: null,
        category: validCategory,
        description: '正常更新',
        id: 'editTx1',
      },
      {
        // 型別不符：普通交易卻標成操作 → apply 階段丟錯，但不該 500 整批
        date: '2026-03-16',
        time: '10:00:00',
        type: RootType.OPERATE,
        amount: 300,
        account: mockAccount.name,
        targetAccount: mockAccount2.name,
        category: validCategory,
        description: '型別不符',
        id: 'notTransfer',
      },
    ];

    const buffer = await createEditExcelBuffer(rows);
    const res = await agent
      .post('/api/excel/import-transactions')
      .field('mode', ExcelImportMode.EDIT)
      .attach('file', buffer as any, 'edit_partial_fail.xlsx');

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body.isSuccess).toBe(true);
    // 一成功一失敗，整批未中斷
    expect(res.body.data.message).toMatch(/成功匯入 1 筆/);
    expect(res.body.data.message).toMatch(/失敗 1 筆/);
    expect(res.body.data.errorUrl).toBeTruthy();
    expect(editableTx.update).toHaveBeenCalled();
  });

  it('編輯模式：更新收入/支出時不覆寫 paymentFrequency', async () => {
    mockAccountLookupByNameAndId();
    mockCategoryLookup();
    (Transaction.findAll as any).mockResolvedValue([{ id: 'editTx1' }]);

    const editableTx = makeEditableTransaction();
    (Transaction.findOne as any).mockResolvedValue(editableTx);

    const rows = [
      {
        date: '2026-03-15',
        time: '09:30:00',
        type: RootType.EXPENSE,
        amount: 200,
        account: mockAccount.name,
        targetAccount: null,
        category: validCategory,
        description: '更新但不動 paymentFrequency',
        id: 'editTx1',
      },
    ];

    const buffer = await createEditExcelBuffer(rows);
    const res = await agent
      .post('/api/excel/import-transactions')
      .field('mode', ExcelImportMode.EDIT)
      .attach('file', buffer as any, 'edit_no_pf.xlsx');

    expect(res.status).toBe(StatusCodes.OK);
    // updateIncomeExpense 的 transaction.update 不應帶入 paymentFrequency
    expect(editableTx.update).toHaveBeenCalledWith(
      expect.not.objectContaining({ paymentFrequency: expect.anything() }),
      expect.anything(),
    );
  });

  // ==========================================
  // Currency 幣別欄位 Tests
  // ==========================================
  it('幣別欄位：匯出金額為「數字」非文字、含幣別欄、新台幣以整數呈現', async () => {
    // 模擬 Sequelize DECIMAL 回傳字串金額（圖片中存成文字的根因）
    (Transaction.findAll as any).mockResolvedValue([
      {
        id: 't1',
        date: '2026-02-01',
        time: '12:00:00',
        type: RootType.INCOME,
        amount: '11000.00000',
        accountId: mockAccount.id,
        targetAccountId: null,
        categoryId: mockCategorySub.id,
        receipt: '',
        description: 'x',
        isReconciled: false,
        reconciliationDate: null,
      },
    ]);

    const res = await agent.get('/api/excel/user-transactions');
    expect(res.status).toBe(StatusCodes.OK);

    // 取出實際寫入 blob 的 buffer 驗證儲存格內容
    const calls = (uploadFileToBlob as any).mock.calls;
    const buffer = calls[calls.length - 1][1];
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);
    const sheet = wb.getWorksheet('交易紀錄')!;

    // 幣別欄在金額前（第 4 欄），金額在第 5 欄
    expect(sheet.getRow(1).getCell(4).text).toBe('幣別');
    expect(sheet.getRow(1).getCell(5).text).toBe('金額*');

    const dataRow = sheet.getRow(2);
    expect(dataRow.getCell(4).text).toBe('TWD');
    // 關鍵：金額必須是「數字」而非文字
    expect(typeof dataRow.getCell(5).value).toBe('number');
    expect(dataRow.getCell(5).value).toBe(11000);
    // TWD 套用整數格式 → 不顯示 .00000 小數
    expect(dataRow.getCell(5).numFmt).toBe('#,##0');
  });

  // ==========================================
  // CSV 匯出 Tests（Mac Numbers 友善）
  // ==========================================
  // 取出最後一次寫入 blob 的 CSV 文字（去掉開頭 BOM），並回傳原始呼叫參數。
  const lastCsvUpload = () => {
    const calls = (uploadFileToBlob as any).mock.calls;
    const call = calls[calls.length - 1];
    const buffer = call[1] as Buffer;
    const raw = buffer.toString('utf-8');
    return { call, raw, hasBom: raw.charCodeAt(0) === 0xfeff, text: raw.slice(1) };
  };

  it('CSV 匯出：含 BOM、表頭正確、金額為純數字、傳對 content-type/disposition', async () => {
    (Transaction.findAll as any).mockResolvedValue([
      {
        id: 't1',
        date: '2026-02-01',
        time: '12:00:00',
        type: RootType.INCOME,
        amount: '11000.00000', // Sequelize DECIMAL 回傳字串
        accountId: mockAccount.id,
        targetAccountId: null,
        categoryId: mockCategorySub.id,
        receipt: '',
        description: '一般描述',
        isReconciled: false,
        reconciliationDate: null,
      },
    ]);

    const res = await agent.get('/api/excel/user-transactions-csv');
    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body.isSuccess).toBe(true);

    const { call, hasBom, text } = lastCsvUpload();
    // BOM 讓 Numbers/Excel 正確辨識 UTF-8 中文
    expect(hasBom).toBe(true);

    const lines = text.split('\r\n');
    // 表頭與 transactionColumns 一致
    expect(lines[0]).toBe(transactionColumns.map((c) => c.header).join(','));

    const cells = lines[1]!.split(',');
    // 金額欄（第 5 欄，index 4）為純數字：無千分位、無引號、無 .00000
    expect(cells[4]).toBe('11000');
    // 幣別欄（第 4 欄）為 TWD
    expect(cells[3]).toBe('TWD');

    // content-type 與 attachment disposition 需正確帶入
    expect(call[0]).toMatch(/\.csv$/);
    expect(call[2]).toMatch(/text\/csv/);
    expect(call[3]).toMatch(/attachment/);
  });

  it('CSV 匯出：含逗號/引號/換行的值需以 RFC 4180 方式轉義', async () => {
    (Transaction.findAll as any).mockResolvedValue([
      {
        id: 't1',
        date: '2026-02-01',
        time: '12:00:00',
        type: RootType.EXPENSE,
        amount: 50,
        accountId: mockAccount.id,
        targetAccountId: null,
        categoryId: mockCategorySub.id,
        receipt: '',
        description: 'a,b"c\nd', // 逗號 + 引號 + 換行
        isReconciled: false,
        reconciliationDate: null,
      },
    ]);

    const res = await agent.get('/api/excel/user-transactions-csv');
    expect(res.status).toBe(StatusCodes.OK);

    const { text } = lastCsvUpload();
    // 描述欄含特殊字元 → 整格包雙引號、內部引號變兩個
    expect(text).toContain('"a,b""c\nd"');
  });

  it('CSV 匯出：null 的描述/發票欄輸出空字串，非字面 null/undefined', async () => {
    // Sequelize 對選填欄回傳 null 是常態
    (Transaction.findAll as any).mockResolvedValue([
      {
        id: 't1',
        date: '2026-02-01',
        time: '12:00:00',
        type: RootType.INCOME,
        amount: 100,
        accountId: mockAccount.id,
        targetAccountId: null,
        categoryId: mockCategorySub.id,
        receipt: null,
        description: null,
        isReconciled: false,
        reconciliationDate: null,
      },
    ]);

    const res = await agent.get('/api/excel/user-transactions-csv');
    expect(res.status).toBe(StatusCodes.OK);

    const { text } = lastCsvUpload();
    const cells = text.split('\r\n')[1]!.split(',');
    // 欄序：... 發票(8) 描述(9) ...；null → 空字串
    expect(cells[8]).toBe('');
    expect(cells[9]).toBe('');
    expect(text).not.toMatch(/null|undefined/);
  });

  it('幣別欄位：不支援的幣別 → 列入錯誤報告', async () => {
    const rows = [
      {
        date: '2026-04-01',
        time: '12:00:00',
        type: RootType.EXPENSE,
        currency: '黃金', // 不支援
        amount: 100,
        account: mockAccount.name,
        targetAccount: null,
        category: `${mockCategoryMain.name}-${mockCategorySub.name}`,
        description: '幣別錯誤',
      },
    ];

    const buffer = await createExcelBuffer(rows);
    const res = await agent
      .post('/api/excel/import-transactions')
      .attach('file', buffer as any, 'bad_currency.xlsx');

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body.isSuccess).toBe(true);
    expect(res.body.data.errorUrl).toBeTruthy();
    expect(res.body.data.message).toMatch(/失敗 1 筆/);
    expect(Transaction.create).not.toHaveBeenCalled();
  });
});
