import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';

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

import { app } from '../src/app';
import User from '@/models/user';
import Account from '@/models/account';
import Category from '@/models/category';
import Transaction from '@/models/transaction';
import sequelize from '@/utils/postgres';
import { RootType, PaymentFrequency } from '@repo/shared';
import { StatusCodes } from 'http-status-codes';
import bcrypt from 'bcrypt';

describe('Task 4.5: Extra Amount Negative Abs', () => {
  const agent = request.agent(app);

  let accountId = '';
  let categoryId = '';
  let userId = '';

  const TEST_USER_EMAIL = 'test_extra_neg@example.com';
  const TEST_USER_PASSWORD = 'password';

  beforeAll(async () => {
    // Sync DB (SQLite in memory or Postgres depending on config, but force: true)
    await sequelize.sync({ force: true });

    const hashedPassword = await bcrypt.hash(TEST_USER_PASSWORD, 10);
    const user = await User.create({
      email: TEST_USER_EMAIL,
      password: hashedPassword,
      name: 'ExtraNegTestUser',
    } as any);
    userId = user.id;

    const loginRes = await agent.post('/api/login').send({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    });

    if (loginRes.status !== StatusCodes.OK) {
      throw new Error('Login failed');
    }

    const account = await Account.create({
      userId: user.id,
      name: 'ExtraNegTestAccount',
      type: '銀行',
      balance: 10000,
      icon: 'bank',
      color: '#000000',
    } as any);
    accountId = account.id;

    const category = await Category.create({
      userId: user.id,
      name: 'Food',
      type: RootType.EXPENSE,
      icon: 'food',
      color: '#000',
      parentId: null,
    } as any);
    categoryId = category.id;
  });

  it('should convert negative extra amounts to absolute values', async () => {
    // Given: 已登入使用者，有帳戶
    // Payload: extraAdd = -50, extraMinus = -10
    const payload = {
      type: RootType.EXPENSE,
      accountId,
      categoryId,
      amount: 100,
      date: '2026-01-16',
      time: '12:00:00',
      billingDate: '2026-01-16',
      paymentFrequency: PaymentFrequency.ONE_TIME,
      extraAdd: -50,
      extraMinus: -10,
      extraAddLabel: 'Discount',
      extraMinusLabel: 'Fee'
    };

    // When: POST /api/transaction
    const response = await agent.post('/api/transaction').send(payload);

    // Then: 交易建立成功
    expect(response.status).toBe(StatusCodes.CREATED);

    // DB 中 TransactionExtra.extraAdd = 50 (絕對值)
    // DB 中 TransactionExtra.extraMinus = 10 (絕對值)
    const transaction = await Transaction.findOne({
      where: { userId },
      // 假設關聯名稱為 TransactionExtra
      // @ts-ignore
      include: ['TransactionExtra']
    });

    expect(transaction).toBeDefined();
    // @ts-ignore
    const extra = transaction.TransactionExtra;
    expect(extra).toBeDefined();
    
    // 斷言欄位值為正數 (絕對值)
    expect(Math.abs(Number(extra.extraAdd))).toBe(50);
    expect(Number(extra.extraAdd)).toBe(50);
    
    expect(Math.abs(Number(extra.extraMinus))).toBe(10);
    expect(Number(extra.extraMinus)).toBe(10);

    // 交易計算 Net Amount 時應使用正數值進行計算
    // 支出 Net Amount = amount + extraMinus - extraAdd
    // 100 + 10 - 50 = 60
    // 如果系統有回傳 netAmount 或者我們可以從帳戶餘額驗證
    const updatedAccount = await Account.findByPk(accountId);
    // 原始 10000 - 60 = 9940
    expect(Number(updatedAccount?.balance)).toBe(9940);
  });
});
