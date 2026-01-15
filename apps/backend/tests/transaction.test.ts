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

describe('Transaction API Integration Test', () => {
  // supertest 的 agent 會模擬真實瀏覽器的行為
  // 所以下面登入後就會模擬真實情況拿到 cookie
  const agent = request.agent(app);

  let accountId = '';
  let account2Id = '';
  let categoryId = '';

  const TEST_USER_EMAIL = 'test_transaction@example.com';
  const TEST_USER_PASSWORD = 'password';

  beforeAll(async () => {
    // 1. Ensure User Exists & Login
    let user = await User.findOne({ where: { email: TEST_USER_EMAIL } });
    if (!user) {
      const hashedPassword = await bcrypt.hash(TEST_USER_PASSWORD, 10);
      user = await User.create({
        email: TEST_USER_EMAIL,
        password: hashedPassword,
        name: 'TransactionTestUser',
      } as any);
    }

    const loginRes = await agent.post('/api/login').send({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    });

    if (loginRes.status !== StatusCodes.OK) {
      console.error('Login failed:', loginRes.body);
      throw new Error('Login failed: ' + JSON.stringify(loginRes.body));
    }

    // 2. 為了測試新增交易，我們需要知道該 User 下面的一個 AccountId 與 CategoryId
    // user is already found/created above

    // 2. Setup Data (Account & Category)
    // Find or Create Account
    let account = await Account.findOne({ where: { userId: user.id } });
    if (!account) {
      account = await Account.create({
        userId: user.id,
        name: 'TransactionTestAccount',
        type: '銀行',
        balance: 10000,
        icon: 'bank',
        color: '#000000',
      } as any);
    }
    accountId = account.id;

    // Find or Create Category (Expense)
    let category = await Category.findOne({
      where: { userId: user.id, type: RootType.EXPENSE },
    });
    if (!category) {
      // Create Root if needed (optional if backend handles parentId null, but better strictly)
      // Simplifying: just create a root expense
      category = await Category.create({
        userId: user.id,
        name: 'TransactionTestFood',
        type: RootType.EXPENSE,
        icon: 'food',
        color: '#000',
        parentId: null,
      } as any);
    }
    categoryId = category.id;

    // 2.5 找第二個帳戶 (for Transfer test)，如果沒有就建一個
    let account2 = await Account.findOne({
      where: {
        userId: user.id,
        id: { [require('sequelize').Op.ne]: accountId }, // 排除第一個帳戶
      },
    });

    if (!account2) {
      account2 = await Account.create({
        userId: user.id,
        name: 'Test Bank 2',
        type: '銀行',
        balance: 10000,
        icon: 'bank',
        color: '#000000',
        isArchived: false,
      } as any);
    }
    account2Id = account2.id;
  });

  it('should create a new expense transaction', async () => {
    const payload = {
      accountId: accountId,
      categoryId: categoryId,
      amount: 100,
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      time: '12:00',
      type: RootType.EXPENSE,
      paymentFrequency: PaymentFrequency.ONE_TIME,
      description: '自動跑測試！！！',
      receipt: null,
      mainCategory: categoryId,
    };

    // 發送請求 (帶有 agent Cookie)
    const res = await agent.post('/api/transaction').send(payload);

    // 驗證 API 回應
    expect(res.status).toBe(StatusCodes.CREATED);
    expect(res.body.isSuccess).toBe(true);
    expect(res.body.data.description).toBe('自動跑測試！！！');

    // 驗證資料庫 (Database Check)
    const tx = await Transaction.findOne({
      where: {
        description: '自動跑測試！！！',
        amount: 100,
      },
      order: [['createdAt', 'DESC']],
    });

    expect(tx).toBeTruthy();
    expect(Number(tx?.amount)).toBe(100);
    expect(tx?.accountId).toBe(accountId);

    // 清理資料 (Optional) - 把測試建立的資料刪除
    if (tx) {
      await tx.destroy();
    }
  });

  it('should get transaction list', async () => {
    const res = await agent.get('/api/transaction/date').query({
      startDate: '2025-01-01',
      endDate: '2025-12-31',
    });

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body.isSuccess).toBe(true);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(0);
  });

  // 反向測試 (Negative Case): 測試驗證邏輯
  it('should return 400 if required fields are missing', async () => {
    const invalidPayload = {
      // 故意不傳 amount
      date: '2026-01-06',
      type: '支出',
    };

    const res = await agent.post('/api/transaction').send(invalidPayload);

    // 預期失敗
    expect(res.status).toBe(StatusCodes.BAD_REQUEST);
    expect(res.body.isSuccess).toBe(false);
  });

  // 邊緣測試 (Edge Case): 負數金額
  it('should return 400 if amount is negative', async () => {
    const negativePayload = {
      accountId: accountId,
      categoryId: categoryId,
      amount: -500, // ❌ 負數支出
      date: '2026-01-06',
      time: '12:00',
      type: '支出',
      paymentFrequency: '單次',
      description: '惡意負數測試',
    };

    const res = await agent.post('/api/transaction').send(negativePayload);
    expect(res.status).toBe(StatusCodes.BAD_REQUEST);
  });

  // 邊緣測試 (Edge Case): 零元交易
  it('should return 400 if amount is zero', async () => {
    const zeroPayload = {
      accountId: accountId,
      categoryId: categoryId,
      amount: 0, // ❌ 零元沒意義
      date: '2026-01-06',
      time: '12:00',
      type: '支出',
      paymentFrequency: '單次',
      description: '零元測試',
    };

    const res = await agent.post('/api/transaction').send(zeroPayload);
    expect(res.status).toBe(StatusCodes.BAD_REQUEST);
  });

  // ==========================================
  // 下面是補齊 CRUD 的完整測試流程
  // ==========================================

  let createdTransactionId: string;
  let transferFromId: string;

  // 1. 為了能測 update/delete，我們需要先有一筆成功的交易 ID
  // 我們可以重構上面的 create 測試來把 ID 存起來，或者在這裡新建立一筆專門給 Update 用
  // 為了方便，我們直接在這邊建立一筆新的「測試用交易」
  it('should create a transaction specifically for CRUD flow', async () => {
    const payload = {
      accountId: accountId,
      categoryId: categoryId,
      amount: 888,
      date: '2026-01-01',
      time: '10:00',
      type: RootType.EXPENSE,
      paymentFrequency: PaymentFrequency.ONE_TIME,
      description: 'CRUD Test Transaction',
      receipt: null,
      mainCategory: categoryId,
    };

    const res = await agent.post('/api/transaction').send(payload);
    expect(res.status).toBe(StatusCodes.CREATED);
    createdTransactionId = res.body.data.id; // 👈 抓住 ID！
  });

  // 2. 測試 GET /:id (獲取詳情)
  it('should get transaction detail by ID', async () => {
    if (!createdTransactionId) throw new Error('No transaction created');

    const res = await agent.get(`/api/transaction/id/${createdTransactionId}`);

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body.isSuccess).toBe(true);
    // expect(res.body.data.id).toBe(createdTransactionId); // <- 不回傳 id 給前端，理由是前端不需要這個屬性
    expect(Number(res.body.data.amount)).toBe(888);
  });

  // 3. 測試 PUT /:id (編輯/更新)
  it('should update an existing transaction', async () => {
    if (!createdTransactionId) throw new Error('No transaction created');

    const updatePayload = {
      accountId: accountId,
      categoryId: categoryId,
      amount: 999, // 修改金額
      date: '2026-01-02', // 修改日期
      time: '11:00', // 修改時間
      type: RootType.EXPENSE,
      paymentFrequency: PaymentFrequency.ONE_TIME,
      receipt: null,
      description: 'Updated Description', // 修改備註
      mainCategory: categoryId,
    };

    const res = await agent
      .put(`/api/transaction/${createdTransactionId}`)
      .send(updatePayload);

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body.isSuccess).toBe(true);
    // 確認回傳的資料要是新的
    expect(Number(res.body.data.amount)).toBe(999);
    expect(res.body.data.description).toBe('Updated Description');

    // 再去資料庫確認一次 (Double Check)
    const dbTx = await Transaction.findByPk(createdTransactionId);
    expect(Number(dbTx?.amount)).toBe(999);
  });

  // 4. 測試 DELETE /:id (刪除)
  it('should delete a transaction', async () => {
    if (!createdTransactionId) throw new Error('No transaction created');

    const res = await agent.delete(`/api/transaction/${createdTransactionId}`);

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body.isSuccess).toBe(true);

    // 驗證軟刪除 (Soft Delete)
    // findByPk 預設會過濾掉 deletedAt 不是 null 的
    const dbTx = await Transaction.findByPk(createdTransactionId);
    expect(dbTx).toBeNull();

    // 如果要確認它真的在 DB 裡只是有了 deletedAt，可以用 paranoid: false
    const deletedTx = await Transaction.findByPk(createdTransactionId, {
      paranoid: false,
    });
    expect(deletedTx).not.toBeNull();
    expect((deletedTx as any)?.deletedAt).not.toBeNull();
  });

  // 5. 測試刪除後再去 GET 應該要拿不到 (或 404)
  it('should return 404 when getting a deleted transaction', async () => {
    if (!createdTransactionId) throw new Error('No transaction created');

    const res = await agent.get(`/api/transaction/${createdTransactionId}`);

    // 視你的實作而定，通常是 404 Not Found
    expect(res.status).toBe(StatusCodes.NOT_FOUND);
  });

  // ==========================================
  // 轉帳功能測試 (Transfer)
  // ==========================================
  it('should create a transfer transaction', async () => {
    const payload = {
      accountId: accountId, // From
      targetAccountId: account2Id, // To
      amount: 500,
      date: '2026-01-10',
      time: '12:00',
      type: RootType.OPERATE, // 轉帳
      description: 'Test Transfer',
      categoryId: categoryId,
      receipt: null,
      paymentFrequency: PaymentFrequency.ONE_TIME,
    };

    const res = await agent.post('/api/transaction/transfer').send(payload);

    expect(res.status).toBe(StatusCodes.CREATED);
    expect(res.body.isSuccess).toBe(true);
    expect(res.body.data.fromTransaction.type).toBe(RootType.EXPENSE);
    expect(res.body.data.toTransaction.type).toBe(RootType.INCOME);

    // 驗證 Link ID 互連
    expect(res.body.data.fromTransaction.linkId).toBe(
      res.body.data.toTransaction.id
    );
    expect(res.body.data.toTransaction.linkId).toBe(
      res.body.data.fromTransaction.id
    );

    // 驗證 Target Account ID 互指
    expect(res.body.data.fromTransaction.targetAccountId).toBe(account2Id);
    expect(res.body.data.toTransaction.targetAccountId).toBe(accountId); // toTransaction 的 Account 是 account2Id，所以 target 是 accountId

    transferFromId = res.body.data.fromTransaction.id;
  });

  it('should filter transactions by OPERATE type', async () => {
    if (!transferFromId) throw new Error('No transfer created');

    const res = await agent.get('/api/transaction/date').query({
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      type: RootType.OPERATE,
    });

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body.isSuccess).toBe(true);
    // 應該要找到剛剛建立的那筆轉帳
    const found = res.body.data.items.find(
      (item: any) => item.id === transferFromId
    );
    expect(found).toBeDefined();
  });

  it('should cascade delete transfer transactions', async () => {
    if (!transferFromId) throw new Error('No transfer created');

    const res = await agent.delete(`/api/transaction/${transferFromId}`);

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body.isSuccess).toBe(true);

    // 驗證兩筆都刪除了
    const fromTx = await Transaction.findByPk(transferFromId);
    expect(fromTx).toBeNull();

    // 找出跟他連動的那一筆，應該也要被刪除
    // 因為我們只知道 linkId，所以要用 paranoid: false 找出來看 linkId，或者直接用 DB query
    // 這裡我們假設 linkId 正確，去 query DB 找 linkId 為 transferFromId 的那筆 (也就是 To Transaction)
    const toTx = await Transaction.findOne({
      where: { linkId: transferFromId },
    });
    expect(toTx).toBeNull();
  });

  it('should restore balance when transfer is deleted', async () => {
    // 1. Get current balance of two accounts
    const acc1 = await Account.findByPk(accountId);
    const acc2 = await Account.findByPk(account2Id);

    if (!acc1 || !acc2) throw new Error('Accounts not found');

    const initialBalance1 = Number(acc1.balance);
    const initialBalance2 = Number(acc2.balance);
    const transferAmount = 300;

    // 2. Create Transfer
    const payload = {
      accountId: accountId, // From
      targetAccountId: account2Id, // To
      amount: transferAmount,
      date: '2026-01-20',
      time: '12:00',
      type: RootType.OPERATE,
      description: 'Transfer for Delete Test',
      categoryId: categoryId,
      receipt: null,
      paymentFrequency: PaymentFrequency.ONE_TIME,
    };

    const res = await agent.post('/api/transaction/transfer').send(payload);
    expect(res.status).toBe(StatusCodes.CREATED);
    const fromTxId = res.body.data.fromTransaction.id;

    // 3. Verify Balance Changed
    await acc1.reload();
    await acc2.reload();

    expect(Number(acc1.balance)).toBe(initialBalance1 - transferAmount);
    expect(Number(acc2.balance)).toBe(initialBalance2 + transferAmount);

    // 4. Delete Transfer
    const delRes = await agent.delete(`/api/transaction/${fromTxId}`);
    expect(delRes.status).toBe(StatusCodes.OK);

    // 5. Verify Balance Restored
    await acc1.reload();
    await acc2.reload();

    expect(Number(acc1.balance)).toBe(initialBalance1);
    expect(Number(acc2.balance)).toBe(initialBalance2);
  });

  // ==========================================
  // 統計報表測試 (Summary)
  // ==========================================
  it('should get transaction summary for dashboard', async () => {
    const payload = {
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      groupBy: 'month',
    };

    const res = await agent.post('/api/transaction/summary').send(payload);

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body.isSuccess).toBe(true);
    // 檢查回傳結構
    expect(Array.isArray(res.body.data.trends)).toBe(true);
    expect(res.body.data.summary).toHaveProperty('income');
    expect(res.body.data.summary).toHaveProperty('expense');
    expect(res.body.data.summary).toHaveProperty('balance');
  });
});
