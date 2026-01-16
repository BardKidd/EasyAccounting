import '@/models'; // Register all models
import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import User from '@/models/user';
import Account from '@/models/account';
import Category from '@/models/category';
import InstallmentPlan from '@/models/InstallmentPlan';
import CreditCardDetail from '@/models/CreditCardDetail';
import Transaction from '@/models/transaction';
import TransactionExtra from '@/models/TransactionExtra';
import sequelize from '@/utils/postgres';
import { RootType, PaymentFrequency } from '@repo/shared';
import { StatusCodes } from 'http-status-codes';
import bcrypt from 'bcrypt';

// Mock dependencies
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

describe('Transaction Extra Cascade Delete', () => {
  const agent = request.agent(app);
  let userId: string;
  let accountId: string;
  let categoryId: string;
  const TEST_USER_EMAIL = 'test_extra_cascade@example.com';
  const TEST_USER_PASSWORD = 'password';

  beforeAll(async () => {
    // Ensure schema exists
    await sequelize.query('CREATE SCHEMA IF NOT EXISTS accounting;');
    
    // Sync models in order
    await User.sync({ force: true });
    await Account.sync({ force: true });
    await Category.sync({ force: true });
    await TransactionExtra.sync({ force: true });
    await InstallmentPlan.sync({ force: true });
    await CreditCardDetail.sync({ force: true });
    await Transaction.sync({ force: true });

    // Create User
    const hashedPassword = await bcrypt.hash(TEST_USER_PASSWORD, 10);
    const user = await User.create({
      email: TEST_USER_EMAIL,
      password: hashedPassword,
      name: 'TransactionExtraUser',
    } as any);
    userId = user.id;

    // Login
    const loginRes = await agent.post('/api/login').send({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    });
    
    if (loginRes.status !== StatusCodes.OK) {
        throw new Error('Login failed');
    }

    // Create Account
    const account = await Account.create({
      userId: userId,
      name: 'ExtraTestAccount',
      type: '銀行',
      balance: 10000,
      icon: 'bank',
      color: '#000000',
    } as any);
    accountId = account.id;

    // Create Category
    const category = await Category.create({
      userId: userId,
      name: 'ExtraTestFood',
      type: RootType.EXPENSE,
      icon: 'food',
      color: '#000',
      parentId: null,
    } as any);
    categoryId = category.id;
  });

  it('should cascade delete TransactionExtra when Transaction is deleted', async () => {
    // Given: Create a transaction with Extra details
    const createPayload = {
      amount: 1000,
      type: RootType.EXPENSE,
      date: '2026-01-16',
      time: '12:00:00',
      accountId: accountId,
      categoryId: categoryId,
      paymentFrequency: PaymentFrequency.ONE_TIME,
      description: 'Test extra description',
      receipt: null,
      // Extra fields
      extraAdd: 100,
      extraAddLabel: 'Discount',
      extraMinus: 10,
      extraMinusLabel: 'Fee',
    };

    const createRes = await agent.post('/api/transaction').send(createPayload);
    expect(createRes.status).toBe(StatusCodes.CREATED);
    const transactionId = createRes.body.data.id;

    // Verify TransactionExtra exists via linkage
    const tx = await Transaction.findByPk(transactionId);
    const transactionExtraId = (tx as any).transactionExtraId;
    expect(transactionExtraId).not.toBeNull();

    // Verify record in DB
    const [results] = await sequelize.query(
      `SELECT * FROM accounting.transaction_extra WHERE id = '${transactionExtraId}'`
    );
    expect(results.length).toBe(1);

    // When: Delete the transaction
    const deleteRes = await agent.delete(`/api/transaction/${transactionId}`);
    expect(deleteRes.status).toBe(StatusCodes.OK);

    // Then: TransactionExtra should be deleted (Cascade)
    const [resultsAfter] = await sequelize.query(
      `SELECT * FROM accounting.transaction_extra WHERE id = '${transactionExtraId}'`
    );

    if (resultsAfter.length > 0) {
      const recordAfter = resultsAfter[0] as any;
      expect(recordAfter.deletedAt).not.toBeNull();
    } else {
      expect(resultsAfter.length).toBe(0);
    }
  });
});
