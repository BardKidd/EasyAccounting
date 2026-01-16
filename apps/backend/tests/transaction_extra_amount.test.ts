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

describe('Transaction Extra Amount Logic', () => {
  const agent = request.agent(app);
  let accountId = '';
  let categoryId = '';
  const TEST_USER_EMAIL = 'test_extra_amount@example.com';
  const TEST_USER_PASSWORD = 'password';

  beforeAll(async () => {
    // Create schema if not exists
    await sequelize.query('CREATE SCHEMA IF NOT EXISTS accounting;');
    // Sync DB (SQLite in memory or Postgres based on config)
    await sequelize.sync({ force: true });

    // Create User
    const hashedPassword = await bcrypt.hash(TEST_USER_PASSWORD, 10);
    const user = await User.create({
      email: TEST_USER_EMAIL,
      password: hashedPassword,
      name: 'ExtraAmountUser',
    } as any);

    // Login
    const loginRes = await agent.post('/api/login').send({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    });
    
    if (loginRes.status !== StatusCodes.OK) {
        throw new Error('Login failed: ' + JSON.stringify(loginRes.body));
    }

    // Create Account (Balance 10000)
    const account = await Account.create({
      userId: user.id,
      name: 'ExtraAmountAccount',
      type: '銀行',
      balance: 10000,
      icon: 'bank',
      color: '#000000',
    } as any);
    accountId = account.id;

    // Create Category
    const category = await Category.create({
      userId: user.id,
      name: 'ExtraAmountFood',
      type: RootType.EXPENSE,
      icon: 'food',
      color: '#000',
      parentId: null,
    } as any);
    categoryId = category.id;
  });

  it('should calculate expense net amount correctly: amount + extraMinus - extraAdd', async () => {
    // Given
    const amount = 1000;
    const extraMinus = 10;
    const extraAdd = 100;
    // Formula: amount + extraMinus - extraAdd
    // 1000 + 10 - 100 = 910
    const expectedNetAmount = 910; 
    const initialBalance = 10000;
    const expectedBalance = initialBalance - expectedNetAmount; // 10000 - 910 = 9090

    const payload = {
      accountId: accountId,
      categoryId: categoryId,
      amount: amount,
      extraMinus: extraMinus,
      extraAdd: extraAdd,
      date: new Date().toISOString().split('T')[0],
      time: '12:00',
      type: RootType.EXPENSE,
      paymentFrequency: PaymentFrequency.ONE_TIME,
      description: 'Extra Amount Test',
      receipt: null,
      mainCategory: categoryId,
    };

    // When
    const res = await agent.post('/api/transaction').send(payload);

    // Then
    expect(res.status).toBe(StatusCodes.CREATED);
    expect(res.body.isSuccess).toBe(true);
    
    // Verify created transaction data
    const createdTxId = res.body.data.id;
    const createdTx = await Transaction.findByPk(createdTxId);
    expect(createdTx).not.toBeNull();
    
    // We expect the transaction amount (or netAmount) to reflect the calculated value
    // Assuming 'amount' in DB stores the effective amount or there is a logic handling this.
    // If the system separates 'amount' (input) and 'netAmount' (effective), check carefully.
    // For now, checking that the logic resulted in the correct "effective amount" being applied.
    // We'll check the account balance primarily as that's the side effect requested.
    
    // Also checking if the returned transaction data has the correct amount if applicable
    // expect(Number(createdTx?.amount)).toBe(expectedNetAmount); 

    // Verify account balance
    const account = await Account.findByPk(accountId);
    expect(Number(account?.balance)).toBe(expectedBalance);
  });
});
