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

// Mock services to match existing test patterns
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

describe('Transaction Extra Amount Integration Test', () => {
  const agent = request.agent(app);
  let accountId = '';
  let categoryId = '';
  const TEST_USER_EMAIL = 'test_transaction_extra@example.com';
  const TEST_USER_PASSWORD = 'password';

  beforeAll(async () => {
    // Sync DB
    await sequelize.sync({ force: true });

    // 1. Ensure User Exists & Login
    const hashedPassword = await bcrypt.hash(TEST_USER_PASSWORD, 10);
    const user = await User.create({
      email: TEST_USER_EMAIL,
      password: hashedPassword,
      name: 'TransactionExtraUser',
    } as any);

    const loginRes = await agent.post('/api/login').send({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    });

    if (loginRes.status !== StatusCodes.OK) {
      throw new Error('Login failed: ' + JSON.stringify(loginRes.body));
    }

    // 2. Setup Account
    const account = await Account.create({
      userId: user.id,
      name: 'TransactionExtraAccount',
      type: '銀行',
      balance: 10000,
      icon: 'bank',
      color: '#000000',
    } as any);
    accountId = account.id;

    // 3. Setup Category
    const category = await Category.create({
      userId: user.id,
      name: 'TransactionExtraFood',
      type: RootType.EXPENSE,
      icon: 'food',
      color: '#000',
      parentId: null,
    } as any);
    categoryId = category.id;
  });

  it('should create TransactionExtra record and link FK correctly', async () => {
    // Given
    const transactionData = {
      amount: 1000,
      type: RootType.EXPENSE,
      date: '2026-01-16',
      time: '12:00:00',
      accountId: accountId,
      categoryId: categoryId,
      paymentFrequency: PaymentFrequency.ONE_TIME,
      extraAdd: 50,
      extraMinus: 10,
    };

    // When
    const res = await agent.post('/api/transaction').send(transactionData);

    // Then
    expect(res.status).toBe(StatusCodes.OK);
    const transactionId = res.body.id;
    expect(transactionId).toBeDefined();

    // Verify Transaction
    const transaction = await Transaction.findByPk(transactionId);
    expect(transaction).toBeDefined();

    // Verify FK (transactionExtraId) - casting to any as property doesn't exist yet
    const transactionExtraId = (transaction as any).transactionExtraId;
    expect(transactionExtraId).toBeDefined();
    expect(transactionExtraId).not.toBeNull();

    // Verify TransactionExtra record via Raw SQL (since model doesn't exist yet)
    // Assuming table name is 'transaction_extras' or similar based on convention
    // We check both likely naming conventions just in case, but standard sequelize is usually snake_case plural
    const [results] = await sequelize.query(
      `SELECT * FROM "transaction_extras" WHERE id = :id`,
      { replacements: { id: transactionExtraId } }
    );

    expect(results.length).toBe(1);
    const extraRecord: any = results[0];
    
    expect(Number(extraRecord.extraAdd)).toBe(50);
    expect(Number(extraRecord.extraMinus)).toBe(10);
  });
});
