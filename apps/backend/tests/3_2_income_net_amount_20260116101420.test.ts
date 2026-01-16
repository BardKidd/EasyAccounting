import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';

// Mock email service
vi.mock('@/services/emailService', () => ({
  sendDailyReminderEmail: vi.fn(),
  sendWeeklySummaryEmail: vi.fn(),
  sendMonthlyAnalysisEmail: vi.fn(),
  sendWelcomeEmail: vi.fn(),
}));

// Mock azureBlob
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
import InstallmentPlan from '@/models/InstallmentPlan';
import CreditCardDetail from '@/models/CreditCardDetail';
import sequelize from '@/utils/postgres';
import { RootType, PaymentFrequency } from '@repo/shared';
import { StatusCodes } from 'http-status-codes';
import bcrypt from 'bcrypt';

describe('3.2 Income Net Amount', () => {
  const agent = request.agent(app);
  let accountId = '';
  let categoryId = '';
  const TEST_USER_EMAIL = 'test_net_amount@example.com';
  const TEST_USER_PASSWORD = 'password';

  beforeAll(async () => {
    // Sync DB in order to avoid foreign key issues
    await User.sync({ force: true });
    await Account.sync({ force: true });
    await Category.sync({ force: true });
    await InstallmentPlan.sync({ force: true });
    await Transaction.sync({ force: true });
    await CreditCardDetail.sync({ force: true });

    // 1. Create User & Login
    const hashedPassword = await bcrypt.hash(TEST_USER_PASSWORD, 10);
    const user = await User.create({
      email: TEST_USER_EMAIL,
      password: hashedPassword,
      name: 'NetAmountTestUser',
    } as any);

    const loginRes = await agent.post('/api/login').send({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    });

    if (loginRes.status !== StatusCodes.OK) {
      throw new Error('Login failed: ' + JSON.stringify(loginRes.body));
    }

    // 2. Create Account with 10000 balance
    const account = await Account.create({
      userId: user.id,
      name: 'Net Amount Test Account',
      type: '銀行',
      balance: 10000,
      icon: 'bank',
      color: '#000000',
    } as any);
    accountId = account.id;

    // 3. Create Income Category
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

  it('should calculate income net amount correctly: amount - extraMinus + extraAdd', async () => {
    // Given
    const payload = {
      accountId: accountId,
      categoryId: categoryId,
      amount: 50000,
      extraMinus: 15,
      extraAdd: 0,
      date: new Date().toISOString().split('T')[0],
      time: '12:00',
      type: RootType.INCOME,
      paymentFrequency: PaymentFrequency.ONE_TIME,
      description: 'Income with extras',
      receipt: null,
      mainCategory: categoryId,
    };

    // When
    const res = await agent.post('/api/transaction').send(payload);

    // Then
    expect(res.status).toBe(StatusCodes.CREATED);
    expect(res.body.isSuccess).toBe(true);

    const tx = await Transaction.findOne({
      where: {
        description: 'Income with extras',
      },
    });

    expect(tx).toBeTruthy();
    
    // Assert Net Amount = 49985 (50000 - 15 + 0)
    // Even if the field is not in the model yet (TDD Red Phase), 
    // we assert what the spec requires.
    expect((tx as any).netAmount).toBe(49985);
    
    // Assert Account Balance correctly increased
    const updatedAccount = await Account.findByPk(accountId);
    const expectedBalance = 10000 + 49985; // 59985
    expect(Number(updatedAccount?.balance)).toBe(expectedBalance);
  });
});
