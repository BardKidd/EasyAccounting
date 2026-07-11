/**
 * Excel 匯入匯出「真實 DB」端到端整合測試。
 *
 * 與 unit 測試不同：這裡 **不 mock** @/models 與 @/utils/postgres，
 * 真的對 PostgreSQL 跑一遍，只攔截 Azure Blob（拿到匯出 buffer）與 auth（注入測試 user）。
 *
 * 驗證三件事：
 *   1. 兩種匯出模式（匯出用無 id / 編輯用含隱藏 id）
 *   2. 新增匯出後上傳（mode=create）→ 真的新增資料、餘額正確變動
 *   3. 編輯匯出後改檔上傳（mode=edit）→ 同一筆交易被正確「更新」、餘額正確重算
 *
 * 需要可連線的 PostgreSQL（與其他後端 DB 測試相同前提）。
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

process.env.RESEND_API_KEY = 're_123';
process.env.AZURE_BLOB_CONNECTION_STRING =
  'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=test;';

import request from 'supertest';
import ExcelJS from 'exceljs';
import {
  RootType,
  PaymentFrequency,
  ExcelImportMode,
  ExcelExportMode,
  Currency,
} from '@repo/shared';

// 共享狀態（auth user id 與攔截到的匯出 buffer），需用 vi.hoisted 才能被 mock factory 取用
const hoisted = vi.hoisted(() => ({
  userId: '',
  uploaded: [] as { name: string; buffer: Buffer }[],
}));

// 只 mock auth 與 Azure；models / postgres 用真的
vi.mock('@/middlewares/authMiddleware', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = {
      userId: hoisted.userId,
      email: 'excel-roundtrip-test@example.com',
    };
    next();
  },
}));

vi.mock('@/utils/azureBlob', () => ({
  uploadFileToBlob: vi.fn((name: string, buffer: Buffer) => {
    hoisted.uploaded.push({ name, buffer });
    return Promise.resolve();
  }),
  generateSasUrl: vi.fn(() => 'https://mock-sas-url.com/file.xlsx'),
}));

import { app } from '../../src/app';
import { User, Account, Category, Transaction } from '@/models';
import excelServices from '@/services/excelServices';
import transactionServices from '@/services/transactionServices';

const agent = request.agent(app);

// 取最近一次匯出寫入 blob 的 buffer
const lastBuffer = () => hoisted.uploaded[hoisted.uploaded.length - 1]!.buffer;

// 以 header 文字找欄號（1-based）
const findCol = (sheet: ExcelJS.Worksheet, header: string): number => {
  let col = -1;
  sheet.getRow(1).eachCell((cell, c) => {
    if (cell.text === header) col = c;
  });
  return col;
};

const loadFirstSheet = async (buffer: Buffer) => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as any);
  return wb.getWorksheet(1)!;
};

const getAccountBalance = async (id: string): Promise<number> => {
  const acc = await Account.findByPk(id);
  return Number((acc as any).balance);
};

describe('Excel 匯入匯出 真實 DB 端到端', () => {
  vi.setConfig({ testTimeout: 60000 });

  let accountA: any;
  let accountB: any;
  let categoryId: string;
  let categoryString: string;
  let incomeTxId: string;

  beforeAll(async () => {
    // 1. 建立隔離測試 user
    const user = await User.create({
      name: 'Excel RoundTrip Test',
      email: `excel-roundtrip-${Date.now()}@example.com`,
      password: 'hashed_pw_for_test',
      isGuest: false,
    } as any);
    hoisted.userId = (user as any).id;

    // 2. 建立兩個帳戶（初始餘額 0）
    accountA = await Account.create({
      userId: hoisted.userId,
      name: '測試來源帳戶',
      type: '銀行',
      balance: 0,
      initialBalance: 0,
      icon: 'bank',
      color: '#000000',
    } as any);
    accountB = await Account.create({
      userId: hoisted.userId,
      name: '測試目標帳戶',
      type: '銀行',
      balance: 0,
      initialBalance: 0,
      icon: 'bank',
      color: '#000000',
    } as any);

    // 3. 取一組有效分類字串 + leaf id（用既有預設分類）
    const { stringCollection, categories } =
      await excelServices.getAllCategoriesHyphenString(hoisted.userId);
    categoryString = stringCollection[0]!;
    const [mainName, subName] = categoryString.split('-');
    const mainId = categories.find((c: any) => c.name === mainName)?.id;
    categoryId =
      (subName
        ? categories.find(
            (c: any) => c.name === subName && c.parentId === mainId,
          )?.id
        : mainId) || '';
    expect(categoryId).toBeTruthy();

    // 4. 透過真實 service 種子資料（餘額由真實邏輯計算）
    const base = {
      date: '2026-06-01',
      time: '12:00:00',
      categoryId,
      receipt: '',
      paymentFrequency: PaymentFrequency.ONE_TIME,
    };
    const income: any = await transactionServices.createTransaction(
      {
        ...base,
        type: RootType.INCOME,
        amount: 1000,
        accountId: accountA.id,
        description: '種子收入',
      } as any,
      hoisted.userId,
    );
    incomeTxId = income.id;

    await transactionServices.createTransaction(
      {
        ...base,
        type: RootType.EXPENSE,
        amount: 300,
        accountId: accountA.id,
        description: '種子支出',
      } as any,
      hoisted.userId,
    );

    await transactionServices.createTransfer(
      {
        ...base,
        type: RootType.OPERATE,
        amount: 200,
        accountId: accountA.id,
        targetAccountId: accountB.id,
        description: '種子轉帳',
      } as any,
      hoisted.userId,
    );

    // 種子後餘額：A = 1000 - 300 - 200 = 500；B = 200
    expect(await getAccountBalance(accountA.id)).toBe(500);
    expect(await getAccountBalance(accountB.id)).toBe(200);
  });

  afterAll(async () => {
    if (!hoisted.userId) return;
    // 硬刪除測試資料（force 繞過 paranoid soft-delete）
    await Transaction.destroy({
      where: { userId: hoisted.userId },
      force: true,
    });
    await Account.destroy({ where: { userId: hoisted.userId }, force: true });
    await User.destroy({ where: { id: hoisted.userId }, force: true });
  });

  it('1. 兩種匯出模式：匯出用無 id、編輯用含隱藏 id，金額為數字、幣別 TWD', async () => {
    // 編輯用
    const editRes = await agent.get(
      `/api/excel/user-transactions?mode=${ExcelExportMode.EDIT}`,
    );
    expect(editRes.status).toBe(200);
    const editSheet = await loadFirstSheet(lastBuffer());

    const idCol = findCol(editSheet, 'id');
    expect(idCol).toBeGreaterThan(0); // 編輯用必須有隱藏 id 欄
    const currencyCol = findCol(editSheet, '幣別');
    const amountCol = findCol(editSheet, '金額*');

    // 找出種子收入那一列（amount 1000）
    let incomeRow: ExcelJS.Row | undefined;
    editSheet.eachRow((row, n) => {
      if (n === 1) return;
      if (Number(row.getCell(amountCol).value) === 1000 && !incomeRow)
        incomeRow = row;
    });
    expect(incomeRow).toBeTruthy();
    expect(incomeRow!.getCell(currencyCol).text).toBe(Currency.TWD);
    expect(typeof incomeRow!.getCell(amountCol).value).toBe('number');
    expect(String(incomeRow!.getCell(idCol).text)).toBe(incomeTxId);

    // 匯出用（無 mode）→ 不應有 id 欄
    const plainRes = await agent.get('/api/excel/user-transactions');
    expect(plainRes.status).toBe(200);
    const plainSheet = await loadFirstSheet(lastBuffer());
    expect(findCol(plainSheet, 'id')).toBe(-1);
    expect(findCol(plainSheet, '幣別')).toBeGreaterThan(0);
  });

  it('2. 新增匯出後上傳（mode=create）→ 真的新增資料、餘額正確變動', async () => {
    const beforeCount = await Transaction.count({
      where: { userId: hoisted.userId },
    });
    const beforeA = await getAccountBalance(accountA.id);
    const beforeB = await getAccountBalance(accountB.id);

    // 用「匯出用」buffer（3 列：收入/支出/轉帳，皆無 id）上傳為新增
    const plainRes = await agent.get('/api/excel/user-transactions');
    const buffer = lastBuffer();

    const res = await agent
      .post('/api/excel/import-transactions')
      .field('mode', ExcelImportMode.CREATE)
      .attach('file', buffer as any, 'create_upload.xlsx');

    expect(res.status).toBe(200);
    expect(res.body.data.message).toMatch(/成功匯入 3 筆/);
    expect(res.body.data.message).toMatch(/失敗 0 筆/);

    // 收入/支出各 1 筆 + 轉帳 2 筆（from/to）= 新增 4 筆 Transaction
    const afterCount = await Transaction.count({
      where: { userId: hoisted.userId },
    });
    expect(afterCount - beforeCount).toBe(4);

    // 餘額：A 再 +1000 -300 -200 = +500；B +200
    expect((await getAccountBalance(accountA.id)) - beforeA).toBe(500);
    expect((await getAccountBalance(accountB.id)) - beforeB).toBe(200);
  });

  it('3. 編輯匯出後改檔上傳（mode=edit）→ 同筆交易被更新、餘額正確重算', async () => {
    const beforeA = await getAccountBalance(accountA.id);
    const beforeCount = await Transaction.count({
      where: { userId: hoisted.userId },
    });

    // 取編輯用 buffer，把種子收入那一筆（id=incomeTxId）金額 1000 → 1500
    await agent.get(
      `/api/excel/user-transactions?mode=${ExcelExportMode.EDIT}`,
    );
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(lastBuffer() as any);
    const sheet = wb.getWorksheet(1)!;
    const idCol = findCol(sheet, 'id');
    const amountCol = findCol(sheet, '金額*');

    let edited = false;
    sheet.eachRow((row, n) => {
      if (n === 1) return;
      if (String(row.getCell(idCol).text) === incomeTxId) {
        row.getCell(amountCol).value = 1500;
        edited = true;
      }
    });
    expect(edited).toBe(true);

    const modifiedBuffer = await wb.xlsx.writeBuffer();
    const res = await agent
      .post('/api/excel/import-transactions')
      .field('mode', ExcelImportMode.EDIT)
      .attach('file', modifiedBuffer as any, 'edit_upload.xlsx');

    expect(res.status).toBe(200);
    // 全部都是更新（沒有任何失敗），其中一筆金額被改
    expect(res.body.data.message).toMatch(/失敗 0 筆/);

    // 同一筆 id 被更新（非新增）：amount 1000 → 1500
    const updated = await Transaction.findByPk(incomeTxId);
    expect(Number((updated as any).amount)).toBe(1500);

    // 沒有新增任何 Transaction（純更新）
    const afterCount = await Transaction.count({
      where: { userId: hoisted.userId },
    });
    expect(afterCount).toBe(beforeCount);

    // 其餘列以原值更新（沖銷後重套，淨變動 0），只有這筆收入 +500
    expect((await getAccountBalance(accountA.id)) - beforeA).toBe(500);
  });
});
