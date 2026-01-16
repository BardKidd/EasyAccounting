import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import User from '@/models/user';
import Account from '@/models/account';
import Category from '@/models/category';
import Transaction from '@/models/transaction';
import sequelize from '@/utils/postgres';
import { RootType } from '@repo/shared';
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

describe('Task 4.2: Income Positive Input', () => {
  const agent = request.agent(app);
  let accountId = '';
  let categoryId = '';

  const TEST_USER_EMAIL = 'income_pos_test@example.com';
  const TEST_USER_PASSWORD = 'password';

  beforeAll(async () => {
    await sequelize.query('CREATE SCHEMA IF NOT EXISTS accounting;');
    await sequelize.sync({ force: true });

    const hashedPassword = await bcrypt.hash(TEST_USER_PASSWORD, 10);
    const user = await User.create({
      email: TEST_USER_EMAIL,
      password: hashedPassword,
      name: 'IncomePosUser',
    } as any);

    await agent.post('/api/login').send({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    });

    const account = await Account.create({
      userId: user.id,
      name: 'Test Account',
      type: '銀行',
      balance: 1000,
      icon: 'bank',
      color: '#000000',
    } as any);
    accountId = account.id;

    const category = await Category.create({
      userId: user.id,
      name: 'Salary',
      type: RootType.INCOME,
      icon: 'money',
      color: '#00FF00',
      parentId: null,
    } as any);
    categoryId = category.id;
  });

  it('should store positive income amount as is', async () => {
    const payload = {
      type: RootType.INCOME,
      amount: 500,
      accountId,
      categoryId,
      date: new Date().toISOString(),
      note: 'Positive income test',
    };

    const res = await agent.post('/api/transaction').send(payload);

    expect(res.status).toBe(StatusCodes.CREATED);
    
    const transaction = await Transaction.findOne({
      where: { id: res.body.id }
    });

    expect(transaction).toBeDefined();
    // 斷言 amount 為正數 500
    expect(Number(transaction?.amount)).toBe(500);
    // 斷言 type 為 INCOME
    expect(transaction?.type).toBe(RootType.INCOME);
  });
});
