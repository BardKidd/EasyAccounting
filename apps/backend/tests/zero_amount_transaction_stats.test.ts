import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { StatusCodes } from 'http-status-codes';
import { RootType, PaymentFrequency, Account as AccountEnum } from '@repo/shared';
import User from '@/models/user';
import Account from '@/models/account';
import Category from '@/models/category';
import Transaction from '@/models/transaction';

describe('2.4 Zero Amount in Charts', () => {
  const agent = request.agent(app);
  let userId: string;
  let accountId: string;
  let categoryAId: string;
  let categoryBId: string;

  beforeAll(async () => {
    const userEmail = 'zero_stats@example.com';
    const userPassword = 'Password123!';

    // 1. Register & Login
    await agent.post('/api/user').send({
      name: 'Zero Stats User',
      email: userEmail,
      password: userPassword,
    });
    
    const user = await User.findOne({ where: { email: userEmail } });
    if (!user) throw new Error('User creation failed');
    userId = user.id;

    await agent.post('/api/login').send({
      email: userEmail,
      password: userPassword,
    });

    // Cleanup
    await Transaction.destroy({ where: { userId } });
    await Account.destroy({ where: { userId } });
    await Category.destroy({ where: { userId } });

    // 2. Create Account
    const accRes = await agent.post('/api/account').send({
      name: 'Test Bank',
      balance: 1000,
      type: AccountEnum.BANK,
      initialBalance: 1000,
      icon: 'bank',
      color: '#000',
    });
    accountId = accRes.body.data.id;

    // 3. Create Categories
    // Root
    const rootRes = await agent.post('/api/category').send({
      name: 'Expense Root',
      type: RootType.EXPENSE,
      color: '#000',
      icon: 'root',
    });
    const rootId = rootRes.body.data.id;

    // Main Category A
    const mainARes = await agent.post('/api/category').send({
      name: 'Category A',
      type: RootType.EXPENSE,
      color: '#A00',
      icon: 'A',
      parentId: rootId,
    });
    categoryAId = mainARes.body.data.id;

    // Main Category B
    const mainBRes = await agent.post('/api/category').send({
      name: 'Category B',
      type: RootType.EXPENSE,
      color: '#B00',
      icon: 'B',
      parentId: rootId,
    });
    categoryBId = mainBRes.body.data.id;
  });

  it('should include zero amount transaction in summary with 0% contribution', async () => {
    const today = new Date();
    const dateStr = today.toISOString();

    // Given:
    // 1. Create $100 transaction (Category A)
    const t1 = await agent.post('/api/transaction').send({
      amount: 100,
      type: RootType.EXPENSE,
      date: dateStr,
      accountId,
      categoryId: categoryAId,
      time: '10:00',
      paymentFrequency: PaymentFrequency.ONE_TIME,
      description: 'Expense A',
      receipt: null,
      mainCategory: categoryAId, // Simplify: Main serves as category here if no sub
    });
    expect(t1.status).toBe(StatusCodes.CREATED);

    // 2. Create $0 transaction (Category B)
    const t2 = await agent.post('/api/transaction').send({
      amount: 0,
      type: RootType.EXPENSE,
      date: dateStr,
      accountId,
      categoryId: categoryBId,
      time: '11:00',
      paymentFrequency: PaymentFrequency.ONE_TIME,
      description: 'Expense B Zero',
      receipt: null,
      mainCategory: categoryBId,
    });
    expect(t2.status).toBe(StatusCodes.CREATED);

    // When: POST /api/transaction/summary (and /api/statistics/category)
    // We check both as "summary" endpoint is time-based, but "Pie Chart" needs category data.
    
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString();

    // Check 1: Time-based Summary
    const summaryRes = await agent.post('/api/transaction/summary').send({
      startDate,
      endDate,
      groupBy: 'month'
    });
    expect(summaryRes.status).toBe(StatusCodes.OK);
    
    // Total expense should be 100
    expect(Number(summaryRes.body.data.summary.expense)).toBe(100);

    // Check 2: Category Statistics (Pie Chart Data)
    // This is where "Category B" should appear with 0 amount
    const catRes = await agent.post('/api/statistics/category').send({
      startDate,
      endDate
    });
    expect(catRes.status).toBe(StatusCodes.OK);
    
    const categories = catRes.body.data;
    
    // Find Category A
    const catA = categories.find((c: any) => c.name === 'Category A');
    expect(catA).toBeDefined();
    expect(Number(catA.amount)).toBe(100);

    // Find Category B (The 0 amount one)
    const catB = categories.find((c: any) => c.name === 'Category B');
    
    // Then: 0元交易的 category 出現在統計中，金額為 0
    expect(catB).toBeDefined();
    expect(Number(catB.amount)).toBe(0);
  });
});
