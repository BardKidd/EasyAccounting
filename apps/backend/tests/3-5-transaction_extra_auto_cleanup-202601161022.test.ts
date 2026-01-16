import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { User, Account, Category, Transaction, TransactionExtra, InstallmentPlan, CreditCardDetail } from '@/models';
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

describe('Transaction Extra Amount Auto-Cleanup Test', () => {
  const agent = request.agent(app);
  let userId: string;
  let accountId: string;
  let categoryId: string;
  const TEST_USER_EMAIL = 'test_extra_cleanup@example.com';
  const TEST_USER_PASSWORD = 'password';

  beforeAll(async () => {
    // 1. Ensure schema
    await sequelize.query('CREATE SCHEMA IF NOT EXISTS accounting;');

    // 2. Create tables in dependency order
    await User.sync({ force: true });
    await Account.sync({ force: true });
    await Category.sync({ force: true });
    await TransactionExtra.sync({ force: true });
    await InstallmentPlan.sync({ force: true });
    await Transaction.sync({ force: true });
    await CreditCardDetail.sync({ force: true });

    // 3. Setup User
    const hashedPassword = await bcrypt.hash(TEST_USER_PASSWORD, 10);
    const user = await User.create({
      email: TEST_USER_EMAIL,
      password: hashedPassword,
      name: 'CleanupUser',
    } as any);
    userId = user.id;

    // 4. Login
    await agent.post('/api/login').send({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    });

    // 5. Setup Account
    const account = await Account.create({
      userId: userId,
      name: 'CleanupAccount',
      type: '銀行',
      balance: 10000,
      icon: 'bank',
      color: '#000000',
    } as any);
    accountId = account.id;

    // 6. Setup Category
    const category = await Category.create({
      userId: userId,
      name: 'CleanupFood',
      type: RootType.EXPENSE,
      icon: 'food',
      color: '#000',
      parentId: null,
    } as any);
    categoryId = category.id;
  });

  it('should auto-cleanup TransactionExtra when all values are default', async () => {
    // 1. Create with extra
    const createRes = await agent.post('/api/transaction').send({
      amount: 1000,
      type: RootType.EXPENSE,
      date: '2026-01-16',
      time: '12:00:00',
      accountId,
      categoryId,
      paymentFrequency: PaymentFrequency.ONE_TIME,
      description: 'Auto Cleanup Test',
      receipt: null,
      extraAdd: 100,
    });
    
    expect(createRes.status).toBe(StatusCodes.CREATED);
    const transactionId = createRes.body.data.id;
    const initialTx = await Transaction.findByPk(transactionId);
    const extraId = (initialTx as any).transactionExtraId;
    expect(extraId).not.toBeNull();

    // 2. Update to zero extra
    const updateRes = await agent.put(`/api/transaction/${transactionId}`).send({
      amount: 1000,
      type: RootType.EXPENSE,
      date: '2026-01-16',
      time: '12:00:00',
      accountId,
      categoryId,
      paymentFrequency: PaymentFrequency.ONE_TIME,
      description: 'Auto Cleanup Test Updated',
      receipt: null,
      extraAdd: 0,
      extraMinus: 0,
    });

    expect(updateRes.status).toBe(StatusCodes.OK);

    // 3. Verify Extra is deleted
    const finalTx = await Transaction.findByPk(transactionId);
    expect(finalTx?.transactionExtraId).toBeNull();

    const extraRecord = await TransactionExtra.findByPk(extraId);
    expect(extraRecord).toBeNull();
  });
});
