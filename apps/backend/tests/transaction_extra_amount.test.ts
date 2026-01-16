import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
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

describe('Transaction Extra Amount Auto-Cleanup Test', () => {
  const agent = request.agent(app);
  let userId: string;
  let accountId: string;
  let categoryId: string;
  const TEST_USER_EMAIL = 'test_transaction_extra@example.com';
  const TEST_USER_PASSWORD = 'password';

  beforeAll(async () => {
    // Sync DB manually to ensure order
    // 1. Drop all known tables first (reverse order roughly)
    await Transaction.drop({ cascade: true });
    await CreditCardDetail.drop({ cascade: true });
    await InstallmentPlan.drop({ cascade: true });
    await Category.drop({ cascade: true });
    await Account.drop({ cascade: true });
    await User.drop({ cascade: true });

    // 2. Create tables in dependency order
    await User.sync({ force: true });
    await Account.sync({ force: true });
    await Category.sync({ force: true });
    await InstallmentPlan.sync({ force: true });
    await CreditCardDetail.sync({ force: true });
    await Transaction.sync({ force: true });

    // 1. Create User & Login
    const hashedPassword = await bcrypt.hash(TEST_USER_PASSWORD, 10);
    const user = await User.create({
      email: TEST_USER_EMAIL,
      password: hashedPassword,
      name: 'TransactionExtraUser',
    } as any);
    userId = user.id;

    const loginRes = await agent.post('/api/login').send({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    });
    
    if (loginRes.status !== StatusCodes.OK) {
      throw new Error('Login failed');
    }

    // 2. Create Account
    const account = await Account.create({
      userId: user.id,
      name: 'ExtraTestAccount',
      type: '銀行',
      balance: 10000,
      icon: 'bank',
      color: '#000000',
    } as any);
    accountId = account.id;

    // 3. Create Category
    const category = await Category.create({
      userId: user.id,
      name: 'ExtraTestCategory',
      type: RootType.EXPENSE,
      icon: 'food',
      color: '#000',
      parentId: null,
    } as any);
    categoryId = category.id;
  });

  it('should auto-cleanup TransactionExtra when all values are default', async () => {
    // 1. Given: Create a transaction with TransactionExtra
    const createPayload = {
      accountId: accountId,
      categoryId: categoryId,
      amount: 1000,
      date: new Date().toISOString().split('T')[0],
      time: '12:00',
      type: RootType.EXPENSE,
      paymentFrequency: PaymentFrequency.ONE_TIME,
      description: 'Transaction with Extra',
      receipt: null,
      mainCategory: categoryId,
      // Extra fields
      extraAdd: 100,
      extraMinus: 50,
      extraAddLabel: 'Bonus',
      extraMinusLabel: 'Fee',
    };

    const createRes = await agent.post('/api/transaction').send(createPayload);
    expect(createRes.status).toBe(StatusCodes.CREATED);
    const transactionId = createRes.body.data.id;

    // Verify TransactionExtra exists (Assertion 1)
    // Using raw query since we cannot import TransactionExtra model
    // Assuming table name 'transaction_extra' based on convention/spec
    // Also assuming transaction has transactionExtraId which we can't type check easily
    const txAfterCreate = await Transaction.findByPk(transactionId);
    expect(txAfterCreate).not.toBeNull();
    
    // Casting to any to access potentially missing property in types
    const extraId = (txAfterCreate as any).transactionExtraId;
    
    // This assertion expects the feature to be implemented (Red Phase)
    expect(extraId).toBeDefined();
    expect(extraId).not.toBeNull();

    // Verify raw DB record
    const [extraRecord] = await sequelize.query(
      `SELECT * FROM "accounting"."transaction_extra" WHERE id = '${extraId}'`
    );
    expect(extraRecord.length).toBe(1);
    expect((extraRecord[0] as any).extraAdd).toBe('100'); // Decimal returned as string usually

    // 2. When: PUT /api/transaction/{transactionId} with extraAdd=0, extraMinus=0, Labels=Default
    const updatePayload = {
      accountId: accountId,
      categoryId: categoryId,
      amount: 1000, // Keep same amount
      date: createPayload.date,
      time: createPayload.time,
      type: RootType.EXPENSE,
      paymentFrequency: PaymentFrequency.ONE_TIME,
      description: 'Updated to cleanup extra',
      mainCategory: categoryId,
      // Reset Extra to defaults
      extraAdd: 0,
      extraMinus: 0,
      extraAddLabel: '折扣', // Default label
      extraMinusLabel: '手續費', // Default label
    };

    const updateRes = await agent.put(`/api/transaction/${transactionId}`).send(updatePayload);
    expect(updateRes.status).toBe(StatusCodes.OK);

    // 3. Then: 
    // a. Transaction update success
    expect(updateRes.body.isSuccess).toBe(true);

    // b. TransactionExtra should be deleted
    // We check the OLD extraId to ensure it's gone
    const [deletedExtraRecord] = await sequelize.query(
      `SELECT * FROM "accounting"."transaction_extra" WHERE id = '${extraId}'`
    );
    expect(deletedExtraRecord.length).toBe(0);

    // c. Transaction.transactionExtraId should be NULL
    const txAfterUpdate = await Transaction.findByPk(transactionId);
    expect((txAfterUpdate as any).transactionExtraId).toBeNull();
  });
});
