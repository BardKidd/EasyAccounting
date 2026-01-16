import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import User from '@/models/user';
import Account from '@/models/account';
import Category from '@/models/category';
import Transaction from '@/models/transaction';
import InstallmentPlan from '@/models/InstallmentPlan';
import CreditCardDetail from '@/models/CreditCardDetail';
import PersonnelNotification from '@/models/personnel_notification';
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

describe('Transaction Income Zero Test', () => {
  const agent = request.agent(app);
  let accountId = '';
  let categoryId = '';
  const TEST_USER_EMAIL = 'test_zero_income@example.com';
  const TEST_USER_PASSWORD = 'password';

  beforeAll(async () => {
    // Sync DB (SQLite in memory or test DB)
    await sequelize.query('CREATE SCHEMA IF NOT EXISTS accounting;');
    
    // Manual sync order
    await User.sync({ force: true });
    await PersonnelNotification.sync({ force: true });
    await Category.sync({ force: true });
    await Account.sync({ force: true });
    await CreditCardDetail.sync({ force: true });
    await InstallmentPlan.sync({ force: true });
    await Transaction.sync({ force: true });

    // Create User
    const hashedPassword = await bcrypt.hash(TEST_USER_PASSWORD, 10);
    const user = await User.create({
      email: TEST_USER_EMAIL,
      password: hashedPassword,
      name: 'ZeroIncomeUser',
    } as any);

    // Login
    await agent.post('/api/login').send({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    });

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

    // Create Income Category
    const category = await Category.create({
      userId: user.id,
      name: 'Salary',
      type: RootType.INCOME,
      icon: 'money',
      color: '#000',
      parentId: null,
    } as any);
    categoryId = category.id;
  });

  it('should create income transaction with zero amount', async () => {
    // Given: User logged in, account and income category exist (done in beforeAll)

    const initialAccount = await Account.findByPk(accountId);
    const initialBalance = Number(initialAccount?.balance);

    const payload = {
      accountId: accountId,
      categoryId: categoryId,
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      time: '12:00',
      type: RootType.INCOME,
      paymentFrequency: PaymentFrequency.ONE_TIME,
      description: 'Zero income test',
      receipt: null,
      mainCategory: categoryId,
    };

    // When
    const res = await agent.post('/api/transaction').send(payload);

    // Then
    expect(res.status).toBe(StatusCodes.CREATED);
    expect(res.body.isSuccess).toBe(true);

    // Verify DB
    const tx = await Transaction.findOne({
      where: {
        description: 'Zero income test',
      },
    });

    expect(tx).toBeTruthy();
    expect(Number(tx?.amount)).toBe(0);
    expect(tx?.type).toBe(RootType.INCOME);

    // Verify Balance Unchanged
    const updatedAccount = await Account.findByPk(accountId);
    expect(Number(updatedAccount?.balance)).toBe(initialBalance);
  });
});
