import Transaction from '@/models/transaction';
import Category from '@/models/category';
import Account from '@/models/account';
import { MainType, OverviewTrendType, PeriodType } from '@repo/shared';
import { Op, QueryTypes } from 'sequelize';
import sequelize from '@/utils/postgres';

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
  //     type: MainType.EXPENSE,
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
      SUM("t"."amount") AS "amount"
    FROM "accounting"."transaction" AS "t"
    -- 連接到子類別(SubCategory)
    LEFT OUTER JOIN "accounting"."category" AS "SC"
      ON "t"."categoryId" = "SC"."id"
    -- 連接到父類別(MainCategory)
    LEFT OUTER JOIN "accounting"."category" AS "MC"
      ON "SC"."parentId" = "MC"."id"
    WHERE "t"."userId" = :userId
    AND "t"."date" BETWEEN :startDate AND :endDate
    AND "t"."targetAccountId" IS NULL
    AND "t"."type" = :type
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
        type: MainType.EXPENSE,
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
      type: MainType.EXPENSE,
    },
    limit: 3,
    raw: true,
    nest: true,
    attributes: ['categoryId', 'amount', 'id', 'date', 'description'],
    include: [
      {
        model: Category,
        attributes: ['name', 'icon', 'id'],
      },
    ],
    order: [[sequelize.col('amount'), 'DESC']],
  });

  return transactions;
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
    raw: true,
    nest: true,
    attributes: [
      'id',
      'amount',
      'date',
      'time',
      'description',
      'type',
      'targetAccountId',
    ],
    include: [
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
  });

  return detailData.map((item: any) => ({
    ...item,
    category: {
      id: item.category.id,
      name: item.category.name,
      color: item.category.color || item.category.parent.color,
      icon: item.category.icon || item.category.parent.icon,
    },
    targetAccountName: item.targetAccount?.name,
  }));
};

export default {
  getOverviewTrend,
  getOverviewTop3Expenses,
  getOverviewTop3Categories,
  getDetailTabData,
};
