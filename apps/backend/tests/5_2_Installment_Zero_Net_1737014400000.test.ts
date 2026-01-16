import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';

// Mock email service to avoid Resend API key error
vi.mock('@/services/emailService', () => ({
  sendDailyReminderEmail: vi.fn(),
  sendWeeklySummaryEmail: vi.fn(),
  sendMonthlyAnalysisEmail: vi.fn(),
  sendWelcomeEmail: vi.fn(),
}));

// Mock azureBlob to avoid Invalid URL error
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
import sequelize from '@/utils/postgres';
import { RootType, PaymentFrequency, Account as AccountType } from '@repo/shared';
import { StatusCodes } from 'http-status-codes';
import bcrypt from 'bcrypt';

describe('Task 5.2: Installment Net Amount = 0 should still deduct debt', () => {
  const agent = request.agent(app);
  const TEST_USER_EMAIL = `test_installment_zero_${Date.now()}@example.com`;
  const TEST_USER_PASSWORD = 'password';
  let userId: string;
  let accountId: string;
  let categoryId: string;

  beforeAll(async () => {
    await sequelize.authenticate();
    
    // Create User
    const hashedPassword = await bcrypt.hash(TEST_USER_PASSWORD, 10);
    const user = await User.create({
      name: 'InstallmentTestUser',
      email: TEST_USER_EMAIL,
      password: hashedPassword,
    } as any);
    userId = user.id;

    // Login
    await agent.post('/api/login').send({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    });

    // Create Account (Credit Card)
    const account = await Account.create({
      userId,
      name: 'Test CC',
      type: AccountType.CREDIT_CARD,
      balance: 0,
      icon: 'credit-card',
      color: '#000',
    } as any);
    accountId = account.id;

    // Create Category
    const category = await Category.create({
      userId,
      name: 'Test Cat',
      type: RootType.EXPENSE,
      icon: 'test',
      color: '#000',
    } as any);
    categoryId = category.id;
  });

  afterAll(async () => {
    await User.destroy({ where: { id: userId }, force: true });
  });

  it("should deduct 'amount' from debt even when Net Amount is zero", async () => {
    // 1. Given: 建立一個 InstallmentPlan (總額 $12000, 12 期)
    // 初始剩餘債務 = $12000
    const plan = await InstallmentPlan.create({
      userId,
      totalAmount: 12000,
      totalInstallments: 12,
      startDate: '2026-01-01',
      description: 'Installment Test Plan',
      interestType: 'NONE',
      calculationMethod: 'ROUND',
      remainderPlacement: 'FIRST',
    } as any);

    // Verify initial state if remainingDebt exists (spec says it should be 12000)
    // Using any because field might not exist in TS model yet
    const planObj = plan as any;
    if (planObj.remainingDebt !== undefined) {
      expect(Number(planObj.remainingDebt)).toBe(12000);
    }

    // 2. When: POST /api/transaction 建立一筆分期交易
    // amount = 1000, extraAdd = 1000 (全額折抵，Net Amount = 0)
    const transactionData = {
      accountId,
      categoryId,
      amount: 1000,
      extraAdd: 1000, // 全額折抵
      type: RootType.EXPENSE,
      description: 'Installment payment with discount',
      date: '2026-01-16',
      time: '12:00:00',
      paymentFrequency: PaymentFrequency.INSTALLMENT,
      installmentPlanId: plan.id, // 連結到現有計畫
    };

    const res = await agent.post('/api/transaction').send(transactionData);

    // 3. Then:
    // 交易建立成功
    expect(res.status).toBe(StatusCodes.CREATED);

    // 帳戶餘額不變 (Net Amount = 0)
    const updatedAccount = await Account.findByPk(accountId);
    expect(Number(updatedAccount?.balance)).toBe(0);

    // InstallmentPlan 剩餘債務 = $11000 (仍扣除 amount 1000)
    const updatedPlan = await InstallmentPlan.findByPk(plan.id) as any;
    expect(Number(updatedPlan?.remainingDebt)).toBe(11000);
  });
});
