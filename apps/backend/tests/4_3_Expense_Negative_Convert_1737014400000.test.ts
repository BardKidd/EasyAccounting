import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import User from '@/models/user';
import Account from '@/models/account';
import Category from '@/models/category';
import Transaction from '@/models/transaction';
import sequelize from '@/utils/postgres';
import { RootType, PaymentFrequency } from '@repo/shared';
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

describe('4.3 Expense Negative Convert', () => {
  const agent = request.agent(app);
  let accountId = '';
  let categoryId = '';

  const TEST_USER_EMAIL = '4_3_test@example.com';
  const TEST_USER_PASSWORD = 'password';

  beforeAll(async () => {
    // 清理舊的測試資料
    await User.destroy({ where: { email: TEST_USER_EMAIL }, force: true });

    const hashedPassword = await bcrypt.hash(TEST_USER_PASSWORD, 10);
    const user = await User.create({
      email: TEST_USER_EMAIL,
      password: hashedPassword,
      name: 'Test User',
    } as any);

    const loginRes = await agent.post('/api/login').send({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    });

    if (loginRes.status !== StatusCodes.OK) {
      throw new Error('Login failed');
    }

    const account = await Account.create({
      userId: user.id,
      name: 'Test Account',
      type: '銀行',
      balance: 1000,
      icon: 'bank',
      color: '#000000',
    } as any);
    accountId = account.id;

    const category = await Category.create({
      userId: user.id,
      name: 'Test Expense Category',
      type: RootType.EXPENSE,
      icon: 'food',
      color: '#000',
    } as any);
    categoryId = category.id;
  });

  it('should convert negative expense to positive income', async () => {
    const payload = {
      accountId,
      categoryId,
      type: RootType.EXPENSE,
      amount: -10,
      date: new Date().toISOString().split('T')[0],
      time: '12:00',
      description: 'Negative expense test',
      receipt: null,
      paymentFrequency: PaymentFrequency.ONE_TIME,
    };

    const res = await agent.post('/api/transaction').send(payload);

    // 預期系統應處理此異常輸入並成功建立交易，而非回傳 400
    expect(res.status).toBe(StatusCodes.CREATED);

    const transaction = await Transaction.findOne({
      where: { description: 'Negative expense test' },
    });

    expect(transaction).not.toBeNull();
    // 斷言 amount 轉為正數 (絕對值)
    expect(Number(transaction?.amount)).toBe(10);
    // 斷言 type 轉為 INCOME (類型反轉)
    expect(transaction?.type).toBe(RootType.INCOME);
  });
});
