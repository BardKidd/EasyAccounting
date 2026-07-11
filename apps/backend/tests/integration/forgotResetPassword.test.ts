/**
 * 忘記密碼 / 重設密碼「真實 DB」整合測試 — 對應 forgot-password spec.md 的 7.2 安全驗證。
 *
 * 覆蓋補強後的三處 + 既有不變式：
 *   - FR-7 舊 token 自動失效：申請新 token 後，同使用者的舊 token 無法再重設密碼。
 *   - single-use：token 用過一次即失效（usedAt）。
 *   - token 過期：expiresAt 已過 → 拒絕。
 *   - NFR-3 email 列舉防護：不存在的 email / 訪客 / per-email 超限，皆回「完全相同」的 generic 200 且不寄信。
 *   - NFR-4 per-email 上限：15 分鐘內最多 3 封。
 *
 * 隔離策略：只 mock emailService（擋 Resend 真寄信），其餘走真實 DB 與真實 model。
 * getIpLocation 對 loopback IP（supertest 的 ::ffff:127.0.0.1）直接回傳，不會打外部網路。
 * per-IP rate limit（forgotPasswordLimiter）在非 production 會 skip，故不遮蔽 controller 內的 per-email 閘門。
 *
 * ⚠️ 需先對測試 DB 跑 migration（含 password_reset_token 建表）。
 */
import { describe, it, expect, afterAll, beforeEach, vi } from 'vitest';

// vi.hoisted 會被提升到所有 import 之前執行；ESM 的 import 會先於一般 top-level 賦值跑，
// 而 azureBlob.ts 在 import 期就 fromConnectionString，故 env 必須在 import 前備妥（dotenv 預設不覆蓋既有值）。
vi.hoisted(() => {
  process.env.RESEND_API_KEY = 're_123';
  process.env.AZURE_BLOB_CONNECTION_STRING =
    'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=test;EndpointSuffix=core.windows.net';
});

// 擋掉真實寄信；rawToken 只出現在信件 resetUrl，藉此 mock 的呼叫參數把它取回來測 reset 流程。
vi.mock('@/services/emailService', () => ({
  default: {
    sendPasswordResetEmail: vi.fn(async () => {}),
  },
}));

import request from 'supertest';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { app } from '../../src/app';
import { StatusCodes } from 'http-status-codes';
import { User, PasswordResetToken } from '@/models';
import emailService from '@/services/emailService';

const GENERIC = '若此信箱已註冊，您將收到重設密碼的信件';
const NEW_PW = 'newPass1234';
const sendMock = emailService.sendPasswordResetEmail as unknown as ReturnType<
  typeof vi.fn
>;

const createdUserIds: string[] = [];

const mkUser = async (tag: string, opts: { isGuest?: boolean } = {}) => {
  const u = await User.create({
    name: `FP ${tag}`,
    email: `fp-${tag}-${Date.now()}@example.com`,
    password: 'hashed_pw_for_test',
    isGuest: opts.isGuest ?? false,
    baseCurrencyCode: 'TWD',
  } as any);
  const id = (u as any).id as string;
  createdUserIds.push(id);
  return u as any;
};

const forgot = (email: string) =>
  request(app).post('/api/forgot-password').send({ email });

const reset = (token: string) =>
  request(app)
    .post('/api/reset-password')
    .send({ token, password: NEW_PW, confirmPassword: NEW_PW });

/** 取最近一次寄信 mock 的 resetUrl 內的 rawToken（resetUrl 前綴取自 ORIGIN_URL，不保證是合法單一 URL，故以 regex 抽 hex token） */
const lastRawToken = () => {
  const call = sendMock.mock.calls.at(-1);
  const resetUrl = (call![0] as any).resetUrl as string;
  const token = resetUrl.match(/token=([a-f0-9]+)/)?.[1];
  if (!token) throw new Error(`no token in resetUrl: ${resetUrl}`);
  return token;
};

describe('忘記密碼 / 重設密碼 真實 DB 整合（7.2 安全驗證）', () => {
  vi.setConfig({ testTimeout: 15000 });

  beforeEach(() => {
    sendMock.mockClear();
  });

  afterAll(async () => {
    for (const id of createdUserIds) {
      await PasswordResetToken.destroy({ where: { userId: id } });
      await User.destroy({ where: { id }, individualHooks: true });
    }
  });

  it('FR-7 + single-use：申請第二封後舊 token 失效、新 token 可用且僅能用一次', async () => {
    const u = await mkUser('fr7');

    await forgot(u.email).expect(StatusCodes.OK);
    await vi.waitFor(() => expect(sendMock).toHaveBeenCalledTimes(1));
    const t1 = lastRawToken();

    await forgot(u.email).expect(StatusCodes.OK);
    await vi.waitFor(() => expect(sendMock).toHaveBeenCalledTimes(2));
    const t2 = lastRawToken();
    expect(t2).not.toBe(t1);

    // FR-7：舊 token 已被第二次申請作廢
    const r1 = await reset(t1);
    expect(r1.status).toBe(StatusCodes.BAD_REQUEST);

    // 新 token 可用
    const r2 = await reset(t2);
    expect(r2.status).toBe(StatusCodes.OK);

    // 密碼確實被更新
    const fresh = await User.findByPk(u.id);
    expect(await bcrypt.compare(NEW_PW, (fresh as any).password)).toBe(true);

    // single-use：同一個 token 不能再用第二次
    const r3 = await reset(t2);
    expect(r3.status).toBe(StatusCodes.BAD_REQUEST);
  });

  it('NFR-4 + NFR-3：per-email 超過 3 封時回 generic 200 且不寄信（不洩漏存在）', async () => {
    const u = await mkUser('limit');

    for (let i = 0; i < 3; i++) {
      await forgot(u.email).expect(StatusCodes.OK);
    }
    await vi.waitFor(() => expect(sendMock).toHaveBeenCalledTimes(3));

    // 第 4 封：超限 → 與正常路徑相同的 generic 200
    const r4 = await forgot(u.email);
    expect(r4.status).toBe(StatusCodes.OK);
    expect(r4.body.isSuccess).toBe(true);
    expect(r4.body.message).toBe(GENERIC);

    // 背景寄信給一點時間跑；第 4 封不得寄出
    await new Promise((r) => setTimeout(r, 100));
    expect(sendMock).toHaveBeenCalledTimes(3);

    // DB：共 3 筆 token，且因 FR-7 作廢舊 token，僅剩 1 筆有效（usedAt null）
    const total = await PasswordResetToken.count({ where: { userId: u.id } });
    const active = await PasswordResetToken.count({
      where: { userId: u.id, usedAt: null },
    });
    expect(total).toBe(3);
    expect(active).toBe(1);
  });

  it('NFR-3：不存在的 email 與訪客帳號皆回相同 generic 200 且不寄信、不建 token', async () => {
    const rNone = await forgot(`fp-nobody-${Date.now()}@example.com`);
    expect(rNone.status).toBe(StatusCodes.OK);
    expect(rNone.body.message).toBe(GENERIC);

    const guest = await mkUser('guest', { isGuest: true });
    const rGuest = await forgot(guest.email);
    expect(rGuest.status).toBe(StatusCodes.OK);
    expect(rGuest.body.message).toBe(GENERIC);

    await new Promise((r) => setTimeout(r, 100));
    expect(sendMock).not.toHaveBeenCalled();
    expect(
      await PasswordResetToken.count({ where: { userId: guest.id } }),
    ).toBe(0);
  });

  it('token 過期：expiresAt 已過的 token 無法重設', async () => {
    const u = await mkUser('exp');
    const raw = crypto.randomBytes(32).toString('hex');
    const hashed = crypto.createHash('sha256').update(raw).digest('hex');
    await PasswordResetToken.create({
      userId: u.id,
      token: hashed,
      expiresAt: new Date(Date.now() - 60 * 1000),
    } as any);

    const r = await reset(raw);
    expect(r.status).toBe(StatusCodes.BAD_REQUEST);
  });
});
