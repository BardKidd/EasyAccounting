import { describe, it, expect, beforeAll, vi, afterAll } from 'vitest';
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

// Mock services to avoid external calls
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

describe('Transaction Zero Amount Logic (Task 2.1)', () => {
  const agent = request.agent(app);
  let user: User;
  let account: Account;
  let category: Category;

  const TEST_USER_EMAIL = 'zero_amount_test@example.com';
  const TEST_USER_PASSWORD = 'password123';

  beforeAll(async () => {
    // 1. Create User
    const hashedPassword = await bcrypt.hash(TEST_USER_PASSWORD, 10);
    user = await User.create({
      email: TEST_USER_EMAIL,
      password: hashedPassword,
      name: 'ZeroAmountTester',
    } as any);

    // 2. Login
    const loginRes = await agent.post('/api/login').send({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    });
    expect(loginRes.status).toBe(StatusCodes.OK);

    // 3. Create Account
    account = await Account.create({
      userId: user.id,
      name: 'ZeroTestAccount',
      type: '銀行',
      balance: 1000,
      icon: 'bank',
      color: '#000000',
    } as any);

    // 4. Create Category
    category = await Category.create({
      userId: user.id,
      name: 'ZeroTestCategory',
      type: RootType.EXPENSE,
      icon: 'food',
      color: '#000',
      parentId: null,
    } as any);
  });

  afterAll(async () => {
    // Cleanup
    if (user) {
        // This will cascade delete accounts and transactions usually
        await user.destroy(); 
    }
  });

  it('2.1 Positive: Create a 0 amount expense transaction successfully', async () => {
    // Arrange
    const initialBalance = Number(account.balance);
    const payload = {
      accountId: account.id,
      categoryId: category.id,
      amount: 0, // Zero Amount
      date: new Date().toISOString().split('T')[0],
      time: '12:00',
      type: RootType.EXPENSE,
      paymentFrequency: PaymentFrequency.ONE_TIME,
      description: 'Zero Amount Expense Test',
      receipt: null,
      mainCategory: category.id,
    };

    // Act
    const res = await agent.post('/api/transaction').send(payload);

    // Assert - API Response
    expect(res.status).toBe(StatusCodes.CREATED); // Expect 201
    expect(res.body.isSuccess).toBe(true);
    expect(Number(res.body.data.amount)).toBe(0);

    // Assert - Database Transaction
    const tx = await Transaction.findOne({
      where: {
        id: res.body.data.id,
      },
    });
    expect(tx).toBeTruthy();
    expect(Number(tx?.amount)).toBe(0);
    expect(tx?.type).toBe(RootType.EXPENSE);

    // Assert - Account Balance (Should match initial since 0 was spent)
    const updatedAccount = await Account.findByPk(account.id);
    expect(Number(updatedAccount?.balance)).toBe(initialBalance);
  });
});
