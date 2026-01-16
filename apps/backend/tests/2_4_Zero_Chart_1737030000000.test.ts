import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import User from '@/models/user';
import Account from '@/models/account';
import Category from '@/models/category';
import Transaction from '@/models/transaction';
import InstallmentPlan from '@/models/InstallmentPlan';
import CreditCardDetail from '@/models/CreditCardDetail';
import PersonnelNotification from '@/models/personnel_notification';
import sequelize from '@/utils/postgres';
import { RootType, PaymentFrequency, PeriodType } from '@repo/shared';
import { StatusCodes } from 'http-status-codes';
import bcrypt from 'bcrypt';

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

describe('2.4 Zero Amount Transaction in Chart Verification', () => {
  const agent = request.agent(app);
  let userId: string;
  let accountId: string;
  let categoryAId: string;
  let categoryBId: string;

  const TEST_USER_EMAIL = 'zero_chart_test@example.com';
  const TEST_USER_PASSWORD = 'Password123!';

  beforeAll(async () => {
    // Ensure clean state and avoid sync issues
    await sequelize.query('DROP SCHEMA IF EXISTS accounting CASCADE');
    await sequelize.query('CREATE SCHEMA accounting');
    
    // Sync models in order to handle dependencies manually
    await User.sync({ force: true });
    await Account.sync({ force: true });
    await Category.sync({ force: true });
    await InstallmentPlan.sync({ force: true });
    await Transaction.sync({ force: true });
    // Sync remaining models
    await CreditCardDetail.sync({ force: true });
    await PersonnelNotification.sync({ force: true });

    // Ensure user exists and login
    let user = await User.findOne({ where: { email: TEST_USER_EMAIL } });
    if (!user) {
      const hashedPassword = await bcrypt.hash(TEST_USER_PASSWORD, 10);
      user = await User.create({
        email: TEST_USER_EMAIL,
        password: hashedPassword,
        name: 'ZeroChartUser',
      } as any);
    }
    userId = user.id;

    await agent.post('/api/login').send({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    });

    // Create Account
    const account = await Account.create({
      userId,
      name: 'Test Account',
      type: '銀行',
      balance: 1000,
      icon: 'bank',
      color: '#000000',
    } as any);
    accountId = account.id;

    // Create Root Category
    const rootCategory = await Category.create({
      userId,
      name: 'Expense Root',
      type: RootType.EXPENSE,
      icon: 'root',
      color: '#000',
    } as any);

    // Create Category A (for $100)
    const catA = await Category.create({
      userId,
      name: 'Category A',
      type: RootType.EXPENSE,
      icon: 'a',
      color: '#ff0000',
      parentId: rootCategory.id,
    } as any);
    categoryAId = catA.id;

    // Create Category B (for $0)
    const catB = await Category.create({
      userId,
      name: 'Category B',
      type: RootType.EXPENSE,
      icon: 'b',
      color: '#00ff00',
      parentId: rootCategory.id,
    } as any);
    categoryBId = catB.id;
  });

  it('should include zero amount transaction in summary/trends', async () => {
    const today = new Date().toISOString().split('T')[0];

    // 1. Create $100 expense in Category A
    const resA = await agent.post('/api/transaction').send({
      accountId,
      categoryId: categoryAId,
      amount: 100,
      date: today,
      time: '12:00',
      type: RootType.EXPENSE,
      paymentFrequency: PaymentFrequency.ONE_TIME,
      description: 'Normal Expense',
      mainCategory: categoryAId,
      receipt: null,
    });
    expect(resA.status).toBe(StatusCodes.CREATED);

    // 2. Create $0 expense in Category B
    const resB = await agent.post('/api/transaction').send({
      accountId,
      categoryId: categoryBId,
      amount: 0,
      date: today,
      time: '13:00',
      type: RootType.EXPENSE,
      paymentFrequency: PaymentFrequency.ONE_TIME,
      description: 'Zero Expense',
      mainCategory: categoryBId,
      receipt: null,
    });
    
    expect(resB.status).toBe(StatusCodes.CREATED);

    // 3. Get Summary via POST /api/transaction/summary
    const summaryRes = await agent.post('/api/transaction/summary').send({
      startDate: today,
      endDate: today,
      groupBy: PeriodType.DAY,
    });

    expect(summaryRes.status).toBe(StatusCodes.OK);
    expect(summaryRes.body.isSuccess).toBe(true);

    const { summary, trends, categories } = summaryRes.body.data;

    // Verify totals: $100 + $0 = $100
    expect(Number(summary.expense)).toBe(100);

    // Verify Trends inclusion
    const monthStr = today.substring(0, 7); // yyyy-MM
    const trendRecord = trends.find((t: any) => t.date === today || t.date === monthStr);
    expect(trendRecord).toBeDefined();

    // 4. Verify Category Statistics (Pie Chart Data) inclusion in the summary response
    // As per transaction_spec: "在計算圓餅圖時，必須包含 0 元交易"
    // We expect a 'categories' field in the response containing the breakdown.
    expect(categories).toBeDefined();
    const catBStat = categories.find((s: any) => s.name === 'Category B');
    expect(catBStat).toBeDefined();
    expect(Number(catBStat.amount)).toBe(0);
    expect(Number(catBStat.count)).toBe(1);
    
    // Also verify Category A for comparison
    const catAStat = categories.find((s: any) => s.name === 'Category A');
    expect(catAStat).toBeDefined();
    expect(Number(catAStat.amount)).toBe(100);
  });
});
