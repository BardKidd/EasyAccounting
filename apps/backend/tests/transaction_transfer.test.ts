import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import User from '@/models/user';
import Account from '@/models/account';
import Category from '@/models/category';
import Transaction from '@/models/transaction';
import { RootType, PaymentFrequency } from '@repo/shared';
import { StatusCodes } from 'http-status-codes';
import bcrypt from 'bcrypt';

describe('Transaction Transfer Integration Test', () => {
  const agent = request.agent(app);

  let userId: string;
  let accountAId: string;
  let accountBId: string;
  let categoryId: string;

  const TEST_USER_EMAIL = 'transfer_test@example.com';
  const TEST_USER_PASSWORD = 'password';

  beforeAll(async () => {
    // 1. Create User
    let user = await User.findOne({ where: { email: TEST_USER_EMAIL } });
    if (!user) {
      const hashedPassword = await bcrypt.hash(TEST_USER_PASSWORD, 10);
      user = await User.create({
        email: TEST_USER_EMAIL,
        password: hashedPassword,
        name: 'TransferTestUser',
      } as any);
    }
    userId = user.id;

    // 2. Login
    await agent.post('/api/login').send({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    });

    // 3. Setup Account A (Source)
    let accountA = await Account.create({
      userId: userId,
      name: 'Account A',
      type: '銀行',
      balance: 1000,
      icon: 'bank',
      color: '#000000',
    } as any);
    accountAId = accountA.id;

    // 4. Setup Account B (Target)
    let accountB = await Account.create({
      userId: userId,
      name: 'Account B',
      type: '銀行',
      balance: 500,
      icon: 'bank',
      color: '#000000',
    } as any);
    accountBId = accountB.id;

    // 5. Setup Category
    let category = await Category.create({
      userId: userId,
      name: 'Transfer Category',
      type: RootType.EXPENSE,
      icon: 'transfer',
      color: '#000',
      parentId: null,
    } as any);
    categoryId = category.id;
  });

  it('1.1 Positive: Transfer successfully creates two transactions and updates balances correctly', async () => {
    const transferAmount = 100;

    // 1. Get initial balances from DB to be sure
    const initialAccountA = await Account.findByPk(accountAId);
    const initialAccountB = await Account.findByPk(accountBId);
    const initialBalanceA = Number(initialAccountA?.balance);
    const initialBalanceB = Number(initialAccountB?.balance);

    // 2. Perform Transfer
    const payload = {
      accountId: accountAId, // From
      targetAccountId: accountBId, // To
      amount: transferAmount,
      date: new Date().toISOString().split('T')[0],
      time: '12:00',
      type: RootType.OPERATE, // 轉帳
      description: 'Transfer 100 from A to B',
      categoryId: categoryId,
      receipt: null,
      paymentFrequency: PaymentFrequency.ONE_TIME,
    };

    const res = await agent.post('/api/transaction/transfer').send(payload);

    // 3. Verify Response
    expect(res.status).toBe(StatusCodes.CREATED);
    expect(res.body.isSuccess).toBe(true);

    const { fromTransaction, toTransaction } = res.body.data;
    
    // Verify Transactions structure
    expect(fromTransaction.accountId).toBe(accountAId);
    expect(fromTransaction.targetAccountId).toBe(accountBId);
    expect(fromTransaction.type).toBe(RootType.EXPENSE);
    expect(Number(fromTransaction.amount)).toBe(transferAmount);

    expect(toTransaction.accountId).toBe(accountBId);
    expect(toTransaction.targetAccountId).toBe(accountAId);
    expect(toTransaction.type).toBe(RootType.INCOME);
    expect(Number(toTransaction.amount)).toBe(transferAmount);

    // Verify Linking
    expect(fromTransaction.linkId).toBe(toTransaction.id);
    expect(toTransaction.linkId).toBe(fromTransaction.id);

    // 4. Verify Balances Updated Correctly
    const finalAccountA = await Account.findByPk(accountAId);
    const finalAccountB = await Account.findByPk(accountBId);

    const finalBalanceA = Number(finalAccountA?.balance);
    const finalBalanceB = Number(finalAccountB?.balance);

    expect(finalBalanceA).toBe(initialBalanceA - transferAmount);
    expect(finalBalanceB).toBe(initialBalanceB + transferAmount);
  });
});
