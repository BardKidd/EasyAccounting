'use strict';
const { v4: uuidv4 } = require('uuid');

// --- Helper Functions ---
const generateRandomDate = (startDaysAgo, endDaysAgo) => {
  const start = new Date();
  start.setDate(start.getDate() - startDaysAgo);
  const end = new Date();
  end.setDate(end.getDate() - endDaysAgo);
  const date = new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
  return date.toISOString().split('T')[0];
};

const randomTime = () => {
  const h = Math.floor(Math.random() * (23 - 8) + 8);
  const m = Math.floor(Math.random() * 59);
  const s = Math.floor(Math.random() * 59);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = 'accounting';
    const userEmail = process.env.TEST_USER_EMAIL;
    if (!userEmail) return;

    // 1. Get User
    const users = await queryInterface.sequelize.query(
      `SELECT id FROM accounting.user WHERE email = '${userEmail}' LIMIT 1;`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    if (users.length === 0) return;
    const userId = users[0].id;
    const now = new Date();

    // 2. Get Accounts
    const accounts = await queryInterface.sequelize.query(
      `SELECT id, name, type FROM accounting.account WHERE "userId" = '${userId}';`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const bankAccount = accounts.find((a) => a.type === '銀行');
    const cashAccount = accounts.find((a) => a.type === '現金');
    const creditCardAccount = accounts.find((a) => a.type === '信用卡');

    if (!bankAccount || !cashAccount) {
      console.warn('Skipping Transaction Seeder: Required accounts not found.');
      return;
    }

    // 3. Get Category IDs - try system default first, then user-created
    const categories = await queryInterface.sequelize.query(
      `SELECT id, name, type FROM accounting.category
       WHERE ("userId" IS NULL OR "userId" = '${userId}');`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const getCatId = (name) => categories.find((c) => c.name === name)?.id;

    // Build category map - create missing ones as user-owned
    const requiredCategories = [
      { name: '飲食', type: '支出' },
      { name: '交通', type: '支出' },
      { name: '娛樂', type: '支出' },
      { name: '生活用品', type: '支出' },
      { name: '水電瓦斯', type: '支出' },
      { name: '訂閱服務', type: '支出' },
      { name: '薪水', type: '收入' },
    ];

    const categoryMap = {};
    for (const cat of requiredCategories) {
      let id = getCatId(cat.name);
      if (!id) {
        const newId = uuidv4();
        await queryInterface.bulkInsert(
          { schema, tableName: 'category' },
          [
            {
              id: newId,
              name: cat.name,
              type: cat.type,
              parentId: null,
              userId,
              icon: 'category',
              color: '#9E9E9E',
              createdAt: now,
              updatedAt: now,
            },
          ],
          {}
        );
        id = newId;
      }
      categoryMap[cat.name] = id;
    }

    const demoBankId = bankAccount.id;
    const demoCashId = cashAccount.id;
    const demoCreditCardId = creditCardAccount?.id || demoBankId;

    // 4. 建立分期付款主檔
    const installmentPlanId = uuidv4();
    await queryInterface.bulkInsert(
      { schema, tableName: 'installment_plan' },
      [
        {
          id: installmentPlanId,
          userId,
          totalAmount: 36000,
          totalInstallments: 6,
          startDate: generateRandomDate(60, 50),
          description: 'MacBook Air M3 分期',
          interestType: 'NONE',
          calculationMethod: 'ROUND',
          remainderPlacement: 'FIRST',
          gracePeriod: 0,
          createdAt: now,
          updatedAt: now,
        },
      ],
      {}
    );

    // 5. 建立週期性交易模板
    const recurringNetflixId = uuidv4();
    const recurringGymId = uuidv4();

    await queryInterface.bulkInsert(
      { schema, tableName: 'recurring_template' },
      [
        {
          id: recurringNetflixId,
          userId,
          baseTransactionAttrs: JSON.stringify({
            accountId: demoCreditCardId,
            categoryId: categoryMap['訂閱服務'],
            amount: 390,
            type: '支出',
            description: 'Netflix 家庭方案',
            receipt: null,
            paymentFrequency: '週期',
            time: '10:00:00',
          }),
          frequency: 'MONTHLY',
          dayOfMonth: 15,
          totalOccurrences: null,
          currentOccurrence: 5,
          nextExecutionDate: generateRandomDate(-5, -20),
          status: 'ACTIVE',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: recurringGymId,
          userId,
          baseTransactionAttrs: JSON.stringify({
            accountId: demoCreditCardId,
            categoryId: categoryMap['娛樂'],
            amount: 1200,
            type: '支出',
            description: '健身房月費',
            receipt: null,
            paymentFrequency: '週期',
            time: '14:00:00',
          }),
          frequency: 'MONTHLY',
          dayOfMonth: 5,
          totalOccurrences: 12,
          currentOccurrence: 3,
          nextExecutionDate: generateRandomDate(-10, -25),
          status: 'ACTIVE',
          createdAt: now,
          updatedAt: now,
        },
      ],
      {}
    );

    // 6. 建立交易紀錄
    const transactions = [];

    // (A) 每月固定薪水 (3個月)
    for (let i = 0; i <= 2; i++) {
      const txDate = new Date();
      txDate.setMonth(txDate.getMonth() - i);
      txDate.setDate(5);
      const dateStr = txDate.toISOString().split('T')[0];

      transactions.push({
        id: uuidv4(),
        userId,
        accountId: demoBankId,
        categoryId: categoryMap['薪水'],
        amount: 65000 + Math.floor(Math.random() * 5000),
        type: '收入',
        date: dateStr,
        billingDate: dateStr,
        time: '09:00:00',
        paymentFrequency: '單次',
        isReconciled: false,
        description: `${txDate.getMonth() + 1}月薪資所得`,
        createdAt: now,
        updatedAt: now,
      });
    }

    // (B) 週期性扣款歷史紀錄
    for (let i = 1; i <= 3; i++) {
      const txDate1 = new Date();
      txDate1.setMonth(txDate1.getMonth() - i);
      txDate1.setDate(15);
      const txDate2 = new Date();
      txDate2.setMonth(txDate2.getMonth() - i);
      txDate2.setDate(5);

      transactions.push({
        id: uuidv4(),
        userId,
        accountId: demoCreditCardId,
        categoryId: categoryMap['訂閱服務'],
        amount: 390,
        type: '支出',
        date: txDate1.toISOString().split('T')[0],
        billingDate: txDate1.toISOString().split('T')[0],
        time: '10:00:00',
        paymentFrequency: '週期',
        isReconciled: false,
        description: 'Netflix 家庭方案',
        recurringTemplateId: recurringNetflixId,
        createdAt: now,
        updatedAt: now,
      });
      transactions.push({
        id: uuidv4(),
        userId,
        accountId: demoCreditCardId,
        categoryId: categoryMap['娛樂'],
        amount: 1200,
        type: '支出',
        date: txDate2.toISOString().split('T')[0],
        billingDate: txDate2.toISOString().split('T')[0],
        time: '14:00:00',
        paymentFrequency: '週期',
        isReconciled: false,
        description: '健身房月費',
        recurringTemplateId: recurringGymId,
        createdAt: now,
        updatedAt: now,
      });
    }

    // (C) MacBook 分期付款 (前3期)
    for (let i = 1; i <= 3; i++) {
      const txDate = new Date();
      txDate.setMonth(txDate.getMonth() - (3 - i));
      txDate.setDate(20);

      transactions.push({
        id: uuidv4(),
        userId,
        accountId: demoCreditCardId,
        categoryId: categoryMap['娛樂'],
        amount: 6000,
        type: '支出',
        date: txDate.toISOString().split('T')[0],
        billingDate: txDate.toISOString().split('T')[0],
        time: '12:00:00',
        paymentFrequency: '分期',
        isReconciled: false,
        description: `MacBook Air M3 分期 (${i}/6)`,
        installmentPlanId,
        createdAt: now,
        updatedAt: now,
      });
    }

    // (D) 60 筆隨機生活開銷
    const expenseDescriptions = {
      飲食: ['便利商店', '商業午餐', '路邊攤宵夜', '拉麵', '公司聚餐', '手搖飲', '週末早午餐', '咖啡廳'],
      交通: ['捷運儲值', 'Uber', '加油', '計程車', '停車費', '高鐵票'],
      生活用品: ['全聯採買', '屈臣氏', '電商購物', '蝦皮購物', '五金行', '衛生紙儲備'],
      水電瓦斯: ['電費帳單', '水費繳納', '瓦斯費'],
      娛樂: ['電影院', 'KTV', 'Steam 遊戲', '展覽門票'],
    };

    const expenseCategories = Object.keys(expenseDescriptions);

    for (let i = 0; i < 60; i++) {
      const catName = expenseCategories[Math.floor(Math.random() * expenseCategories.length)];
      const descList = expenseDescriptions[catName];
      const desc = descList[Math.floor(Math.random() * descList.length)];
      const categoryId = categoryMap[catName];

      let amount = 0;
      if (catName === '飲食') amount = 100 + Math.floor(Math.random() * 1000);
      else if (catName === '交通') amount = 30 + Math.floor(Math.random() * 1500);
      else if (catName === '生活用品') amount = 300 + Math.floor(Math.random() * 3000);
      else if (catName === '水電瓦斯') amount = 500 + Math.floor(Math.random() * 2000);
      else amount = 500 + Math.floor(Math.random() * 4000);

      const accId = Math.random() > 0.6 ? demoCashId : demoCreditCardId;
      const txDate = generateRandomDate(90, 0);

      transactions.push({
        id: uuidv4(),
        userId,
        accountId: accId,
        categoryId,
        amount,
        type: '支出',
        date: txDate,
        billingDate: txDate,
        time: randomTime(),
        paymentFrequency: '單次',
        isReconciled: false,
        description: desc,
        createdAt: now,
        updatedAt: now,
      });
    }

    // (E) ATM 提款轉帳 (3 筆)
    for (let i = 0; i < 3; i++) {
      const transferOutId = uuidv4();
      const transferInId = uuidv4();
      const transferDate = generateRandomDate(90, 0);

      transactions.push({
        id: transferOutId,
        userId,
        accountId: demoBankId,
        categoryId: categoryMap['生活用品'],
        amount: 5000,
        type: '支出',
        date: transferDate,
        billingDate: transferDate,
        time: '15:30:00',
        paymentFrequency: '單次',
        isReconciled: false,
        description: 'ATM 領現金',
        linkId: transferInId,
        createdAt: now,
        updatedAt: now,
      });
      transactions.push({
        id: transferInId,
        userId,
        accountId: demoCashId,
        categoryId: categoryMap['生活用品'],
        amount: 5000,
        type: '收入',
        date: transferDate,
        billingDate: transferDate,
        time: '15:30:00',
        paymentFrequency: '單次',
        isReconciled: false,
        description: 'ATM 領現金',
        linkId: transferOutId,
        createdAt: now,
        updatedAt: now,
      });
    }

    await queryInterface.bulkInsert(
      { schema, tableName: 'transaction' },
      transactions,
      {}
    );
  },

  async down(queryInterface, Sequelize) {
    const userEmail = process.env.TEST_USER_EMAIL;
    if (!userEmail) return;

    const users = await queryInterface.sequelize.query(
      `SELECT id FROM accounting.user WHERE email = '${userEmail}' LIMIT 1;`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (users.length > 0) {
      const userId = users[0].id;

      // 刪除交易
      await queryInterface.bulkDelete(
        { schema: 'accounting', tableName: 'transaction' },
        { userId },
        {}
      );

      // 刪除週期性模板
      await queryInterface.bulkDelete(
        { schema: 'accounting', tableName: 'recurring_template' },
        { userId },
        {}
      );

      // 刪除分期主檔
      await queryInterface.bulkDelete(
        { schema: 'accounting', tableName: 'installment_plan' },
        { userId },
        {}
      );

      // 刪除此 seeder 建立的 user-owned 分類
      await queryInterface.bulkDelete(
        { schema: 'accounting', tableName: 'category' },
        { userId },
        {}
      );
    }
  },
};
