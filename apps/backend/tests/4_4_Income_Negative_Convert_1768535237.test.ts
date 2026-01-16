import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import User from '@/models/user';
import Account from '@/models/account';
import Category from '@/models/category';
import Transaction from '@/models/transaction';
import sequelize from '@/utils/postgres';
import { RootType } from '@repo/shared';
import { StatusCodes } from 'http-status-codes';
import bcrypt from 'bcrypt';

// Mock email service to avoid Resend API key error
vi.mock('@/services/emailService', () => ({
  sendDailyReminderEmail: vi.fn(),
  sendWeeklySummaryEmail: vi.fn(),
  sendMonthlyAnalysisEmail: vi.fn(),
  sendWelcomeEmail: vi.fn(),
}));

// Mock azureBlob to avoid Invalid URL error
vi.mock('@/utils/azureBlob', () => ({
  uploadFileToBlob: vi.fn(),
  generateSasUrl: vi.fn(),
  downloadBuffer: vi.fn(),
}));

describe('Task 4.4: Income Negative Convert', () => {
  const agent = request.agent(app);

  let accountId = '';
  let incomeCategoryId = '';

  const TEST_USER_EMAIL = 'income_neg_test@example.com';
  const TEST_USER_PASSWORD = 'password';

  beforeAll(async () => {
    // Sync DB (Following existing pattern in transaction.test.ts)
    await sequelize.sync({ force: true });

    // 1. Setup User
    const hashedPassword = await bcrypt.hash(TEST_USER_PASSWORD, 10);
    const user = await User.create({
      email: TEST_USER_EMAIL,
      password: hashedPassword,
      name: 'IncomeTestUser',
    } as any);

    // Login
    await agent.post('/api/login').send({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    });

    // 2. Setup Account
    const account = await Account.create({
      userId: user.id,
      name: 'IncomeTestAccount',
      type: '銀行',
      balance: 10000,
      icon: 'bank',
      color: '#000000',
    } as any);
    accountId = account.id;

    // 3. Setup Income Category
    const category = await Category.create({
      userId: user.id,
      name: 'Salary',
      type: RootType.INCOME,
      icon: 'money',
      color: '#000',
      parentId: null,
    } as any);
    incomeCategoryId = category.id;
  });

  it('should convert negative income to positive expense', async () => {
    // Given: type = INCOME, amount = -50
    const payload = {
      type: RootType.INCOME,
      amount: -50,
      accountId: accountId,
      categoryId: incomeCategoryId,
      date: new Date().toISOString(),
      note: 'Negative income test',
    };

    // When: POST /api/transaction
    const res = await agent.post('/api/transaction').send(payload);

    // Then: 交易建立成功 (非 400 Error)
    expect(res.status).toBe(StatusCodes.CREATED);

    const transactionId = res.body.id;
    const transaction = await Transaction.findByPk(transactionId);

    expect(transaction).not.toBeNull();
    // Then: DB 中 amount = 50 (絕對值)
    expect(Number(transaction?.amount)).toBe(50);
    // Then: DB 中 type = EXPENSE (類型反轉)
    expect(transaction?.type).toBe(RootType.EXPENSE);
  });
});