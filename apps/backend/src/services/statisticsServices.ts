import Transaction from '@/models/transaction';
import { MainType, OverviewTrendType, PeriodType } from '@repo/shared';
import { Op } from 'sequelize';

type TrendType = {
  amount: number;
  type: string;
  targetAccountId?: string;
};

const getOverviewTrend = async (body: any, userId: string) => {
  const { startDate, endDate } = body;
  const transactions = await Transaction.findAll({
    where: {
      userId,
      date: {
        [Op.between]: [startDate, endDate],
      },
    },
    raw: true,
    attributes: ['amount', 'type', 'targetAccountId'],
  });

  const result = transactions.reduce(
    (total, t) => {
      if (t.targetAccountId) {
        if (t.type === MainType.INCOME) {
          total.transferIn += Number(t.amount);
        } else if (t.type === MainType.EXPENSE) {
          total.transferOut += Number(t.amount);
        }
      } else if (t.type === MainType.INCOME) {
        total.income += Number(t.amount);
      } else if (t.type === MainType.EXPENSE) {
        total.expense += Number(t.amount);
      }
      return total;
    },
    {
      income: 0,
      expense: 0,
      transferIn: 0,
      transferOut: 0,
      balance: 0,
    }
  );

  result.balance =
    result.income - result.expense + result.transferIn - result.transferOut;

  return result;
};

export default {
  getOverviewTrend,
};
