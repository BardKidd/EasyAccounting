import { describe, it, expect, beforeAll, vi, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import User from '@/models/user';
import Account from '@/models/account';
import Category from '@/models/category';
import Transaction from '@/models/transaction';
import { RootType, PaymentFrequency } from '@repo/shared';
import { StatusCodes } from 'http-status-codes';
import ExcelJS from 'exceljs';
import { transactionColumns } from '@/excelColumns/transactionColumns';
import bcrypt from 'bcrypt';

// Mock Azure Blob Storage
let lastUploadedBuffer: Buffer | null = null;
vi.mock('@/utils/azureBlob', () => ({
  uploadFileToBlob: vi.fn((name, buffer) => {
    lastUploadedBuffer = buffer;
    return Promise.resolve();
  }),
  // Should typically be synchronous for SAS generation, but just in case, or keep as is if standard.
  // If the error is about return type, explicit typing helps.
  generateSasUrl: vi.fn(() => 'https://mock-sas-url.com/file.xlsx'),
}));

const TEST_USER_EMAIL = 'test_excel_dedicated@example.com';
const TEST_USER_PASSWORD = 'password';

describe('Excel Import/Export API Test', () => {
  const agent = request.agent(app);
  let userId: string;
  let accountId: string;
  let account2Id: string;
  let expenseCategoryId: string; // SubCategory ID
  let mainCategoryId: string; // MainCategory ID (no sub)

  // Helper to create Excel buffer
  const createExcelBuffer = async (rows: any[]) => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Transactions');

    // Add columns based on spec/code
    sheet.columns = transactionColumns.map((col) => ({
      header: col.header,
      key: col.key,
      width: col.width,
    }));

    // Add rows
    sheet.addRows(rows);

    // Create hidden _Options sheet (required by validation logic usually, strictly speaking for import maybe not if backend doesn't validate it dependent on the sheet existing, but good to have)
    const optionSheet = workbook.addWorksheet('_Options');
    optionSheet.state = 'hidden';

    return await workbook.xlsx.writeBuffer();
  };

  beforeAll(async () => {
    // 1. Create/Login User
    // Ensure user exists
    let user = await User.findOne({ where: { email: TEST_USER_EMAIL } });
    if (!user) {
      const hashedPassword = await bcrypt.hash(TEST_USER_PASSWORD, 10);
      user = await User.create({
        email: TEST_USER_EMAIL,
        password: hashedPassword,
        name: 'ExcelTestUser',
      } as any);
    }
    userId = user.id;

    await agent.post('/api/login').send({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    });

    // 2. Setup Data
    // userId is already set above

    // Accounts
    const timestamp = Date.now();
    const account = await Account.create({
      userId,
      name: `ExcelAccount_${timestamp}`,
      type: '銀行',
      balance: 10000,
      icon: 'bank',
      color: '#000000',
    } as any);
    accountId = account.id;

    const account2 = await Account.create({
      userId,
      name: `ExcelAccount2_${timestamp}`,
      type: '銀行',
      balance: 5000,
      icon: 'bank',
      color: '#000000',
    } as any);
    account2Id = account2.id;

    // Categories
    // System expects 3 levels: Root -> Main -> Sub to generate "Main-Sub" string
    const root = await Category.create({
      userId,
      name: `ExcelRoot_${timestamp}`,
      type: RootType.EXPENSE,
      icon: 'food',
      color: '#000',
      parentId: null,
    } as any);

    const main = await Category.create({
      userId,
      name: `ExcelMain_${timestamp}`,
      type: RootType.EXPENSE,
      icon: 'food',
      color: '#000',
      parentId: root.id,
    } as any);
    mainCategoryId = main.id;

    const sub = await Category.create({
      userId,
      name: `ExcelSub_${timestamp}`,
      parentId: main.id,
      type: RootType.EXPENSE,
      icon: 'food',
      color: '#000',
    } as any);
    expenseCategoryId = sub.id;
  });

  afterEach(async () => {
    lastUploadedBuffer = null;
  });

  // ==========================================
  // Positive Tests
  // ==========================================
  it('should import valid transactions (Income, Expense, Operate)', async () => {
    // Need names for accounts/categories for the Excel file
    const account = await Account.findByPk(accountId);
    const account2 = await Account.findByPk(account2Id);
    // Force non-null for test logic simplicity or handle check
    const category = await Category.findByPk(expenseCategoryId);
    if (!category) throw new Error('Category not found');
    const parentCategory = await Category.findByPk(category.parentId!); // Main

    // Construct "Main-Sub" string
    const categoryString = `${parentCategory?.name}-${category?.name}`;

    const rows = [
      {
        date: '2026-02-01',
        time: '12:00:00',
        type: RootType.EXPENSE,
        amount: 100,
        account: account?.name,
        targetAccount: null,
        category: categoryString,
        description: 'Excel Expense Test',
        receipt: null,
      },
      {
        date: '2026-02-01',
        time: '13:00:00',
        type: RootType.OPERATE, // Transfer
        amount: 50,
        account: account?.name,
        targetAccount: account2?.name,
        category: categoryString, // Transfers often ignore category or use a default, assuming backend handles it or we pass valid one
        description: 'Excel Transfer Test',
      },
    ];

    const buffer = await createExcelBuffer(rows);

    const res = await agent
      .post('/api/excel/import-transactions')
      .attach('file', buffer as any, 'valid_import.xlsx');

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body.isSuccess).toBe(true);

    // Verify DB
    const txExpense = await Transaction.findOne({
      where: { description: 'Excel Expense Test' },
    });

    expect(txExpense).toBeTruthy();
    expect(Number(txExpense?.amount)).toBe(100);

    const txTransfer = await Transaction.findOne({
      where: { description: 'Excel Transfer Test', type: RootType.EXPENSE },
    }); // Source side is Expense
    expect(txTransfer).toBeTruthy();
    expect(txTransfer?.linkId).toBeTruthy(); // Should be linked
  });

  it('should export transactions correctly', async () => {
    const res = await agent.get('/api/excel/user-transactions');

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body.isSuccess).toBe(true);
    // Should return a SAS URL in data
    expect(res.body.data).toContain('https://mock-sas-url.com');
  });

  // ==========================================
  // Negative Tests
  // ==========================================
  it('should return Error Excel when validation fails (Missing Fields)', async () => {
    const rows = [
      {
        date: '', // Missing date
        type: RootType.EXPENSE,
        amount: 100,
        account: 'Unknown Account',
        category: 'Food-Lunch',
      },
    ];

    const buffer = await createExcelBuffer(rows);
    const res = await agent
      .post('/api/excel/import-transactions')
      .attach('file', buffer as any, 'invalid_import.xlsx');

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body.isSuccess).toBe(true);
    // Check if errorUrl is returned
    expect(res.body.data.errorUrl).toContain('https://mock-sas-url.com');
    // message should mention failure
    expect(res.body.data.message).toMatch(/失敗/);
  });

  it('should return Error Excel for Logical Errors (Negative Amount, Invalid Types)', async () => {
    const account = await Account.findByPk(accountId);

    const rows = [
      {
        date: '2026-02-01',
        time: '12:00:00',
        type: RootType.EXPENSE,
        amount: -500, // Negative
        account: account?.name,
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
    const account = await Account.findByPk(accountId);

    const rows = [
      {
        date: '2026-02-01',
        time: '12:00:00',
        type: RootType.OPERATE,
        amount: 100,
        account: account?.name,
        category: 'ExcelTestMain-ExcelTestSub',
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
    // Determine account names
    const account = await Account.findByPk(accountId);
    const category = await Category.findByPk(expenseCategoryId);
    if (!category) throw new Error('Category not found');
    const parentCategory = await Category.findByPk(category.parentId!);
    const categoryString = `${parentCategory?.name}-${category.name}`;

    // Construct rows that simulate an Error Excel: Col 1 is error, subsequent are data
    // Shifted columns:
    // Col 1: Error
    // Col 2: Date
    // Col 3: Time ...

    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Sheet1');

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
      account?.name,
      null, // Target
      categoryString,
      null, // Receipt
      'Fixed Error Re-upload',
    ];
    sheet.addRow(rowValues);

    const buffer = await wb.xlsx.writeBuffer();

    const res = await agent
      .post('/api/excel/import-transactions')
      .attach('file', buffer as any, 'reupload.xlsx');

    expect(res.status).toBe(StatusCodes.OK);

    // Verify DB
    const tx = await Transaction.findOne({
      where: { description: 'Fixed Error Re-upload' },
    });
    expect(tx).toBeTruthy();
    expect(Number(tx?.amount)).toBe(200);
  });

  it('should export headers even if no transactions exist (Edge Case)', async () => {
    // Check for existing user first
    const newUserEmail = 'no_tx_user@example.com';
    // Cleanup first to ensure fresh state with hashed password
    await User.destroy({ where: { email: newUserEmail }, force: true } as any);

    const hashedPassword = await bcrypt.hash('password', 10);
    await User.create({
      email: newUserEmail,
      password: hashedPassword,
      name: 'NoTx',
    } as any);

    // Login as new user
    const newAgent = request.agent(app);
    await newAgent
      .post('/api/login')
      .send({ email: newUserEmail, password: 'password' });

    const res = await newAgent.get('/api/excel/user-transactions');
    expect(res.status).toBe(StatusCodes.OK);
    // Should return URL
    expect(res.body.data).toContain('https://mock-sas-url.com');
  });
});
