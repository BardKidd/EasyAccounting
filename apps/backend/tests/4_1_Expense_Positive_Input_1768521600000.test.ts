import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import User from '@/models/user';
import Account from '@/models/account';
import Category from '@/models/category';
import Transaction from '@/models/transaction';
import InstallmentPlan from '@/models/InstallmentPlan';
import CreditCardDetail from '@/models/CreditCardDetail';
import Announcement from '@/models/announcement';
import PersonnelNotification from '@/models/personnel_notification';
import sequelize from '@/utils/postgres';
import { RootType, PaymentFrequency } from '@repo/shared';
import { StatusCodes } from 'http-status-codes';
import bcrypt from 'bcrypt';

// Mock services to avoid external dependencies issues
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

describe('4.1 Expense Positive Input Processing', () => {
  const agent = request.agent(app);
  let user: any;
  let account: any;
  let category: any;

  const TEST_USER_EMAIL = 'positive_input_test@example.com';
  const TEST_USER_PASSWORD = 'password123';

  beforeAll(async () => {
    // Sync DB in order to handle foreign key dependencies correctly
    await User.sync({ force: true });
    await Account.sync({ force: true });
    await Category.sync({ force: true });
    await InstallmentPlan.sync({ force: true });
    await CreditCardDetail.sync({ force: true });
    await Transaction.sync({ force: true });
    await PersonnelNotification.sync({ force: true });

    const hashedPassword = await bcrypt.hash(TEST_USER_PASSWORD, 10);
    user = await User.create({
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

    account = await Account.create({
      userId: user.id,
      name: 'Test Account',
      type: '銀行',
      balance: 1000,
      icon: 'bank',
      color: '#000000',
    } as any);

    category = await Category.create({
      userId: user.id,
      name: 'Test Category',
      type: RootType.EXPENSE,
      icon: 'food',
      color: '#000000',
      parentId: null,
    } as any);
  });

  it('should store positive expense amount as is', async () => {
    const payload = {
      type: RootType.EXPENSE,
      amount: 100, // 正數
      accountId: account.id,
      categoryId: category.id,
      date: new Date().toISOString().split('T')[0],
      time: '12:00:00',
      description: 'Positive expense test',
      receipt: null,
      paymentFrequency: PaymentFrequency.ONE_TIME,
    };

    const response = await agent.post('/api/transaction').send(payload);

    expect(response.status).toBe(StatusCodes.CREATED);
    
    // 檢查資料庫中的資料
    const transaction = await Transaction.findOne({
      where: { id: response.body.data.id }
    });

    expect(transaction).toBeDefined();
    expect(Number(transaction!.amount)).toBe(100);
    expect(transaction!.type).toBe(RootType.EXPENSE);
  });
});