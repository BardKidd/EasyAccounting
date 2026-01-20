import { Account, CreditCardDetail } from '../models';
import { Account as AccountEnum, AccountType } from '@repo/shared';
import { getDate, addMonths, setDate, addDays } from 'date-fns';

/**
 * 檢查給定的帳戶 ID 是否屬於信用卡帳戶
 * @param accountId - 要檢查的帳戶 ID
 * @returns 如果帳戶是信用卡則回傳 true，否則回傳 false
 */
export const isCreditCardAccount = async (
  accountId: string
): Promise<boolean> => {
  const account = await Account.findByPk(accountId);
  if (!account) return false;
  return account.type === AccountEnum.CREDIT_CARD;
};

/**
 * 計算信用卡交易的結帳日與繳款截止日
 *
 * 邏輯說明：
 * 1. 入帳日 vs 交易日：
 *    雖然銀行通常以商家請款的「入帳日」為準，但為簡化使用者操作並符合直覺，
 *    本系統直接以「交易日」作為判斷基準。若有跨期需求，可透過「延至下期」功能調整。
 *
 * 2. 假日順延：
 *    若結帳日或繳款日遇假日，銀行通常會順延。
 *    本系統目前不處理假日順延邏輯，均以設定的固定日期為準。
 *
 * @param accountId - 信用卡帳戶 ID
 * @param transactionDate - 交易日期
 * @returns 包含 statementDate 和 paymentDueDate 的物件（Date 物件）。
 */
export const getCreditCardBillingDates = async (
  accountId: string,
  transactionDate: Date
): Promise<{ statementDate: Date; paymentDueDate: Date } | null> => {
  const account = await Account.findByPk(accountId, {
    include: [{ model: CreditCardDetail, as: 'credit_card_detail' }],
  });

  if (
    !account ||
    account.type !== AccountEnum.CREDIT_CARD ||
    !account.credit_card_detail
  ) {
    return null;
  }

  const {
    statementDate: statementDay,
    paymentDueDate: dueDay,
    gracePeriod,
  } = account.credit_card_detail;

  const txnDay = getDate(transactionDate);
  let statementDate = new Date(transactionDate);

  // 如果交易日晚於結帳日，則計入下個月的帳單
  if (txnDay > statementDay) {
    statementDate = addMonths(statementDate, 1);
  }

  // 設定結帳日
  // 若遇小月（如 2/30 -> 3/2），date-fns setDate 會自動進位，這部分暫保持此行為。
  // 若需嚴格處理（如 2/30 視為 2/28），可在此處擴充檢查邏輯。
  statementDate = setDate(statementDate, statementDay);

  // 計算繳款截止日
  // 邏輯：找出結帳日後的下一個「繳款日(dueDay)」，再加上寬限期。
  let dueDate = setDate(statementDate, dueDay);

  // 如果設定的繳款日(日) 小於或等於 結帳日(日)，代表繳款日通常是「下個月」。
  // 例如：結帳日 25 號，繳款日 5 號 -> 1/25 結帳，是為了繳 2/5 的款。
  // 或是：結帳日 25 號，繳款日 25 號 (極少見) -> 視為下個月 25 號。
  if (dueDay <= statementDay) {
    dueDate = addMonths(dueDate, 1);
  }

  // 加上寬限期 (Grace Period)
  if (gracePeriod) {
    dueDate = addDays(dueDate, gracePeriod);
  }

  return {
    statementDate,
    paymentDueDate: dueDate,
  };
};
