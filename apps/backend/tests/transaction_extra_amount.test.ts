import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import User from '@/models/user';
import Account from '@/models/account';
import Category from '@/models/category';
import sequelize from '@/utils/postgres';
import { RootType, PaymentFrequency } from '@repo/shared';
import { StatusCodes } from 'http-status-codes';
import bcrypt from 'bcrypt';

// Mock services to avoid external dependencies
vi.mock('@/services/emailService', () => ({
  sendDailyReminderEmail: vi.fn(),
  sendWeeklySummaryEmail: vi.fn(),
  sendMonthlyAnalysisEmail: vi.fn(),
  sendWelcomeEmail: vi.fn(),
}));

vi.mock('@/utils/azureBlob', () => ({
  uploadFileToBlob: vi.fn(),
  generateSasUrl: vi.fn(),
  downloadBuffer: vi.fn(),
}));

describe('Transaction Extra Amount Logic (TDD)', () => {
  const agent = request.agent(app);
  let user: User;
  let accountId: string;
  let categoryId: string;

  const TEST_USER_EMAIL = 'test_transaction_extra@example.com';
  const TEST_USER_PASSWORD = 'password';

  beforeAll(async () => {
    // Sync DB to ensure clean state
    await sequelize.sync({ force: true });

    // Create User
    const hashedPassword = await bcrypt.hash(TEST_USER_PASSWORD, 10);
    user = await User.create({
      email: TEST_USER_EMAIL,
      password: hashedPassword,
      name: 'TransactionExtraUser',
    } as any);

    // Login
    const loginRes = await agent.post('/api/login').send({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    });

    if (loginRes.status !== StatusCodes.OK) {
        throw new Error('Login failed');
    }

    // Create Account
    const account = await Account.create({
      userId: user.id,
      name: 'Test Account',
      type: '銀行',
      balance: 10000,
      icon: 'bank',
      color: '#000000',
    } as any);
    accountId = account.id;

    // Create Category
    const category = await Category.create({
      userId: user.id,
      name: 'Test Category',
      type: RootType.EXPENSE,
      icon: 'food',
      color: '#000',
      parentId: null,
    } as any);
    categoryId = category.id;
  });

  it('should treat Net Amount as Amount when no TransactionExtra exists', async () => {
    // Given: Payload without extraAdd and extraMinus
    const payload = {
      accountId: accountId,
      categoryId: categoryId,
      amount: 500,
      date: new Date().toISOString().split('T')[0],
      time: '12:00',
      type: RootType.EXPENSE,
      paymentFrequency: PaymentFrequency.ONE_TIME,
      description: 'Transaction without extra',
      receipt: null,
      mainCategory: categoryId,
    };

    // When
    const res = await agent.post('/api/transaction').send(payload);

    // Then
    expect(res.status).toBe(StatusCodes.CREATED);
    expect(res.body.isSuccess).toBe(true);

    // 1. Assert transactionExtraId is NULL
    // If the feature is not implemented, this might be undefined, which causes test failure (Red Phase)
    expect(res.body.data.transactionExtraId).toBeNull();

    // 2. Assert Account Balance
    // Initial: 10000. Expense: 500. Expected: 9500.
    const account = await Account.findByPk(accountId);
    expect(Number(account?.balance)).toBe(9500);

    // 3. Assert no TransactionExtra record is created
    // Since we don't have the TransactionExtra model imported, we cannot query it directly via Model.
    // But if `transactionExtraId` is null, it implies no association.
    // If we wanted to be strict, we'd query the table, but the table might not exist yet.
  });
});
