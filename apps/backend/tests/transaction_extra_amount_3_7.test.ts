import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import User from '@/models/user';
import Account from '@/models/account';
import Category from '@/models/category';
import { RootType, PaymentFrequency } from '@repo/shared';
import { StatusCodes } from 'http-status-codes';
import bcrypt from 'bcrypt';

describe('Transaction Transfer with Fee (Extra Amount)', () => {
  const agent = request.agent(app);

  let userId: string;
  let accountAId: string;
  let accountBId: string;
  let categoryId: string;

  const TEST_USER_EMAIL = 'transfer_fee_test@example.com';
  const TEST_USER_PASSWORD = 'password';

  beforeAll(async () => {
    // 1. Create User
    let user = await User.findOne({ where: { email: TEST_USER_EMAIL } });
    if (!user) {
      const hashedPassword = await bcrypt.hash(TEST_USER_PASSWORD, 10);
      user = await User.create({
        email: TEST_USER_EMAIL,
        password: hashedPassword,
        name: 'TransferFeeTestUser',
      } as any);
    }
    userId = user.id;

    // 2. Login
    await agent.post('/api/login').send({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    });

    // 3. Setup Account A (Source) - Balance 10000
    let accountA = await Account.create({
      userId: userId,
      name: 'Account A Fee',
      type: '銀行',
      balance: 10000,
      icon: 'bank',
      color: '#000000',
    } as any);
    accountAId = accountA.id;

    // 4. Setup Account B (Target) - Balance 5000
    let accountB = await Account.create({
      userId: userId,
      name: 'Account B Fee',
      type: '銀行',
      balance: 5000,
      icon: 'bank',
      color: '#000000',
    } as any);
    accountBId = accountB.id;

    // 5. Setup Category
    let category = await Category.create({
      userId: userId,
      name: 'Transfer Fee Category',
      type: RootType.EXPENSE,
      icon: 'transfer',
      color: '#000',
      parentId: null,
    } as any);
    categoryId = category.id;
  });

  it('should apply transfer fee: A pays Amount + Fee, B receives Amount', async () => {
    const transferAmount = 1000;
    const transferFee = 30; // extraMinus

    // 1. Perform Transfer
    const payload = {
      accountId: accountAId, // From
      targetAccountId: accountBId, // To
      amount: transferAmount,
      extraMinus: transferFee, // Fee
      date: new Date().toISOString().split('T')[0],
      time: '12:00',
      type: RootType.OPERATE, // 轉帳
      description: 'Transfer 1000 with 30 fee',
      categoryId: categoryId,
      receipt: null,
      paymentFrequency: PaymentFrequency.ONE_TIME,
    };

    const res = await agent.post('/api/transaction/transfer').send(payload);

    // 2. Verify Response
    expect(res.status).toBe(StatusCodes.CREATED);
    expect(res.body.isSuccess).toBe(true);

    const { fromTransaction, toTransaction } = res.body.data;
    
    // 3. Verify Balances
    const finalAccountA = await Account.findByPk(accountAId);
    const finalAccountB = await Account.findByPk(accountBId);
    
    const finalBalanceA = Number(finalAccountA?.balance);
    const finalBalanceB = Number(finalAccountB?.balance);

    // A balance = 10000 - (1000 + 30) = 8970
    expect(finalBalanceA).toBe(8970);
    
    // B balance = 5000 + 1000 = 6000
    expect(finalBalanceB).toBe(6000);

    // 4. Verify From Transaction (should have extraMinus)
    // Checking response structure. If backend supports it, it should return extraMinus or nested object.
    // Based on requirement: "斷言 From Transaction 有 extraMinus = 30"
    // We assume the API response structure will flatten it or include it.
    // If not, we might need to inspect nested `transactionExtra`.
    // Let's try to access it assuming it might be on the object or nested.
    
    // Adjust expectation based on how we expect the API to return it.
    // If we send `extraMinus`, we expect the created transaction object in response to reflect it.
    // Checking if `extraMinus` is present in the response object.
    // Note: If the backend logic isn't there, this will likely be undefined.
    
    // We try to handle potential different response structures (nested vs flat) if needed, 
    // but for TDD, we enforce the expectation.
    // Let's assume the API returns it as `extraMinus` or inside `transactionExtra`.
    
    const fromFee = fromTransaction.extraMinus ?? fromTransaction.transactionExtra?.extraMinus;
    expect(Number(fromFee)).toBe(transferFee);

    // 5. Verify To Transaction (should NOT have extraMinus)
    const toFee = toTransaction.extraMinus ?? toTransaction.transactionExtra?.extraMinus;
    expect(Number(toFee || 0)).toBe(0);
  });
});
