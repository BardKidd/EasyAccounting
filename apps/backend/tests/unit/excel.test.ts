import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import { StatusCodes } from 'http-status-codes';
import ExcelJS from 'exceljs';
import { transactionColumns } from '@/excelColumns/transactionColumns';
import { RootType } from '@repo/shared';
// Import fixtures
import {
  mockUser,
  mockAccount,
  mockAccount2,
  mockCategoryMain,
  mockCategorySub,
  mockTransaction,
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
      if (where?.name === mockAccount.name) return Promise.resolve(mockAccount);
      if (where?.name === mockAccount2.name)
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
});
