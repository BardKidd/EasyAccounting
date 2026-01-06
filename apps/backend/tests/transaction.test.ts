import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import User from '@/models/user';
import Account from '@/models/account';
import Category from '@/models/category';
import Transaction from '@/models/transaction';
import { MainType, PaymentFrequency } from '@repo/shared';
import { StatusCodes } from 'http-status-codes';

describe('Transaction API Integration Test', () => {
  // supertest 的 agent 會模擬真實瀏覽器的行為
  // 所以下面登入後就會模擬真實情況拿到 cookie
  const agent = request.agent(app);

  let accountId = '';
  let categoryId = '';
  const userEmail = process.env.TEST_USER_EMAIL;
  const userPassword = process.env.TEST_USER_PASSWORD;

  if (!userEmail || !userPassword) {
    throw new Error(
      '請在 apps/backend/.env (或 frontend/.env) 設定 TEST_USER_EMAIL 與 TEST_USER_PASSWORD'
    );
  }

  beforeAll(async () => {
    // 1. 登入 (Login)
    const loginRes = await agent.post('/api/login').send({
      email: userEmail,
      password: userPassword,
    });

    if (loginRes.status !== StatusCodes.OK) {
      console.error('Login failed:', loginRes.body);
      throw new Error('Login failed: ' + JSON.stringify(loginRes.body));
    }

    // 2. 為了測試新增交易，我們需要知道該 User 下面的一個 AccountId 與 CategoryId
    const user = await User.findOne({ where: { email: userEmail } });
    if (!user) throw new Error('User not found in DB');

    // 找一個帳戶
    const account = await Account.findOne({ where: { userId: user.id } });
    // 找一個支出類別 (因為我們要測支出)
    const category = await Category.findOne({
      where: { userId: user.id, type: MainType.EXPENSE },
    });

    if (!account)
      throw new Error('User has no account, cannot test transaction creation');
    if (!category)
      throw new Error(
        'User has no expense category, cannot test transaction creation'
      );

    accountId = account.id;
    categoryId = category.id;
  });

  it('should create a new expense transaction', async () => {
    const payload = {
      accountId: accountId,
      categoryId: categoryId,
      amount: 100,
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      time: '12:00',
      type: MainType.EXPENSE,
      paymentFrequency: PaymentFrequency.ONE_TIME,
      description: '自動跑測試！！！',
      receipt: null,
      subCategory: categoryId,
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
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
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
      type: MainType.EXPENSE,
      paymentFrequency: PaymentFrequency.ONE_TIME,
      description: 'CRUD Test Transaction',
      receipt: null,
      subCategory: categoryId,
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
      type: MainType.EXPENSE,
      paymentFrequency: PaymentFrequency.ONE_TIME,
      receipt: null,
      description: 'Updated Description', // 修改備註
      subCategory: categoryId,
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
});
