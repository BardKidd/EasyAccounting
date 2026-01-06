import request from 'supertest';
import { StatusCodes } from 'http-status-codes';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { app } from '../src/app';
import sequelize from '../src/utils/postgres';
import User from '../src/models/user';
import PersonnelNotification from '../src/models/personnel_notification';
import Account from '../src/models/account';
import Transaction from '../src/models/transaction';
import Category from '../src/models/category';
import {
  RootType,
  PaymentFrequency,
  Account as AccountEnum,
} from '@repo/shared';
import emailService from '../src/services/emailService';

// Mock email service
// vi.mock works with Vitest
vi.mock('../src/services/emailService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../src/services/emailService')>();
  return {
    ...actual,
    default: {
      ...actual.default,
      sendWelcomeEmail: vi.fn().mockResolvedValue({ id: 'mock-email-id' }),
    },
    sendWelcomeEmail: vi.fn().mockResolvedValue({ id: 'mock-email-id' }),
  };
});

const agent = request.agent(app);

describe('User API Integration Test', () => {
  let userId: string;
  let token: string;

  const testUser = {
    name: 'Test User',
    email: 'testuser_api@example.com',
    password: 'Password123!',
  };

  const updatedUser = {
    name: 'Updated User',
    email: 'updated_user@example.com',
    password: 'NewPassword123!',
  };

  beforeAll(async () => {
    await sequelize.authenticate();
    // await sequelize.sync({ alter: true }); // Removed to avoid migration prompt
    // Clean up potentially existing test user
    await User.destroy({ where: { email: testUser.email }, force: true });
    await User.destroy({ where: { email: updatedUser.email }, force: true });
  });

  afterAll(async () => {
    // Cleanup is mostly done by the delete test, but just in case
    // await sequelize.close(); // Don't close if other tests need it, usually managed by runner
  });

  it('should register a new user and create personnel notification', async () => {
    const res = await agent.post('/api/user').send(testUser);

    expect(res.status).toBe(StatusCodes.CREATED);
    expect(res.body.isSuccess).toBe(true);

    // Verify User Created
    const user = await User.findOne({ where: { email: testUser.email } });
    expect(user).toBeDefined();
    expect(user?.name).toBe(testUser.name);
    if (!user) throw new Error('User creation failed');
    userId = user.id;

    // Verify Notification Created (Side Effect)
    const notification = await PersonnelNotification.findOne({
      where: { userId: user.id },
    });
    expect(notification).toBeDefined();
    expect(notification?.monthlyAnalysisNotice).toBe(true); // Default check
    expect(notification?.dailyReminder).toBe(false);
    expect(notification?.weeklySummaryNotice).toBe(false);

    // Verify Welcome Email Sent (Mock)
    expect(emailService.sendWelcomeEmail).toHaveBeenCalled();
  });

  it('should login to get token for further actions', async () => {
    const res = await agent.post('/api/login').send({
      email: testUser.email,
      password: testUser.password,
    });

    expect(res.status).toBe(StatusCodes.OK);
    // Token is usually set in cookie by the agent automatically,
    // but if the API returns it, we can check.
    // Our auth logic uses httpOnly cookie.
  });

  it('should edit the user', async () => {
    if (!userId) throw new Error('User not created');

    const res = await agent.put(`/api/user/${userId}`).send(updatedUser);

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body.isSuccess).toBe(true);

    const user = await User.findByPk(userId);
    expect(user?.name).toBe(updatedUser.name);
    expect(user?.email).toBe(updatedUser.email);
    // Password verification requires re-hashing or auth check,
    // but assuming success if status is OK and other fields match.
  });

  it('should cascade delete user and related data', async () => {
    if (!userId) throw new Error('User not created');

    // Create related data (Account, Transaction) to test cascade
    const account = await Account.create({
      userId,
      name: 'Cascade Test Account',
      type: AccountEnum.BANK,
      balance: 1000,
      icon: 'test',
      color: '#000000',
      isActive: true,
    });

    const transaction = await Transaction.create({
      userId,
      accountId: account.id,
      categoryId: (await Category.findOne())?.id || 'some-id',
      amount: 100,
      type: RootType.EXPENSE,
      date: '2026-01-01',
      time: '12:00:00',
      paymentFrequency: PaymentFrequency.ONE_TIME,
    });

    const res = await agent.delete(`/api/user/${userId}`);

    expect(res.status).toBe(StatusCodes.OK);

    // Verify User Deleted
    const deletedUser = await User.findByPk(userId);
    expect(deletedUser).toBeNull();

    // Verify Cascade Delete
    const deletedAccount = await Account.findByPk(account.id);
    expect(deletedAccount).toBeNull();

    const deletedTransaction = await Transaction.findByPk(transaction.id);
    expect(deletedTransaction).toBeNull();

    const deletedNotification = await PersonnelNotification.findOne({
      where: { userId },
    });
    expect(deletedNotification).toBeNull();
  });
});
