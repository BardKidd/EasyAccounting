import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { StatusCodes } from 'http-status-codes';
import { RootType, Account as AccountEnum, PaymentFrequency } from '@repo/shared';
import { User, Account, Category, Transaction, InstallmentPlan, CreditCardDetail, Announcement, PersonnelNotification } from '@/models';
import sequelize from '@/utils/postgres';

// Mock email service
vi.mock('@/services/emailService', () => {
  const mock = {
    sendDailyReminderEmail: vi.fn(),
    sendWeeklySummaryEmail: vi.fn(),
    sendMonthlyAnalysisEmail: vi.fn(),
    sendWelcomeEmail: vi.fn(),
  };
  return {
    ...mock,
    default: mock,
  };
});

// Mock azureBlob
vi.mock('@/utils/azureBlob', () => ({
  uploadFileToBlob: vi.fn(),
  generateSasUrl: vi.fn(),
  downloadBuffer: vi.fn(),
}));

describe('2.3 Zero Amount in Statistics Count', () => {
  const agent = request.agent(app);
  let userId: string;
  let accountId: string;
  let expenseCategoryId: string;
  let incomeCategoryId: string;
  const testDate = new Date().toISOString().split('T')[0]; // Today YYYY-MM-DD

  beforeAll(async () => {
     // Ensure schema exists
     await sequelize.query('CREATE SCHEMA IF NOT EXISTS accounting;');
     
     // Sync models individually in order to avoid dependency issues
     await User.sync({ force: true });
     await PersonnelNotification.sync({ force: true });
     await Account.sync({ force: true });
     await Category.sync({ force: true });
     await InstallmentPlan.sync({ force: true });
     await CreditCardDetail.sync({ force: true });
     await Transaction.sync({ force: true });

     const userEmail = `zero_stats_${Date.now()}@example.com`;
     const userPassword = 'Password123!';

     // Register & Login
     await agent.post('/api/user').send({
       name: 'Zero Stats User',
       email: userEmail,
       password: userPassword,
     });
     
     const loginRes = await agent.post('/api/login').send({
       email: userEmail,
       password: userPassword,
     });
     expect(loginRes.status).toBe(StatusCodes.OK);
     
     const user = await User.findOne({ where: { email: userEmail } });
     if (!user) throw new Error('User not found');
     userId = user.id;

     // Create Account
     const accRes = await agent.post('/api/account').send({
        name: 'Test Bank Zero',
        balance: 1000,
        type: AccountEnum.BANK,
        initialBalance: 1000,
        icon: 'bank',
        color: '#000',
     });
     expect(accRes.status).toBe(StatusCodes.CREATED);
     accountId = accRes.body.data.id;

     // Create Categories
     const expCatRes = await agent.post('/api/category').send({
       name: 'Zero Expense',
       type: RootType.EXPENSE,
       color: '#f00',
       icon: 'food',
     });
     expenseCategoryId = expCatRes.body.data.id;

     const incCatRes = await agent.post('/api/category').send({
        name: 'Zero Income',
        type: RootType.INCOME,
        color: '#0f0',
        icon: 'salary',
      });
      incomeCategoryId = incCatRes.body.data.id;
  });

  afterAll(async () => {
    // Cleanup
    if (userId) {
        await Transaction.destroy({ where: { userId } });
        await Account.destroy({ where: { userId } });
        await Category.destroy({ where: { userId } });
        await User.destroy({ where: { id: userId } });
    }
  });

  it('should include zero amount transactions in statistics count', async () => {
    // Given: Create 0 amount transactions
    // 1. Expense 0
    const expRes = await agent.post('/api/transaction').send({
        amount: 0,
        date: testDate,
        time: '12:00:00',
        description: 'Zero Expense',
        categoryId: expenseCategoryId,
        accountId: accountId,
        type: RootType.EXPENSE,
        paymentFrequency: PaymentFrequency.ONE_TIME,
        receipt: null,
    });
    // Check if creation is allowed. If schema blocks 0, this might fail (400).
    // The test requires "Given: Create 1 0 amount transaction", so we assume creation should succeed.
    expect(expRes.status).toBe(StatusCodes.CREATED);

    // 2. Income 0
    const incRes = await agent.post('/api/transaction').send({
        amount: 0,
        date: testDate,
        time: '12:00:00',
        description: 'Zero Income',
        categoryId: incomeCategoryId,
        accountId: accountId,
        type: RootType.INCOME,
        paymentFrequency: PaymentFrequency.ONE_TIME,
        receipt: null,
    });
    expect(incRes.status).toBe(StatusCodes.CREATED);

    // When: GET /api/transaction/date
    const response = await agent.get('/api/transaction/date')
        .query({
            startDate: testDate,
            endDate: testDate,
        });

    expect(response.status).toBe(StatusCodes.OK);
    
    // Then: Check items
    const transactions = response.body.data.items;
    const pagination = response.body.data.pagination;
    
    // Debug info
    // console.log('Response body items:', transactions);

    const zeroTransactions = transactions.filter((t: any) => Number(t.amount) === 0);
    
    // Should have exactly 2 transactions if DB was empty
    expect(transactions.length).toBe(2);
    expect(pagination.total).toBe(2);
    
    expect(zeroTransactions.length).toBe(2);
    
    const expenseZero = zeroTransactions.find((t: any) => t.description === 'Zero Expense');
    const incomeZero = zeroTransactions.find((t: any) => t.description === 'Zero Income');
    
    expect(expenseZero).toBeDefined();
    expect(incomeZero).toBeDefined();
  });
});
