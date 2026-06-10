import {
  User,
  Transaction,
  TransactionExtra,
  Account,
  Budget,
  Currency,
} from '@/models';
import sequelize from '@/utils/postgres';
import { getRate } from './exchangeRateService';
import { roundToBaseCurrency } from '@repo/shared';

/**
 * 切換使用者本位幣（決策 Q1：用歷史匯率一次性重算）。
 *
 * 對每筆交易，用「交易當下日期」的 帳戶幣別 → 新本位幣 匯率重算 baseRate / amountInBase，
 * 並連帶重算其 TransactionExtra 的 base 快照；預算（本位幣計價）用「今日」匯率由舊本位幣換算。
 * 任一所需匯率缺漏即整批中止並回報缺漏清單（避免落庫錯誤快照）。整個過程包在 DB transaction。
 */
export const changeBaseCurrency = async (
  userId: string,
  newBaseCode: string,
): Promise<{
  changed: boolean;
  oldBaseCode: string;
  newBaseCode: string;
  transactionsRecomputed: number;
  budgetsConverted: number;
}> => {
  const user = await User.findByPk(userId);
  if (!user) throw new Error('User not found');
  const oldBaseCode = (user as any).baseCurrencyCode || 'TWD';

  if (oldBaseCode === newBaseCode) {
    return {
      changed: false,
      oldBaseCode,
      newBaseCode,
      transactionsRecomputed: 0,
      budgetsConverted: 0,
    };
  }

  const target = await Currency.findOne({
    where: { code: newBaseCode, isActive: true },
  });
  if (!target) throw new Error(`未知或未啟用的幣別：${newBaseCode}`);

  return sequelize.transaction(async (t) => {
    // 1. 載入使用者全部交易（含帳戶幣別與 extra）
    const txns = await Transaction.findAll({
      where: { userId },
      include: [
        { model: Account, as: 'account', attributes: ['currencyCode'] },
        { model: TransactionExtra, as: 'transactionExtra' },
      ],
      transaction: t,
    });

    // 2. 先檢查所有需要的歷史匯率是否齊全（缺漏即中止）
    const missing = new Set<string>();
    const rateOf = async (accCur: string, date: string) => {
      const r = await getRate(accCur, newBaseCode, date);
      if (r == null) missing.add(`${accCur}->${newBaseCode}@${date}`);
      return r;
    };

    const plans: {
      tx: any;
      baseRate: number;
      amountInBase: number;
      extra?: { id: string; add: number; minus: number };
    }[] = [];

    for (const tx of txns) {
      const accCur = (tx as any).account?.currencyCode || oldBaseCode;
      const date = tx.date as string;
      const rate = await rateOf(accCur, date);
      if (rate == null) continue; // 記錄缺漏，稍後統一中止
      const amount = Number((tx as any).amount) || 0;
      const plan: (typeof plans)[number] = {
        tx,
        baseRate: rate,
        amountInBase: roundToBaseCurrency(amount * rate),
      };
      const extra = (tx as any).transactionExtra;
      if (extra) {
        plan.extra = {
          id: extra.id,
          add: roundToBaseCurrency((Number(extra.extraAdd) || 0) * rate),
          minus: roundToBaseCurrency((Number(extra.extraMinus) || 0) * rate),
        };
      }
      plans.push(plan);
    }

    // 3. 預算（本位幣計價）用今日匯率由舊本位幣換算到新本位幣
    const budgets = await Budget.findAll({
      where: { userId },
      transaction: t,
    });
    const budgetRate =
      budgets.length > 0 ? await getRate(oldBaseCode, newBaseCode) : 1;
    if (budgets.length > 0 && budgetRate == null) {
      missing.add(`${oldBaseCode}->${newBaseCode}@today(budget)`);
    }

    if (missing.size > 0) {
      throw new Error(
        `缺少下列匯率，無法切換本位幣（請先補匯率）：${Array.from(missing).join(', ')}`,
      );
    }

    // 4. 套用：交易 + extra
    for (const p of plans) {
      await p.tx.update(
        { baseRate: p.baseRate, amountInBase: p.amountInBase },
        { transaction: t, hooks: false }, // 已算好 amountInBase，跳過 hook 避免用新 baseRate 再算一次（結果相同，但省一次）
      );
      if (p.extra) {
        await TransactionExtra.update(
          {
            extraAddInBase: p.extra.add,
            extraMinusInBase: p.extra.minus,
          },
          { where: { id: p.extra.id }, transaction: t },
        );
      }
    }

    // 5. 套用：預算金額換算
    let budgetsConverted = 0;
    for (const b of budgets) {
      const newAmount = roundToBaseCurrency(
        (Number((b as any).amount) || 0) * (budgetRate as number),
      );
      const update: Record<string, any> = { amount: newAmount };
      if ((b as any).pendingAmount != null) {
        update.pendingAmount = roundToBaseCurrency(
          Number((b as any).pendingAmount) * (budgetRate as number),
        );
      }
      await b.update(update, { transaction: t });
      budgetsConverted += 1;
    }

    // 6. 更新使用者本位幣
    await user.update({ baseCurrencyCode: newBaseCode }, { transaction: t });

    return {
      changed: true,
      oldBaseCode,
      newBaseCode,
      transactionsRecomputed: plans.length,
      budgetsConverted,
    };
  });
};

export default { changeBaseCurrency };
