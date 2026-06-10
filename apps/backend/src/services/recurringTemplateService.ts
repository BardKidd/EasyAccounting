import {
  RecurringFrequency,
  RecurringTemplateStatus,
  PaymentFrequency,
  CreateRecurringTemplateSchema,
  UpdateRecurringTemplateFutureSchema,
  RootType,
  roundToBaseCurrency,
} from '@repo/shared';
import {
  addMonths,
  addWeeks,
  addYears,
  setDate,
  getDaysInMonth,
  setMonth,
  setDate as setDayOfMonth,
  format,
  parseISO,
} from 'date-fns';
import { Op } from 'sequelize';
import sequelize from '@/utils/postgres';
import {
  RecurringTemplate,
  Transaction,
  Account,
  TransactionExtra,
  User,
} from '@/models';
import { getRate } from './exchangeRateService';

// ---------------------------------------------------------------------------
// Date Math
// ---------------------------------------------------------------------------

/**
 * 根據 frequency 計算下一個執行日期。
 * 使用「固定原始日期」策略：每次都以 originalDay/originalMonthDay 推算，
 * 而非以上一個 nextExecutionDate 累加，避免月底截斷後的漂移（e.g. 1/31 → 2/28 → 3/28）。
 */
export const calcNextExecutionDate = (
  currentDate: Date,
  frequency: RecurringFrequency,
  opts: {
    dayOfMonth?: number | null; // MONTHLY 原始設定的「幾號」(1-31)
    dayOfWeek?: number | null; // WEEKLY 原始設定的「星期幾」(0-6)
    monthDay?: string | null; // YEARLY 原始設定的「MM-DD」
  },
): string => {
  if (frequency === RecurringFrequency.WEEKLY) {
    const next = addWeeks(currentDate, 1);
    return format(next, 'yyyy-MM-dd');
  }

  if (frequency === RecurringFrequency.MONTHLY) {
    const originalDay = opts.dayOfMonth ?? currentDate.getDate();
    const next = addMonths(currentDate, 1);
    // 月底邊界：若目標月份天數不足，以最後一天代替
    const daysInNext = getDaysInMonth(next);
    const targetDay = Math.min(originalDay, daysInNext);
    return format(setDate(next, targetDay), 'yyyy-MM-dd');
  }

  if (frequency === RecurringFrequency.YEARLY) {
    const originalMonthDay = opts.monthDay ?? format(currentDate, 'MM-dd');
    const parts = originalMonthDay.split('-');
    const month = parseInt(parts[0]!, 10) - 1; // 0-indexed
    const day = parseInt(parts[1]!, 10);
    const next = addYears(currentDate, 1);
    const baseWithMonth = setMonth(next, month);
    const daysInNextMonth = getDaysInMonth(baseWithMonth);
    const targetDay = Math.min(day, daysInNextMonth);
    return format(setDayOfMonth(baseWithMonth, targetDay), 'yyyy-MM-dd');
  }

  return format(addMonths(currentDate, 1), 'yyyy-MM-dd');
};

/**
 * 根據 frequency 與設定在建立時尋找第一個符合條件的日期。
 * startDate 是選單上的日期（預設為今天）。如果 startDate 本身不符合週期條件，就從 startDate 往後找到第一個符合條件的日子當作首筆執行日。
 */
export const alignStartDateToTemplate = (
  startDateStr: string,
  frequency: RecurringFrequency,
  opts: {
    dayOfMonth?: number | null;
    dayOfWeek?: number | null;
    monthDay?: string | null;
  },
): string => {
  let current = parseISO(startDateStr);

  if (frequency === RecurringFrequency.WEEKLY && opts.dayOfWeek != null) {
    if (current.getDay() === opts.dayOfWeek) {
      return format(current, 'yyyy-MM-dd');
    }
    let diff = opts.dayOfWeek - current.getDay();
    if (diff < 0) diff += 7;
    current.setDate(current.getDate() + diff);
    return format(current, 'yyyy-MM-dd');
  }

  if (frequency === RecurringFrequency.MONTHLY && opts.dayOfMonth != null) {
    let targetDate = current;
    let targetDay = Math.min(opts.dayOfMonth, getDaysInMonth(targetDate));

    if (current.getDate() > targetDay) {
      targetDate = addMonths(current, 1);
      targetDay = Math.min(opts.dayOfMonth, getDaysInMonth(targetDate));
    }
    return format(setDate(targetDate, targetDay), 'yyyy-MM-dd');
  }

  if (frequency === RecurringFrequency.YEARLY && opts.monthDay) {
    const parts = opts.monthDay.split('-');
    const m = parseInt(parts[0]!, 10) - 1;
    const d = parseInt(parts[1]!, 10);

    let targetDate = setMonth(current, m);
    const targetDay = Math.min(d, getDaysInMonth(targetDate));
    targetDate = setDayOfMonth(targetDate, targetDay);

    if (
      targetDate.getTime() < current.getTime() &&
      format(targetDate, 'MM-dd') !== format(current, 'MM-dd')
    ) {
      targetDate = addYears(targetDate, 1);
      const nextTargetDay = Math.min(d, getDaysInMonth(targetDate));
      targetDate = setDayOfMonth(targetDate, nextTargetDay);
    }
    return format(targetDate, 'yyyy-MM-dd');
  }

  return startDateStr;
};

// ---------------------------------------------------------------------------
// Create Template
// ---------------------------------------------------------------------------

export const createTemplate = async (
  data: CreateRecurringTemplateSchema,
  userId: string,
) => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const baseStartDate = data.startDate ?? today;

  const alignedStartDate = alignStartDateToTemplate(
    baseStartDate,
    data.frequency,
    {
      dayOfMonth: data.dayOfMonth,
      dayOfWeek: data.dayOfWeek,
      monthDay: data.monthDay,
    },
  );

  const template = await RecurringTemplate.create({
    userId,
    baseTransactionAttrs: {
      ...data.baseTransactionAttrs,
      description: data.baseTransactionAttrs.description ?? null,
      receipt: data.baseTransactionAttrs.receipt ?? null,
      paymentFrequency: PaymentFrequency.RECURRING,
    },
    frequency: data.frequency,
    dayOfMonth: data.dayOfMonth ?? null,
    dayOfWeek: data.dayOfWeek ?? null,
    monthDay: data.monthDay ?? null,
    totalOccurrences: data.totalOccurrences ?? null,
    currentOccurrence: 0,
    nextExecutionDate: alignedStartDate,
    status: RecurringTemplateStatus.ACTIVE,
  });

  return template.toJSON();
};

// ---------------------------------------------------------------------------
// Get Templates
// ---------------------------------------------------------------------------

export const getTemplatesByUser = async (userId: string) => {
  const templates = await RecurringTemplate.findAll({
    where: {
      userId,
      status: {
        [Op.in]: [
          RecurringTemplateStatus.ACTIVE,
          RecurringTemplateStatus.ARCHIVED,
        ],
      },
    },
    order: [['createdAt', 'DESC']],
  });
  return templates.map((t) => t.toJSON());
};

// ---------------------------------------------------------------------------
// Update Future (B. 修改整個週期)
// ---------------------------------------------------------------------------

export const updateTemplateFutureAndTransaction = async (
  templateId: string,
  userId: string,
  data: UpdateRecurringTemplateFutureSchema,
) => {
  const t = await sequelize.transaction();
  try {
    const template = await RecurringTemplate.findOne({
      where: { id: templateId, userId },
      transaction: t,
    });
    if (!template) throw new Error('Template not found');

    // 合併更新 baseTransactionAttrs
    const updatedAttrs = {
      ...template.baseTransactionAttrs,
      ...data.baseTransactionAttrs,
    };
    await template.update(
      { baseTransactionAttrs: updatedAttrs },
      { transaction: t },
    );

    // 同步更新被點選的那筆 transaction
    if (data.transactionId) {
      const tx = await Transaction.findOne({
        where: { id: data.transactionId, userId },
        transaction: t,
      });
      if (tx) {
        const updatePayload: any = {};
        if (data.baseTransactionAttrs.accountId)
          updatePayload.accountId = data.baseTransactionAttrs.accountId;
        if (data.baseTransactionAttrs.categoryId)
          updatePayload.categoryId = data.baseTransactionAttrs.categoryId;
        if (data.baseTransactionAttrs.amount !== undefined)
          updatePayload.amount = data.baseTransactionAttrs.amount;
        if (data.baseTransactionAttrs.type)
          updatePayload.type = data.baseTransactionAttrs.type;
        if (data.baseTransactionAttrs.description !== undefined)
          updatePayload.description = data.baseTransactionAttrs.description;
        if (data.baseTransactionAttrs.receipt !== undefined)
          updatePayload.receipt = data.baseTransactionAttrs.receipt;

        // 帳戶餘額沖銷與重算
        if (updatePayload.amount !== undefined || updatePayload.accountId) {
          const oldAccount = await Account.findOne({
            where: { id: tx.accountId, userId },
            transaction: t,
          });
          if (!oldAccount) throw new Error('Account not found');

          // 沖銷舊金額
          const revertType =
            tx.type === RootType.INCOME ? RootType.EXPENSE : RootType.INCOME;
          if (revertType === RootType.EXPENSE) {
            oldAccount.balance = Number(oldAccount.balance) - Number(tx.amount);
          } else {
            oldAccount.balance = Number(oldAccount.balance) + Number(tx.amount);
          }
          await oldAccount.save({ transaction: t });

          // 套用新金額到新帳戶（若帳戶有換就找新帳戶）
          const newAccountId = updatePayload.accountId ?? tx.accountId;
          const newAccount =
            newAccountId !== tx.accountId
              ? await Account.findOne({
                  where: { id: newAccountId, userId },
                  transaction: t,
                })
              : oldAccount;
          if (!newAccount) throw new Error('New account not found');

          const newType = updatePayload.type ?? tx.type;
          const newAmount = Number(updatePayload.amount ?? tx.amount);
          if (newType === RootType.INCOME) {
            newAccount.balance = Number(newAccount.balance) + newAmount;
          } else if (newType === RootType.EXPENSE) {
            newAccount.balance = Number(newAccount.balance) - newAmount;
          }
          await newAccount.save({ transaction: t });
        }

        await tx.update(updatePayload, { transaction: t });
      }
    }

    await t.commit();
    return template.toJSON();
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

// ---------------------------------------------------------------------------
// Cancel Template (B. 刪除整個週期)
// ---------------------------------------------------------------------------

export const cancelTemplateAndDeleteTransaction = async (
  templateId: string,
  userId: string,
  transactionId?: string,
) => {
  const t = await sequelize.transaction();
  try {
    const template = await RecurringTemplate.findOne({
      where: { id: templateId, userId },
      transaction: t,
    });
    if (!template) throw new Error('Template not found');

    // 沖銷帳戶餘額並刪除那筆 transaction
    if (transactionId) {
      const tx = await Transaction.findOne({
        where: { id: transactionId, userId },
        include: [{ model: TransactionExtra, as: 'transactionExtra' }],
        transaction: t,
      });
      if (tx) {
        const account = await Account.findOne({
          where: { id: tx.accountId, userId },
          transaction: t,
        });
        if (account) {
          const revertType =
            tx.type === RootType.INCOME ? RootType.EXPENSE : RootType.INCOME;
          if (revertType === RootType.EXPENSE) {
            account.balance = Number(account.balance) - Number(tx.amount);
          } else {
            account.balance = Number(account.balance) + Number(tx.amount);
          }
          await account.save({ transaction: t });
        }

        const extraId = tx.transactionExtraId;
        await tx.destroy({ transaction: t });
        if (extraId) {
          await TransactionExtra.destroy({
            where: { id: extraId },
            transaction: t,
          });
        }
      }
    }

    // 硬刪除 template
    await template.destroy({ transaction: t });

    await t.commit();
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

// ---------------------------------------------------------------------------
// Archive / Resume
// ---------------------------------------------------------------------------

export const archiveTemplate = async (templateId: string, userId: string) => {
  const template = await RecurringTemplate.findOne({
    where: { id: templateId, userId },
  });
  if (!template) throw new Error('Template not found');
  await template.update({ status: RecurringTemplateStatus.ARCHIVED });
  return template.toJSON();
};

export const resumeTemplate = async (templateId: string, userId: string) => {
  const template = await RecurringTemplate.findOne({
    where: { id: templateId, userId },
  });
  if (!template) throw new Error('Template not found');
  if (template.status !== RecurringTemplateStatus.ARCHIVED) {
    throw new Error('Only ARCHIVED templates can be resumed');
  }
  await template.update({ status: RecurringTemplateStatus.ACTIVE });
  return template.toJSON();
};

// ---------------------------------------------------------------------------
// Cancel templates by accountId (帳戶刪除/封存連鎖)
// ---------------------------------------------------------------------------

export const deleteTemplatesByAccountId = async (
  accountId: string,
  userId: string,
  dbTransaction?: any,
) => {
  await RecurringTemplate.destroy({
    where: {
      userId,
      status: {
        [Op.in]: [
          RecurringTemplateStatus.ACTIVE,
          RecurringTemplateStatus.ARCHIVED,
        ],
      },
      [Op.and]: sequelize.where(
        sequelize.cast(
          sequelize.json('baseTransactionAttrs.accountId'),
          'TEXT',
        ),
        accountId,
      ),
    },
    ...(dbTransaction ? { transaction: dbTransaction } : {}),
  });
};

export const archiveTemplatesByAccountId = async (
  accountId: string,
  userId: string,
  dbTransaction?: any,
) => {
  await RecurringTemplate.update(
    { status: RecurringTemplateStatus.ARCHIVED },
    {
      where: {
        userId,
        status: RecurringTemplateStatus.ACTIVE,
        [Op.and]: sequelize.where(
          sequelize.cast(
            sequelize.json('baseTransactionAttrs.accountId'),
            'TEXT',
          ),
          accountId,
        ),
      },
      ...(dbTransaction ? { transaction: dbTransaction } : {}),
    },
  );
};

// ---------------------------------------------------------------------------
// Process Recurring Templates (Cron Job 核心邏輯)
// ---------------------------------------------------------------------------

export const processRecurringTemplates = async () => {
  const today = format(new Date(), 'yyyy-MM-dd');

  // 找出所有 ACTIVE 且 nextExecutionDate <= 今天的 templates
  const templates = await RecurringTemplate.findAll({
    where: {
      status: RecurringTemplateStatus.ACTIVE,
      nextExecutionDate: { [Op.lte]: today },
    },
  });

  console.log(
    `[RecurringCron] Found ${templates.length} templates to process.`,
  );

  // 多幣別：快取 userId → 本位幣，避免逐筆查 User
  const baseCurrencyCache = new Map<string, string>();

  for (const template of templates) {
    const t = await sequelize.transaction();
    try {
      const attrs = template.baseTransactionAttrs;

      // 轉帳類型不適用週期交易，跳過並刪除
      if (attrs.type === RootType.OPERATE) {
        console.warn(
          `[RecurringCron] Template ${template.id} has OPERATE type, skipping and deleting.`,
        );
        await template.destroy({ transaction: t });
        await t.commit();
        continue;
      }

      // 先載入帳戶並解析多幣別 baseRate（帳戶幣別 → 本位幣 當日匯率）。
      // 外幣帳戶若沿用寫死的 baseRate 1 會落錯 base 快照；同幣或缺匯率時 fallback 1 並告警。
      const account = await Account.findByPk(attrs.accountId, {
        transaction: t,
      });
      if (!account)
        throw new Error(
          `Account ${attrs.accountId} not found for template ${template.id}`,
        );

      let baseCurrencyCode = baseCurrencyCache.get(template.userId);
      if (!baseCurrencyCode) {
        const user = await User.findByPk(template.userId, {
          attributes: ['baseCurrencyCode'],
          transaction: t,
        });
        baseCurrencyCode = (user as any)?.baseCurrencyCode || 'TWD';
        baseCurrencyCache.set(template.userId, baseCurrencyCode);
      }
      const accountCurrency = (account as any).currencyCode || baseCurrencyCode;
      let baseRate = 1;
      if (accountCurrency !== baseCurrencyCode) {
        const r = await getRate(
          accountCurrency,
          baseCurrencyCode,
          template.nextExecutionDate,
        );
        if (r == null) {
          console.warn(
            `[RecurringCron] 缺 ${accountCurrency}->${baseCurrencyCode} (${template.nextExecutionDate}) 匯率，template ${template.id} baseRate 暫用 1`,
          );
        } else {
          baseRate = r;
        }
      }

      // 建立 TransactionExtra（若有 extraAdd/extraMinus）
      let transactionExtraId: string | null = null;
      const extraAdd = Number(attrs.extraAdd || 0);
      const extraMinus = Number(attrs.extraMinus || 0);
      if (extraAdd !== 0 || extraMinus !== 0) {
        const extra = await TransactionExtra.create(
          {
            extraAdd,
            extraAddLabel: attrs.extraAddLabel || '折扣',
            extraMinus,
            extraMinusLabel: attrs.extraMinusLabel || '手續費',
            // 本位幣快照 = 原值 × baseRate（單幣 baseRate=1 時 = 原值）
            extraAddInBase: roundToBaseCurrency(extraAdd * baseRate),
            extraMinusInBase: roundToBaseCurrency(extraMinus * baseRate),
          },
          { transaction: t },
        );
        transactionExtraId = extra.id;
      }

      // currentOccurrence 還未 +1，所以這筆是第 currentOccurrence+1 筆
      const newSequence = template.currentOccurrence + 1;

      // 建立 Transaction（baseRate 驅動 model hook 算 amountInBase = amount × baseRate）
      await Transaction.create(
        {
          userId: template.userId,
          accountId: attrs.accountId,
          categoryId: attrs.categoryId,
          amount: attrs.amount,
          baseRate,
          type: attrs.type as RootType,
          description: attrs.description,
          date: template.nextExecutionDate,
          billingDate: template.nextExecutionDate,
          time: attrs.time || '00:00:00', // 使用者設定的時間，未設定則預設 00:00:00
          receipt: attrs.receipt,
          paymentFrequency: PaymentFrequency.RECURRING,
          transactionExtraId,
          recurringTemplateId: template.id,
          recurringSequence: newSequence,
          isReconciled: false,
        },
        { transaction: t },
      );

      // 更新帳戶餘額（account 已於上方載入）
      if (attrs.type === RootType.INCOME) {
        const net = Number(attrs.amount) - extraMinus + extraAdd;
        account.balance = Number(account.balance) + net;
      } else if (attrs.type === RootType.EXPENSE) {
        const net = Number(attrs.amount) + extraMinus - extraAdd;
        account.balance = Number(account.balance) - net;
      }
      await account.save({ transaction: t });

      // 計算下次執行日期
      const nextDate = calcNextExecutionDate(
        parseISO(template.nextExecutionDate),
        template.frequency,
        {
          dayOfMonth: template.dayOfMonth,
          dayOfWeek: template.dayOfWeek,
          monthDay: template.monthDay,
        },
      );

      const newOccurrence = newSequence;
      const isCompleted =
        template.totalOccurrences !== null &&
        newOccurrence >= template.totalOccurrences;

      await template.update(
        {
          currentOccurrence: newOccurrence,
          nextExecutionDate: nextDate,
          status: isCompleted
            ? RecurringTemplateStatus.COMPLETED
            : RecurringTemplateStatus.ACTIVE,
        },
        { transaction: t },
      );

      await t.commit();
      console.log(
        `[RecurringCron] Template ${template.id} processed. Occurrence ${newOccurrence}/${template.totalOccurrences ?? '∞'}`,
      );
    } catch (err) {
      await t.rollback();
      console.error(
        `[RecurringCron] Failed to process template ${template.id}:`,
        err,
      );
    }
  }
};

export default {
  calcNextExecutionDate,
  createTemplate,
  getTemplatesByUser,
  updateTemplateFutureAndTransaction,
  cancelTemplateAndDeleteTransaction,
  archiveTemplate,
  resumeTemplate,
  deleteTemplatesByAccountId,
  archiveTemplatesByAccountId,
  processRecurringTemplates,
};
