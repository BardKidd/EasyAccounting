import Transaction from '@/models/transaction';
import Category from '@/models/category';
import Account from '@/models/account';
import TransactionExtra from '@/models/TransactionExtra';
import { CategoryTabDataType, RootType } from '@repo/shared';
import { Op, QueryTypes } from 'sequelize';
import sequelize from '@/utils/postgres';
import { eachMonthOfInterval, format } from 'date-fns';
import { EachMonthNetFlow, FinalResult } from '@repo/shared';

const getOverviewTrend = async (body: any, userId: string) => {
  const { startDate, endDate } = body;
  const transactions = await Transaction.findAll({
    where: {
      userId,
      date: {
        [Op.between]: [startDate, endDate],
      },
    },
    attributes: ['amount', 'type', 'targetAccountId'],
    include: [
      {
        model: TransactionExtra,
        as: 'transactionExtra',
      },
    ],
    raw: true,
    nest: true,
  });

  const result = transactions.reduce(
    (total, t: any) => {
      const data = t;
      const amount = Number(data.amount);
      const extraAdd = Number(data.transactionExtra?.extraAdd || 0);
      const extraMinus = Number(data.transactionExtra?.extraMinus || 0);

      if (data.targetAccountId) {
        if (data.type === RootType.INCOME) {
          total.transferIn += amount;
        } else if (data.type === RootType.EXPENSE) {
          total.transferOut += amount + extraMinus - extraAdd;
        }
      } else if (data.type === RootType.INCOME) {
        total.income += amount - extraMinus + extraAdd;
      } else if (data.type === RootType.EXPENSE) {
        total.expense += amount + extraMinus - extraAdd;
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

const getOverviewTop3Categories = async (body: any, userId: string) => {
  const { startDate, endDate } = body;
  //! 這個 sequelize 的寫法是正確的，但我暫時還不太能完全意會，所以還是先用下面的 SQL 語法比較容易看種
  // const transactions = await Transaction.findAll({
  //   where: {
  //     userId,
  //     date: {
  //       [Op.between]: [startDate, endDate],
  //     },
  //     // 防止 SQL 判斷為 false 值導致永遠撈不出來所以改這個寫法
  //     targetAccountId: {
  //       [Op.is]: null,
  //     },
  //     type: RootType.EXPENSE,
  //   },
  //   raw: true,
  //   nest: true, // 直接將 'category.xxx' 攤開成 category 物件包屬性。
  //   limit: 3,
  //   // SQL 的 join
  //   include: [
  //     {
  //       model: Category, // <- 第一層
  //       attributes: [], // 我們不需要直接選取 category 的欄位，因為我們要在 attributes 裡用 CASE WHEN 決定
  //       include: [
  //         {
  //           model: Category, // <- 第二層
  //           as: 'parent',
  //           attributes: [], // 同上
  //         },
  //       ],
  //     },
  //   ],
  //   attributes: [
  //     [
  //       sequelize.literal(
  //         'CASE WHEN "category->parent"."parentId" IS NOT NULL THEN "category->parent"."id" ELSE "category"."id" END'
  //       ),
  //       'categoryId',
  //     ],
  //     [
  //       sequelize.literal(
  //         'CASE WHEN "category->parent"."parentId" IS NOT NULL THEN "category->parent"."name" ELSE "category"."name" END'
  //       ),
  //       'categoryName',
  //     ],
  //     [
  //       sequelize.literal(
  //         'CASE WHEN "category->parent"."parentId" IS NOT NULL THEN "category->parent"."color" ELSE "category"."color" END'
  //       ),
  //       'categoryColor',
  //     ],
  //     [
  //       sequelize.literal(
  //         'CASE WHEN "category->parent"."parentId" IS NOT NULL THEN "category->parent"."icon" ELSE "category"."icon" END'
  //       ),
  //       'categoryIcon',
  //     ],
  //     [sequelize.fn('SUM', sequelize.col('amount')), 'amount'],
  //   ],
  //   group: [
  //     sequelize.literal(
  //       'CASE WHEN "category->parent"."parentId" IS NOT NULL THEN "category->parent"."id" ELSE "category"."id" END'
  //     ) as any,
  //     sequelize.literal(
  //       'CASE WHEN "category->parent"."parentId" IS NOT NULL THEN "category->parent"."name" ELSE "category"."name" END'
  //     ) as any,
  //     sequelize.literal(
  //       'CASE WHEN "category->parent"."parentId" IS NOT NULL THEN "category->parent"."color" ELSE "category"."color" END'
  //     ) as any,
  //     sequelize.literal(
  //       'CASE WHEN "category->parent"."parentId" IS NOT NULL THEN "category->parent"."icon" ELSE "category"."icon" END'
  //     ) as any,
  //   ],
  //   order: [[sequelize.col('amount'), 'DESC']],
  // });

  // 整理回傳格式以符合前端需求
  const result = await sequelize.query(
    `
    SELECT 
      CASE
        WHEN "MC"."parentId" IS NOT NULL THEN "MC"."id"
        ELSE "SC"."id"
      END AS "categoryId",
      CASE
        WHEN "MC"."parentId" IS NOT NULL THEN "MC"."name"
        ELSE "SC"."name"
      END AS "categoryName",
      CASE
        WHEN "MC"."parentId" IS NOT NULL THEN "MC"."color"
        ELSE "SC"."color"
      END AS "categoryColor",
      CASE
        WHEN "MC"."parentId" IS NOT NULL THEN "MC"."icon"
        ELSE "SC"."icon"
      END AS "categoryIcon",
      SUM("t"."amount" + COALESCE("te"."extraMinus", 0) - COALESCE("te"."extraAdd", 0)) AS "amount"
    FROM "accounting"."transaction" AS "t"
    -- 連接到子類別(SubCategory)
    LEFT OUTER JOIN "accounting"."category" AS "SC"
      ON "t"."categoryId" = "SC"."id"
    -- 連接到父類別(MainCategory)
    LEFT OUTER JOIN "accounting"."category" AS "MC"
      ON "SC"."parentId" = "MC"."id"
    -- 連接到額外金額
    LEFT OUTER JOIN "accounting"."transaction_extra" AS "te"
      ON "t"."transactionExtraId" = "te"."id"
    WHERE "t"."userId" = :userId
    AND "t"."date" BETWEEN :startDate AND :endDate
    AND "t"."targetAccountId" IS NULL
    AND "t"."type" = :type
    AND "t"."deletedAt" IS NULL
    -- 這裡會比 SELECT 還早做，所以可以當成這裡先抓內容，SELECT 則是命名
    GROUP BY 
      CASE
        WHEN "MC"."parentId" IS NOT NULL THEN "MC"."id"
        ELSE "SC"."id"
      END,
      CASE
        WHEN "MC"."parentId" IS NOT NULL THEN "MC"."name"
        ELSE "SC"."name"
      END,
      CASE
        WHEN "MC"."parentId" IS NOT NULL THEN "MC"."color"
        ELSE "SC"."color"
      END,
      CASE
        WHEN "MC"."parentId" IS NOT NULL THEN "MC"."icon"
        ELSE "SC"."icon"
      END
    ORDER BY "amount" DESC
    LIMIT 3
    `,
    {
      replacements: {
        userId,
        startDate,
        endDate,
        type: RootType.EXPENSE,
      },
      type: QueryTypes.SELECT, // 沒寫這個的話會需要改成 const [result]，因為除了 result 外還會有其他資料。
    }
  );

  return result.map((t: any) => ({
    categoryId: t.categoryId,
    amount: t.amount,
    category: {
      id: t.categoryId,
      name: t.categoryName,
      color: t.categoryColor,
      icon: t.categoryIcon,
    },
  }));
};

const getOverviewTop3Expenses = async (body: any, userId: string) => {
  const { startDate, endDate } = body;

  const transactions = await Transaction.findAll({
    where: {
      userId,
      date: {
        [Op.between]: [startDate, endDate],
      },
      targetAccountId: {
        [Op.is]: null,
      },
      type: RootType.EXPENSE,
    },
    limit: 3,
    attributes: [
      'categoryId',
      'amount',
      'id',
      'date',
      'description',
      'type',
      'transactionExtraId',
    ],
    include: [
      {
        model: Category,
        attributes: ['name', 'icon', 'id'],
      },
      {
        model: TransactionExtra,
        as: 'transactionExtra',
      },
    ],
    order: [[sequelize.col('amount'), 'DESC']],
  });

  return transactions.map((t: any) => {
    const data = t;
    const amount = Number(data.amount);
    const extraAdd = Number(data.transactionExtra?.extraAdd || 0);
    const extraMinus = Number(data.transactionExtra?.extraMinus || 0);

    return {
      ...data,
      amount: amount + extraMinus - extraAdd,
    };
  });
};

const getDetailTabData = async (body: any, userId: string) => {
  const { startDate, endDate } = body;

  const detailData = await Transaction.findAll({
    where: {
      userId,
      date: {
        [Op.between]: [startDate, endDate],
      },
    },
    attributes: [
      'id',
      'amount',
      'date',
      'time',
      'description',
      'type',
      'targetAccountId',
      'transactionExtraId',
    ],
    include: [
      {
        model: TransactionExtra,
        as: 'transactionExtra',
      },
      {
        // 需要向上對比
        model: Category,
        attributes: ['name', 'icon', 'id', 'color'],
        include: [
          {
            model: Category,
            as: 'parent',
            attributes: ['name', 'icon', 'id', 'color'],
          },
        ],
      },
      {
        model: Account,
        attributes: ['name'],
      },
      {
        model: Account,
        as: 'targetAccount',
        attributes: ['name'],
      },
    ],
    order: [
      [sequelize.col('date'), 'DESC'],
      [sequelize.col('time'), 'DESC'],
    ],
    raw: true,
    nest: true,
  });

  return detailData.map((item: any) => {
    const data = item;
    return {
      ...data,
      category: {
        id: data.category.id,
        name: data.category.name,
        color: data.category.color || data.category.parent?.color,
        icon: data.category.icon || data.category.parent?.icon,
      },
      targetAccountName: data.targetAccount?.name,
    };
  });
};

const getCategoryTabData = async (
  body: any,
  userId: string
): Promise<CategoryTabDataType[]> => {
  const { startDate, endDate } = body;

  const result = await sequelize.query(
    `
    SELECT
      CASE
        WHEN "mc"."parentId" IS NOT NULL THEN "mc"."id"
        ELSE "sc"."id"
      END AS "id",
      CASE
        WHEN "mc"."parentId" IS NOT NULL THEN "mc"."name"
        ELSE "sc"."name"
      END AS "name",
      CASE
        WHEN "mc"."parentId" IS NOT NULL THEN "mc"."icon"
        ELSE "sc"."icon"
      END AS "icon",
      CASE
        WHEN "mc"."parentId" IS NOT NULL THEN "mc"."color"
        ELSE "sc"."color"
      END AS "color",
      CASE 
        WHEN "t"."targetAccountId" IS NOT NULL THEN true 
        ELSE false 
      END AS "isTransfer",
      "t"."type",
      SUM(
        CASE
          WHEN "t"."type" = '支出' THEN ("t"."amount" + COALESCE("te"."extraMinus", 0) - COALESCE("te"."extraAdd", 0))
          WHEN "t"."type" = '收入' THEN ("t"."amount" - COALESCE("te"."extraMinus", 0) + COALESCE("te"."extraAdd", 0))
          ELSE "t"."amount"
        END
      )::integer AS "amount",
      COUNT("t"."id")::integer AS "count"
    FROM "accounting"."transaction" AS "t"
    LEFT JOIN "accounting"."category" AS "sc" ON "t"."categoryId" = "sc"."id"
    LEFT JOIN "accounting"."category" AS "mc" ON "sc"."parentId" = "mc"."id"
    LEFT JOIN "accounting"."transaction_extra" AS "te" ON "t"."transactionExtraId" = "te"."id"
    WHERE "t"."userId" = :userId
    AND "t"."date" BETWEEN :startDate AND :endDate
    AND "t"."deletedAt" IS NULL
    GROUP BY
      CASE
        WHEN "mc"."parentId" IS NOT NULL THEN "mc"."id"
        ELSE "sc"."id"
      END,
      CASE
        WHEN "mc"."parentId" IS NOT NULL THEN "mc"."name"
        ELSE "sc"."name"
      END,
      CASE
        WHEN "mc"."parentId" IS NOT NULL THEN "mc"."icon"
        ELSE "sc"."icon"
      END,
      CASE
        WHEN "mc"."parentId" IS NOT NULL THEN "mc"."color"
        ELSE "sc"."color"
      END,
      CASE 
        WHEN "t"."targetAccountId" IS NOT NULL THEN true 
        ELSE false 
      END,
      "t"."type"
  `,
    {
      replacements: {
        userId,
        startDate,
        endDate,
      },
      type: QueryTypes.SELECT,
    }
  );

  return result.map((item: any) => ({
    id: item.id,
    name: item.name,
    icon: item.icon,
    color: item.color,
    amount: item.amount,
    count: item.count,
    isTransfer: item.isTransfer,
    type: item.type,
  }));
};

const getRankingTabData = async (body: any, userId: string) => {
  const { startDate, endDate } = body;

  const result = await Transaction.findAll({
    where: {
      date: {
        [Op.between]: [startDate, endDate],
      },
      userId,
    },
    attributes: [
      'id',
      'amount',
      'description',
      'type',
      'targetAccountId',
      'transactionExtraId',
    ],
    include: [
      {
        model: TransactionExtra,
        as: 'transactionExtra',
      },
      {
        model: Category,
        attributes: ['id', 'name', 'icon', 'color'],
        include: [
          {
            model: Category,
            as: 'parent',
            attributes: ['name', 'icon', 'id', 'color'],
          },
        ],
      },
    ],
    order: [[sequelize.col('amount'), 'DESC']],
    raw: true,
    nest: true,
  });

  return result.map((t: any) => {
    const data = t;
    const amount = Number(data.amount);
    const extraAdd = Number(data.transactionExtra?.extraAdd || 0);
    const extraMinus = Number(data.transactionExtra?.extraMinus || 0);

    let netAmount = amount;
    if (data.type === RootType.INCOME) {
      netAmount = amount - extraMinus + extraAdd;
    } else if (data.type === RootType.EXPENSE) {
      netAmount = amount + extraMinus - extraAdd;
    }

    return {
      id: data.id,
      amount: netAmount,
      description: data.description,
      type: data.type,
      isTransfer: !!data.targetAccountId,
      categoryId: data.category.id,
      categoryName: data.category.name,
      categoryIcon: data.category.parent?.icon || data.category.icon,
      categoryColor: data.category.parent?.color || data.category.color,
    };
  });
};

const getAccountTabData = async (body: any, userId: string) => {
  const { startDate, endDate } = body;

  const result = await sequelize.query(
    `
    SELECT
      CASE
        WHEN "t"."targetAccountId" IS NOT NULL THEN true
        ELSE false
      END AS "isTransfer",
      "a"."name",
      "a"."color",
      "a"."type",
      "a"."icon",
      "a"."id",
      "t"."type",
      SUM(
        CASE
          WHEN "t"."type" = '支出' THEN ("t"."amount" + COALESCE("te"."extraMinus", 0) - COALESCE("te"."extraAdd", 0))
          WHEN "t"."type" = '收入' THEN ("t"."amount" - COALESCE("te"."extraMinus", 0) + COALESCE("te"."extraAdd", 0))
          ELSE "t"."amount"
        END
      )::integer AS "amount",
      COUNT("t"."id")::integer AS "count"
    FROM "accounting"."transaction" AS "t"
    LEFT JOIN "accounting"."account" AS "a" ON "t"."accountId" = "a"."id"
    LEFT JOIN "accounting"."transaction_extra" AS "te" ON "t"."transactionExtraId" = "te"."id"
    WHERE "t"."userId" = :userId
    AND "t"."date" BETWEEN :startDate AND :endDate
    AND "t"."deletedAt" IS NULL
    GROUP BY
      CASE
        WHEN "t"."targetAccountId" IS NOT NULL THEN true
        ELSE false
      END,
      "a"."name",
      "a"."color",
      "a"."type",
      "a"."icon",
      "a"."id",
      "t"."type"
    ORDER BY "amount" DESC
    `,
    {
      replacements: {
        userId,
        startDate,
        endDate,
      },
      type: QueryTypes.SELECT,
    }
  );

  return result.map((item: any) => ({
    id: item.id,
    name: item.name,
    icon: item.icon,
    color: item.color,
    amount: item.amount,
    count: item.count,
    isTransfer: item.isTransfer,
    type: item.type,
  }));
};

const getAssetTrend = async (userId: string) => {
  const userDateRange: { startDate: string; endDate: string }[] =
    await sequelize.query(
      `
    SELECT 
      MIN("t"."date") AS "startDate"
    FROM "accounting"."transaction" AS "t"
    WHERE "t"."userId" = :userId
    `,
      {
        replacements: {
          userId,
        },
        type: QueryTypes.SELECT,
      }
    );

  if (userDateRange.length > 0 && userDateRange[0]?.startDate) {
    const startDate = userDateRange[0].startDate;
    const endDate = new Date(); // End date is always today

    const result: any[] = await sequelize.query(
      `
      SELECT 
        to_char("t"."date", 'YYYY') AS "year",
        to_char("t"."date", 'MM') AS "month",
        SUM(
          CASE
            WHEN "t"."type" = '支出' THEN ("t"."amount" + COALESCE("te"."extraMinus", 0) - COALESCE("te"."extraAdd", 0))
            ELSE 0
          END
        )::integer as "expense",
        SUM(
          CASE
            WHEN "t"."type" = '收入' THEN ("t"."amount" - COALESCE("te"."extraMinus", 0) + COALESCE("te"."extraAdd", 0))
            ELSE 0
          END
        )::integer as "income",
        SUM(
          CASE
            WHEN "t"."type" = '收入' THEN ("t"."amount" - COALESCE("te"."extraMinus", 0) + COALESCE("te"."extraAdd", 0))
            WHEN "t"."type" = '支出' THEN - ("t"."amount" + COALESCE("te"."extraMinus", 0) - COALESCE("te"."extraAdd", 0))
            ELSE 0
          END
        )::integer as net_flow
      FROM accounting."transaction" t 
      LEFT JOIN accounting."transaction_extra" te ON t."transactionExtraId" = te."id"
      WHERE "t"."userId" = :userId
      AND "t"."date" BETWEEN :startDate AND :endDate
      AND "t"."deletedAt" IS NULL
      GROUP BY
        year,
        month
      ORDER BY
        year ASC,
        month ASC;
      `,
      {
        type: QueryTypes.SELECT,
        replacements: {
          userId,
          startDate,
          endDate,
        },
      }
    );
    const sortedResult: EachMonthNetFlow[] = result.map((item) => ({
      ...item,
      netFlow: item?.net_flow,
    }));

    const balance = await Account.sum('balance', {
      where: { userId },
    });
    let currentBalance = Number(balance) || 0;

    const monthMap = new Map(
      sortedResult.map((item) => [`${item.year}-${item.month}`, item])
    );
    const timeRange = eachMonthOfInterval({
      start: new Date(startDate),
      end: endDate,
    }).reverse(); // 顛倒過來，因為我們要從最遠的逐漸倒推到最遠的日期，這樣才會知道現在逐漸往前到過去的所有資產變化

    const finalResult: FinalResult[] = [];
    for (const row of timeRange) {
      const formattedMonth = format(row, 'yyyy-MM');
      const record = monthMap.get(formattedMonth);
      let netFlow = 0;
      let income = 0;
      let expense = 0;

      if (record) {
        netFlow = Number(record.netFlow);
        income = Number(record.income);
        expense = Number(record.expense);
      }

      finalResult.push({
        year: `${row.getFullYear()}`,
        month: `${row.getMonth() + 1}`,
        netFlow,
        income,
        expense,
        balance: currentBalance,
      });

      // currentBalance 必須在最後面才減
      currentBalance = currentBalance - netFlow;
    }

    return finalResult.reverse(); // 在顛倒一次
  } else {
    return [];
  }
};

export default {
  getOverviewTrend,
  getOverviewTop3Expenses,
  getOverviewTop3Categories,
  getDetailTabData,
  getCategoryTabData,
  getRankingTabData,
  getAccountTabData,
  getAssetTrend,
};
