import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import User from '@/models/user';
import Account from '@/models/account';
import Category from '@/models/category';
import InstallmentPlan from '@/models/InstallmentPlan';
import Transaction from '@/models/transaction';
import sequelize from '@/utils/postgres';
import { RootType, PaymentFrequency, InterestType, CalculationMethod, RemainderPlacement, RewardsType } from '@repo/shared';
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

describe('Task 5.1: Installment Debt Deduction', () => {
  const agent = request.agent(app);
  const TEST_USER_EMAIL = `test_installment_debt_${Date.now()}@example.com`;
  const TEST_USER_PASSWORD = 'password';
  let userId = '';
  let accountId = '';
  let categoryId = '';

  beforeAll(async () => {
    await sequelize.authenticate();
    
    const hashedPassword = await bcrypt.hash(TEST_USER_PASSWORD, 10);
    const user = await User.create({
      name: 'DebtTestUser',
      email: TEST_USER_EMAIL,
      password: hashedPassword,
    } as any);
    userId = user.id;

    await agent.post('/api/login').send({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    });

    const account = await Account.create({
      userId,
      name: 'Test Account',
      type: '銀行',
      balance: 20000,
      icon: 'bank',
      color: '#000',
    } as any);
    accountId = account.id;

    const category = await Category.create({
      userId,
      name: 'Test Category',
      type: RootType.EXPENSE,
      icon: 'food',
      color: '#000',
    } as any);
    categoryId = category.id;
  });

  afterAll(async () => {
    await User.destroy({ where: { id: userId }, force: true });
  });

  it('should deduct "amount" from installment remaining debt', async () => {
    // Given: 已建立一個 InstallmentPlan (總額 $12000, 12 期, 每期 $1000)
    // 初始剩餘債務 = $12000
    const plan = await InstallmentPlan.create({
      userId,
      totalAmount: 12000,
      totalInstallments: 12,
      startDate: '2025-01-01',
      description: 'Debt Test Plan',
      interestType: InterestType.NONE,
      calculationMethod: CalculationMethod.ROUND,
      remainderPlacement: RemainderPlacement.FIRST,
      rewardsType: RewardsType.EVERY,
      // 假設欄位名稱為 remainingDebt (規格中提到應扣除此項)
      remainingDebt: 12000, 
    } as any);

    // When: POST /api/transaction 建立一筆分期交易 (amount = 1000)
    // 我們同時測試 extraAdd 抵銷的情況，因為規格提到 Net Amount = 0 時仍應扣除 amount
    const transactionData = {
      accountId,
      categoryId,
      amount: 1000,
      type: RootType.EXPENSE,
      description: 'Installment Payment #1',
      date: '2025-01-01',
      time: '12:00:00',
      paymentFrequency: PaymentFrequency.ONCE, // 這是計畫中的其中一筆交易
      installmentPlanId: plan.id,
      extraAdd: 1000, // 模擬全額折抵 (Net Amount = 0)
    };

    const res = await agent.post('/api/transaction').send(transactionData);
    
    // Then: 交易建立成功
    expect(res.status).toBe(StatusCodes.CREATED);

    // 斷言: InstallmentPlan 剩餘債務 = $11000 (扣除 amount 1000)
    const updatedPlan = await InstallmentPlan.findByPk(plan.id);
    expect(Number((updatedPlan as any).remainingDebt)).toBe(11000);
  });
});
