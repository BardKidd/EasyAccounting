import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app'; // Fix import
import { StatusCodes } from 'http-status-codes';
import {
  RootType,
  Account as AccountEnum,
  PaymentFrequency,
} from '@repo/shared';
// Remove missing testHelper
import User from '@/models/user';
import Account from '@/models/account';
import Category from '@/models/category';
import Transaction from '@/models/transaction';

describe('Statistics API Integration Test', () => {
  const agent = request.agent(app); // Use agent
  let userId: string;
  let accountId: string;
  let mainCatId: string;
  let subCatId: string;

  beforeAll(async () => {
    const userEmail = 'stats@example.com';
    const userPassword = 'Password123!';

    // 1. Register
    let user = await User.findOne({ where: { email: userEmail } });
    if (!user) {
      await agent.post('/api/user').send({
        name: 'Stats User',
        email: userEmail,
        password: userPassword,
      });
      user = await User.findOne({ where: { email: userEmail } });
    }

    if (!user) throw new Error('Failed to create or find test user');
    userId = user.id;

    // Login (agent saves cookies)
    const loginRes = await agent.post('/api/login').send({
      email: userEmail,
      password: userPassword,
    });

    // 2. Create Account
    // Cleanup first
    await Transaction.destroy({ where: { userId } });
    await Account.destroy({ where: { userId } });
    await Category.destroy({ where: { userId } });

    const accRes = await agent.post('/api/account').send({
      name: 'Test Bank',
      balance: 100000,
      type: AccountEnum.BANK,
      initialBalance: 100000,
      icon: 'bank',
      color: '#000',
    });
    expect(accRes.status).toBe(201);
    accountId = accRes.body.data.id;

    // 3. Create Categories (Root -> Main -> Sub)
    // Root Category (Level 1)
    await agent.post('/api/category').send({
      name: 'Expense Root',
      type: RootType.EXPENSE,
      color: '#000',
      icon: 'root',
    });
    const rootCategory = await Category.findOne({
      where: { userId, name: 'Expense Root' },
    });
    if (!rootCategory) throw new Error('Root Category creation failed');

    // Main Category (Level 2) - Parent is Root
    await agent.post('/api/category').send({
      name: 'Food',
      type: RootType.EXPENSE,
      color: '#000',
      icon: 'food',
      parentId: rootCategory.id,
    });
    const foodCategory = await Category.findOne({
      where: { userId, name: 'Food' },
    });
    if (!foodCategory) throw new Error('Food Category creation failed');
    mainCatId = foodCategory.id;

    // Sub Category (Level 3) - Parent is Main
    await agent.post('/api/category').send({
      name: 'Lunch',
      type: RootType.EXPENSE,
      color: '#000',
      icon: 'lunch',
      parentId: foodCategory.id,
    });
    const lunchCategory = await Category.findOne({
      where: { userId, name: 'Lunch' },
    });
    if (!lunchCategory) throw new Error('Lunch Category creation failed');
    subCatId = lunchCategory.id;

    // 4. Seed Transactions
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 15);
    const twoMonthsAgo = new Date(
      today.getFullYear(),
      today.getMonth() - 2,
      15
    );

    // Month -2: Expense -5000
    const t1 = await agent.post('/api/transaction').send({
      amount: 5000,
      type: RootType.EXPENSE,
      date: twoMonthsAgo.toISOString(),
      accountId,
      categoryId: subCatId,
      time: '12:00',
      paymentFrequency: PaymentFrequency.ONE_TIME,
      description: 'M-2 Expense',
      receipt: null,
      mainCategory: mainCatId,
    });
    expect(t1.status).toBe(201);

    // Month -1: Income +10000
    // Create Income Root
    await agent.post('/api/category').send({
      name: 'Income Root',
      type: RootType.INCOME,
      icon: 'root',
      color: '#000',
    });
    const incomeRoot = await Category.findOne({
      where: { userId, name: 'Income Root' },
    });
    if (!incomeRoot) throw new Error('Income Root creation failed');

    // Create Salary (Main) -> Parent: Income Root
    await agent.post('/api/category').send({
      name: 'Salary',
      type: RootType.INCOME,
      icon: 'money',
      color: '#000',
      parentId: incomeRoot.id,
    });
    const incomeMain = await Category.findOne({
      where: { userId, name: 'Salary' },
    });
    if (!incomeMain) throw new Error('Failed to create income main category');

    // Create Monthly (Sub) -> Parent: Salary
    await agent.post('/api/category').send({
      name: 'Monthly',
      type: RootType.INCOME,
      parentId: incomeMain.id,
      icon: 'money',
      color: '#000',
    });
    const incomeSub = await Category.findOne({
      where: { userId, name: 'Monthly' },
    });
    if (!incomeSub) throw new Error('Failed to create income sub category');

    const t2 = await agent.post('/api/transaction').send({
      amount: 10000,
      type: RootType.INCOME,
      date: lastMonth.toISOString(),
      accountId,
      categoryId: incomeSub.id,
      time: '09:00',
      paymentFrequency: PaymentFrequency.ONE_TIME,
      description: 'M-1 Income',
      receipt: null,
      mainCategory: incomeMain.id,
    });
    expect(t2.status).toBe(201);

    // Current Month: Expense -2000
    const t3 = await agent.post('/api/transaction').send({
      amount: 2000,
      type: RootType.EXPENSE,
      date: today.toISOString(),
      accountId,
      categoryId: subCatId,
      time: '18:00',
      paymentFrequency: PaymentFrequency.ONE_TIME,
      description: 'M-0 Expense',
      receipt: null,
      mainCategory: mainCatId,
    });
    expect(t3.status).toBe(201);
  });

  afterAll(async () => {
    // Clean up logic if needed
  });

  describe('GET /api/statistics/asset-trend', () => {
    it('should return correct asset trend with backward calculation', async () => {
      const res = await agent.get('/api/statistics/asset-trend');

      expect(res.status).toBe(StatusCodes.OK);
      expect(res.body.isSuccess).toBe(true);

      const data = res.body.data;
      expect(Array.isArray(data)).toBe(true);

      const today = new Date();
      const currentMonthStr = (today.getMonth() + 1).toString();
      const currentYearStr = today.getFullYear().toString();

      // Find Current Month Record
      const currentRecord = data.find(
        (d: any) => d.year === currentYearStr && d.month === currentMonthStr
      );
      expect(currentRecord).toBeDefined();
      expect(Number(currentRecord.balance)).toBe(103000);
      expect(Number(currentRecord.netFlow)).toBe(-2000);

      // Find Previous Month Record
      const lastMonthDate = new Date(
        today.getFullYear(),
        today.getMonth() - 1,
        1
      );
      const lastMonthStr = (lastMonthDate.getMonth() + 1).toString();
      const lastMonthYearStr = lastMonthDate.getFullYear().toString();

      const lastRecord = data.find(
        (d: any) => d.year === lastMonthYearStr && d.month === lastMonthStr
      );
      expect(lastRecord).toBeDefined();
      expect(Number(lastRecord.balance)).toBe(105000);
      expect(Number(lastRecord.netFlow)).toBe(10000);

      // Find Two Months Ago Record
      const twoMonthsAgoDate = new Date(
        today.getFullYear(),
        today.getMonth() - 2,
        1
      );
      const twoMonthsAgoStr = (twoMonthsAgoDate.getMonth() + 1).toString();
      const twoMonthsAgoYearStr = twoMonthsAgoDate.getFullYear().toString();

      const twoAgoRecord = data.find(
        (d: any) =>
          d.year === twoMonthsAgoYearStr && d.month === twoMonthsAgoStr
      );
      // Depending on when the test runs (e.g. if today is 1st of month), timezones/dates might vary slightly.
      // But our logic uses specific dates (15th of month), so it should be safe.

      // Only check if it exists (it might not if MIN(date) logic skips it?)
      // We asserted t1 creation was 201, so it should exist.
      expect(twoAgoRecord).toBeDefined();
      expect(Number(twoAgoRecord.balance)).toBe(95000);
      expect(Number(twoAgoRecord.netFlow)).toBe(-5000);
    });
  });

  describe('Overview Tab Data', () => {
    it('should return correct overview trend summary', async () => {
      // Range: Full year or specific month range covering our seeded data (Nov, Dec, Jan)
      // Seeded:
      // M-2 (Nov): Exp 5000
      // M-1 (Dec): Inc 10000
      // M-0 (Jan): Exp 2000
      // Total: Inc 10000, Exp 7000

      const today = new Date();
      const startDate = new Date(
        today.getFullYear(),
        today.getMonth() - 5,
        1
      ).toISOString();
      const endDate = new Date().toISOString();

      const res = await agent.post('/api/statistics/overview/trend').send({
        startDate,
        endDate,
      });

      expect(res.status).toBe(StatusCodes.OK);
      expect(Number(res.body.data.income)).toBe(10000);
      expect(Number(res.body.data.expense)).toBe(7000); // 5000 + 2000
      // Transfer In/Out checks if we implemented transfer logic in overview
      // Currently our seeded transactions are pure Income/Expense types, not Transfers with linkId.
      // So transferIn/Out should be 0.
      expect(Number(res.body.data.transferIn)).toBe(0);
      expect(Number(res.body.data.transferOut)).toBe(0);
      expect(Number(res.body.data.balance)).toBe(3000); // 10000 - 7000
    });

    it('should return correct top 3 categories', async () => {
      const today = new Date();
      const startDate = new Date(
        today.getFullYear(),
        today.getMonth() - 5,
        1
      ).toISOString();
      const endDate = new Date().toISOString();

      const res = await agent
        .post('/api/statistics/overview/top3Categories')
        .send({
          startDate,
          endDate,
        });

      expect(res.status).toBe(StatusCodes.OK);
      expect(Array.isArray(res.body.data)).toBe(true);
      // We have 2 Expense Categories used:
      // 1. Lunch (Sub of Food) -> Amount 5000 (M-2) + 2000 (M-0) = 7000?
      // Wait, M-2 use SubCatId. M-0 use SubCatId.
      // Logic for Top3Categories handles Parent vs Sub?
      // Based on `statisticsServices.ts` logic:
      // It sorts by amount DESC.
      // It aggregates by Parent if exists, else self.
      // Our 'Lunch' (Sub) has Parent 'Food'.
      // So it should show 'Food' with amount 7000.

      const top1 = res.body.data[0];
      expect(top1.category.name).toBe('Food');
      expect(Number(top1.amount)).toBe(7000);
    });

    it('should return correct top 3 expenses', async () => {
      const today = new Date();
      const startDate = new Date(
        today.getFullYear(),
        today.getMonth() - 5,
        1
      ).toISOString();
      const endDate = new Date().toISOString();

      const res = await agent
        .post('/api/statistics/overview/top3Expenses')
        .send({
          startDate,
          endDate,
        });

      expect(res.status).toBe(StatusCodes.OK);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);

      // Expenses:
      // 1. M-2 Expense: 5000
      // 2. M-0 Expense: 2000
      // Sorted DESC
      expect(Number(res.body.data[0].amount)).toBe(5000);
      expect(res.body.data[0].description).toBe('M-2 Expense');

      expect(Number(res.body.data[1].amount)).toBe(2000);
      expect(res.body.data[1].description).toBe('M-0 Expense');
    });
  });

  describe('Detail Tab Data', () => {
    it('should return detailed list sorted by date DESC', async () => {
      const today = new Date();
      const startDate = new Date(
        today.getFullYear(),
        today.getMonth() - 5,
        1
      ).toISOString();
      const endDate = new Date().toISOString();

      const res = await agent.post('/api/statistics/detail').send({
        startDate,
        endDate,
      });

      expect(res.status).toBe(StatusCodes.OK);
      const items = res.body.data;
      expect(items.length).toBeGreaterThanOrEqual(3);

      // Order should be M-0 (Newest), M-1, M-2 (Oldest)
      // M-0 date is Today.
      // M-1 is Last Month.
      // M-2 is 2 Months Ago.

      const first = items[0];
      const second = items[1];
      const third = items[2];

      expect(new Date(first.date).getTime()).toBeGreaterThanOrEqual(
        new Date(second.date).getTime()
      );
      expect(new Date(second.date).getTime()).toBeGreaterThanOrEqual(
        new Date(third.date).getTime()
      );
    });
  });

  describe('Category Tab Data', () => {
    it('should return category aggregation correctly', async () => {
      const today = new Date();
      const startDate = new Date(
        today.getFullYear(),
        today.getMonth() - 5,
        1
      ).toISOString();
      const endDate = new Date().toISOString();

      const res = await agent.post('/api/statistics/category').send({
        startDate,
        endDate,
      });

      expect(res.status).toBe(StatusCodes.OK);
      // We fixed COALESCE logic, so it should aggregate by MainCategory
      // Expense: Food (5000+2000=7000)
      // Income: Salary (10000)

      const food = res.body.data.find(
        (d: any) => d.name === 'Food' && d.type === RootType.EXPENSE
      );
      expect(food).toBeDefined();
      expect(Number(food.amount)).toBe(7000);

      const salary = res.body.data.find(
        (d: any) => d.name === 'Salary' && d.type === RootType.INCOME
      );
      expect(salary).toBeDefined();
      expect(Number(salary.amount)).toBe(10000);
    });
  });

  describe('Ranking Tab Data', () => {
    it('should return ranking list', async () => {
      const today = new Date();
      const startDate = new Date(
        today.getFullYear(),
        today.getMonth() - 5,
        1
      ).toISOString();
      const endDate = new Date().toISOString();

      const res = await agent.post('/api/statistics/ranking').send({
        startDate,
        endDate,
      });

      expect(res.status).toBe(StatusCodes.OK);
      expect(Array.isArray(res.body.data)).toBe(true);
      // Ranking is list of transactions sorted by Amount DESC
      // 1. Income 10000
      // 2. Expense 5000
      // 3. Expense 2000

      expect(Number(res.body.data[0].amount)).toBe(10000);
      expect(Number(res.body.data[1].amount)).toBe(5000);
      expect(Number(res.body.data[2].amount)).toBe(2000);
    });
  });

  describe('Account Tab Data', () => {
    it('should return account aggregation', async () => {
      const today = new Date();
      const startDate = new Date(
        today.getFullYear(),
        today.getMonth() - 5,
        1
      ).toISOString();
      const endDate = new Date().toISOString();

      const res = await agent.post('/api/statistics/account').send({
        startDate,
        endDate,
      });

      expect(res.status).toBe(StatusCodes.OK);
      // All transactions are in "Test Bank"
      // Income: 10000
      // Expense: 7000 (5000+2000)

      const bankIncome = res.body.data.find(
        (d: any) => d.name === 'Test Bank' && d.type === RootType.INCOME
      );
      expect(bankIncome).toBeDefined();
      expect(Number(bankIncome.amount)).toBe(10000);

      const bankExpense = res.body.data.find(
        (d: any) => d.name === 'Test Bank' && d.type === RootType.EXPENSE
      );
      expect(bankExpense).toBeDefined();
      expect(Number(bankExpense.amount)).toBe(7000);
    });
  });
});
