import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import User from '@/models/user';
import AccountModel from '@/models/account';
import TransactionModel from '@/models/transaction';
import InstallmentPlanModel from '@/models/InstallmentPlan';
import CreditCardDetailModel from '@/models/CreditCardDetail';
import CategoryModel, { CategoryInstance } from '@/models/category';

// ... (skipping some lines or can I use smaller chunks?)
// I will use multiple chunks to be safe.

// Chunk 1: Add Import
import { StatusCodes } from 'http-status-codes';
import bcrypt from 'bcrypt';
import { Account, RootType, PaymentFrequency } from '@repo/shared';

import sequelize from '@/utils/postgres';

describe('Credit Card Feature Integration Test', () => {
  const agent = request.agent(app);
  const TEST_USER_EMAIL = `test_credit_card_${Date.now()}@example.com`;
  const TEST_USER_PASSWORD = 'password';
  let userId = '';
  let creditCardAccountId: string;
  let expenseRoot: CategoryInstance | null;

  beforeAll(async () => {
    console.log('Starting beforeAll');
    try {
      await sequelize.authenticate();
      console.log('DB Connection OK');
    } catch (e) {
      console.error('DB Connection Failed', e);
      throw e;
    }

    // Clean up before starting (just in case)
    try {
      await User.destroy({ where: { email: TEST_USER_EMAIL }, force: true });
      console.log('Cleaned up user (if existed)');
    } catch (e) {
      console.error('Initial cleanup failed', e);
    }

    const hashedPassword = await bcrypt.hash(TEST_USER_PASSWORD, 10);

    // Create User
    const user = await User.create({
      name: 'CCTestUser',
      email: TEST_USER_EMAIL,
      password: hashedPassword,
    } as any);
    userId = user.id;
    userId = user.id;
    const count = await User.count({ where: { id: userId } });

    // Login
    const loginRes = await agent.post('/api/login').send({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    });
  });

  afterAll(async () => {
    await User.destroy({ where: { email: TEST_USER_EMAIL }, force: true });
  });

  it('POST /api/account - Create Credit Card Account', async () => {
    const ccData = {
      name: 'Test Credit Card',
      type: Account.CREDIT_CARD,
      balance: 0,
      icon: 'credit-card',
      color: '#ff0000',
      creditCardDetail: {
        statementDate: 5,
        paymentDueDate: 25,
        creditLimit: 50000,
        includeInTotal: true,
      },
    };

    // Verify user exists
    // Verify user exists
    const userCount = await User.count({ where: { id: userId } });

    const res = await agent.post('/api/account').send(ccData);
    expect(res.status).toBe(StatusCodes.CREATED);
    expect(res.body.data.type).toBe(Account.CREDIT_CARD);

    creditCardAccountId = res.body.data.id;

    // Verify DB
    const detail = await CreditCardDetailModel.findOne({
      where: { accountId: creditCardAccountId },
    });
    expect(detail).toBeDefined();
    expect(Number(detail?.creditLimit)).toBe(50000);
  });

  it('POST /api/transaction - Create Installment Transaction', async () => {
    // Determine category ID (Need a valid category)
    // For test simplicity, assume seed data or create one?
    // Let's create a temp category.
    // Or just fetch one.
    // Since we destroy user, we probably need to create categories linked to user or use system categories.
    // Let's use system category (assuming seeds ran).
    // Or simpler: create a category for this user.
    // But Category model requires parent...
    // Let's query a system root category first.
    // Actually, `category.test.ts` shows we can find system roots.

    const categoryRes = await agent.get('/api/category');
    const expenseRoot = categoryRes.body.data.find(
      (c: any) => c.type === RootType.EXPENSE
    );
    // Find a leaf category
    // For now assuming existing structure.
    // If not, use category.test.ts logic to create one.
    // But since this is integration, DB might be empty if clean?
    // Let's try to mock or create if needed.

    // Create temp Main/Sub
    const createMainRes = await agent.post('/api/category').send({
      name: 'CC Test Cat',
      type: RootType.EXPENSE,
      parentId: expenseRoot?.id,
      icon: 'test',
      color: '#000',
    });

    if (createMainRes.status !== StatusCodes.CREATED) {
      console.error('Create Category Failed:', createMainRes.body);
    }
    const categoryId = createMainRes.body.data?.id;

    const installmentData = {
      accountId: creditCardAccountId,
      categoryId: categoryId,
      amount: 12000,
      type: RootType.EXPENSE,
      description: 'iPhone 15',
      date: '2025-01-01', // Fixed Date
      time: '12:00:00',
      receipt: null,
      paymentFrequency: PaymentFrequency.INSTALLMENT,
      installment: {
        totalInstallments: 12, // 1000 per month
        calculationMethod: 'ROUND',
        remainderPlacement: 'FIRST',
        gracePeriod: 0,
      },
    };

    const res = await agent.post('/api/transaction').send(installmentData);
    expect(res.status).toBe(StatusCodes.CREATED);

    // Verify Plan
    const tx = await TransactionModel.findOne({
      where: {
        description: { [require('sequelize').Op.like]: 'iPhone 15%' },
        userId,
      },
      include: [InstallmentPlanModel],
    });
    expect(tx).toBeDefined();
    expect(tx?.installmentPlanId).not.toBeNull();

    const plan = await InstallmentPlanModel.findByPk(tx!.installmentPlanId!);
    expect(plan?.totalAmount).toBe('12000.00000'); // Decimal string
    expect(plan?.totalInstallments).toBe(12);

    // Verify 12 Transactions created
    const count = await TransactionModel.count({
      where: { installmentPlanId: plan!.id },
    });
    expect(count).toBe(12);

    // Verify Balance: -12000?
    const account = await AccountModel.findByPk(creditCardAccountId);
    expect(Number(account?.balance)).toBe(-12000);
  });
});
