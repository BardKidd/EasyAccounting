import '@/models'; // Register all models
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import User from '@/models/user';
import Account from '@/models/account';
import Category from '@/models/category';
import InstallmentPlan from '@/models/InstallmentPlan';
import CreditCardDetail from '@/models/CreditCardDetail';
import Transaction from '@/models/transaction';
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
  let user: User;
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
    await InstallmentPlan.sync({ force: true });
    await CreditCardDetail.sync({ force: true });
    await Transaction.sync({ force: true });

    // Create User
    const hashedPassword = await bcrypt.hash(TEST_USER_PASSWORD, 10);
    user = await User.create({
      email: TEST_USER_EMAIL,
      password: hashedPassword,
      name: 'TransactionExtraUser',
    } as any);

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
      userId: user.id,
      name: 'ExtraTestAccount',
      type: '銀行',
      balance: 10000,
      icon: 'bank',
      color: '#000000',
    } as any);
    accountId = account.id;

    // Create Category
    const category = await Category.create({
      userId: user.id,
      name: 'ExtraTestFood',
      type: RootType.EXPENSE,
      icon: 'food',
      color: '#000',
      parentId: null,
    } as any);
    categoryId = category.id;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('should cascade delete TransactionExtra when Transaction is deleted', async () => {
    // Given: Create a transaction with Extra details
    // Assuming API accepts these fields as per spec
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
    
    // We expect 201 Created. If implementation is missing, this might pass but ignore extra fields, 
    // or fail if validation is strict.
    expect(createRes.status).toBe(StatusCodes.CREATED);
    const transactionId = createRes.body.data.id;
    expect(transactionId).toBeDefined();

    // Verify TransactionExtra exists via linkage
    const tx = await Transaction.findByPk(transactionId);
    expect(tx).not.toBeNull();
    
    // Access potential new field `transactionExtraId`
    // Using cast to any because the model definition in `src` doesn't have it yet
    const transactionExtraId = (tx as any).transactionExtraId;
    
    // This assertion fails if the field wasn't populated (i.e. implementation missing)
    expect(transactionExtraId).toBeDefined();
    expect(transactionExtraId).not.toBeNull();

    // Verify record in DB table 'transaction_extra' (assuming freezeTableName=true and name='transaction_extra')
    // Note: Schema is 'accounting' based on postgres.ts
    const [results] = await sequelize.query(
      `SELECT * FROM accounting.transaction_extra WHERE id = '${transactionExtraId}'`
    );
    expect(results.length).toBe(1);
    const extraRecord = results[0] as any;
    // Verify content
    expect(parseFloat(extraRecord.extraAdd)).toBe(100);
    expect(parseFloat(extraRecord.extraMinus)).toBe(10);

    // When: Delete the transaction
    const deleteRes = await agent.delete(`/api/transaction/${transactionId}`);
    expect(deleteRes.status).toBe(StatusCodes.OK);

    // Then: TransactionExtra should be deleted (Cascade)
    // Query again
    const [resultsAfter] = await sequelize.query(
      `SELECT * FROM accounting.transaction_extra WHERE id = '${transactionExtraId}'`
    );

    if (resultsAfter.length > 0) {
      // If it exists, it MUST be soft deleted (deletedAt is not null)
      const recordAfter = resultsAfter[0] as any;
      expect(recordAfter.deletedAt).not.toBeNull();
    } else {
      // Or it is physically deleted
      expect(resultsAfter.length).toBe(0);
    }
  });
});
