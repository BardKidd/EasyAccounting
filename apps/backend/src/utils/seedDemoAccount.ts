import { v4 as uuidv4 } from 'uuid';
import {
  User,
  Account,
  Category,
  Transaction,
  InstallmentPlan,
  RecurringTemplate,
  CreditCardDetail,
} from '@/models';
import sequelize from '@/utils/postgres';
import { Op } from 'sequelize';
import chalk from 'chalk';
import {
  RootType,
  PaymentFrequency,
  InterestType,
  CalculationMethod,
  RemainderPlacement,
  RecurringFrequency,
  RecurringTemplateStatus,
  Account as AccountEnum,
} from '@repo/shared';

const args = process.argv.slice(2);
const userEmail = args[0];

if (!userEmail) {
  console.error(
    chalk.red(
      'Please provide the account email address. Example: npm run db:seed:demo -- user@example.com',
    ),
  );
  process.exit(1);
}

// 產生隨機日期的輔助函數
const generateRandomDate = (startDaysAgo: number, endDaysAgo: number) => {
  const start = new Date();
  start.setDate(start.getDate() - startDaysAgo);
  const end = new Date();
  end.setDate(end.getDate() - endDaysAgo);
  const date = new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime()),
  );
  return date.toISOString().split('T')[0];
};

const runSeed = async () => {
  const transaction = await sequelize.transaction();

  try {
    console.log(
      chalk.blue(
        `Initializing MAX RICH DEMO seeding for user: ${userEmail}...`,
      ),
    );

    // 1. 確認 User 存在
    const user = await User.findOne({ where: { email: userEmail } });
    if (!user) {
      console.error(chalk.red(`User with email ${userEmail} not found.`));
      process.exit(1);
    }
    const userId = user.id;

    // 清除舊有資料 (Teardown)
    console.log(chalk.yellow(`Clearing existing data for user: ${userEmail}...`));
    await Transaction.destroy({ where: { userId }, transaction, individualHooks: true });
    // 因為 Account cascading delete 應該會砍掉 CreditCardDetail，但手動補上保險
    // 但 CreditCardDetail 關聯的是 accountId 而非 userId，所以我們會透過 Account 去刪除
    await InstallmentPlan.destroy({ where: { userId }, transaction });
    await RecurringTemplate.destroy({ where: { userId }, transaction });
    await Account.destroy({ where: { userId }, transaction, individualHooks: true });
    await Category.destroy({ where: { userId }, transaction, individualHooks: true });
    console.log(chalk.green(`Old data cleared successfully. Building new seed...`));

    // 2. 建立多種 Account
    const demoBankId = uuidv4();
    const demoCashId = uuidv4();
    const demoCreditCardId = uuidv4();

    await Account.bulkCreate(
      [
        {
          id: demoBankId,
          userId,
          name: '台新薪轉戶 🏦',
          type: AccountEnum.BANK,
          balance: 155000,
          icon: 'building-columns',
          color: '#e74c3c',
          isArchived: false,
        },
        {
          id: demoCashId,
          userId,
          name: '日常錢包 💵',
          type: AccountEnum.CASH,
          balance: 4500,
          icon: 'wallet',
          color: '#f1c40f',
          isArchived: false,
        },
        {
          id: demoCreditCardId,
          userId,
          name: '國泰 CUBE 卡 💳',
          type: AccountEnum.CREDIT_CARD,
          balance: -24800,
          icon: 'credit-card',
          color: '#27ae60',
          isArchived: false,
        },
      ],
      { transaction },
    );

    // 2.1 建立信用卡的專屬設定 (CreditCardDetail)
    await CreditCardDetail.create(
      {
        id: uuidv4(),
        accountId: demoCreditCardId,
        creditLimit: 100000,
        statementDate: 25,
        paymentDueDate: 10,
        includeInTotal: true,
        isArchived: false,
      },
      { transaction },
    );

    // 3. 取得系統預設分類 或 建立專屬分類
    const targetCategories = [
      { name: '飲食', type: RootType.EXPENSE, icon: 'Utensils', color: '#FF7043' },
      { name: '交通', type: RootType.EXPENSE, icon: 'Car', color: '#42A5F5' },
      { name: '娛樂', type: RootType.EXPENSE, icon: 'PartyPopper', color: '#AB47BC' },
      {
        name: '生活用品',
        type: RootType.EXPENSE,
        icon: 'ShoppingBasket',
        color: '#81C784',
      },
      {
        name: '水電瓦斯',
        type: RootType.EXPENSE,
        icon: 'Zap',
        color: '#4DB6AC',
      },
      {
        name: '訂閱服務',
        type: RootType.EXPENSE,
        icon: 'RefreshCcw',
        color: '#EC407A',
      },
      { name: '卡費繳款', type: RootType.EXPENSE, icon: 'CreditCard', color: '#607D8B' },
      { name: '卡費回補', type: RootType.INCOME, icon: 'CreditCard', color: '#607D8B' },
      { name: '薪水', type: RootType.INCOME, icon: 'Banknote', color: '#66BB6A' },
      { name: '投資', type: RootType.INCOME, icon: 'TrendingUp', color: '#4DB6AC' },
    ];

    let categoryMap: Record<string, string> = {};
    for (const catData of targetCategories) {
      // 優先尋找系統預設 (userId: null) 或是使用者自己建的
      let cat = await Category.findOne({
        where: {
          name: catData.name,
          type: catData.type,
          [Op.or]: [{ userId: null as any }, { userId }],
        },
      });
      if (!cat) {
        cat = await Category.create({ ...catData, userId } as any, {
          transaction,
        });
      }
      categoryMap[catData.name] = cat.id;
    }

    // 4. 建立一筆分期付款 (InstallmentPlan)
    const installmentPlanId = uuidv4();
    await InstallmentPlan.create(
      {
        id: installmentPlanId,
        userId,
        totalAmount: 36000,
        totalInstallments: 6,
        startDate: generateRandomDate(60, 50),
        description: 'MacBook Air M3 分期',
        interestType: InterestType.NONE,
        calculationMethod: CalculationMethod.ROUND,
        remainderPlacement: RemainderPlacement.FIRST,
        gracePeriod: 0,
      },
      { transaction },
    );

    // 5. 建立週期性交易模板 (RecurringTemplate)
    const recurringNetflixId = uuidv4();
    const recurringGymId = uuidv4();

    await RecurringTemplate.bulkCreate(
      [
        {
          id: recurringNetflixId,
          userId,
          baseTransactionAttrs: {
            accountId: demoCreditCardId,
            categoryId: categoryMap['訂閱服務'],
            amount: 390,
            type: RootType.EXPENSE,
            description: 'Netflix 家庭方案',
            receipt: null,
            paymentFrequency: PaymentFrequency.RECURRING,
            time: '10:00:00',
          },
          frequency: RecurringFrequency.MONTHLY,
          dayOfMonth: 15,
          totalOccurrences: null as any,
          currentOccurrence: 5,
          nextExecutionDate: generateRandomDate(-5, -20),
          status: RecurringTemplateStatus.ACTIVE,
        },
        {
          id: recurringGymId,
          userId,
          baseTransactionAttrs: {
            accountId: demoCreditCardId,
            categoryId: categoryMap['娛樂'],
            amount: 1200,
            type: RootType.EXPENSE,
            description: '健身房月費',
            receipt: null,
            paymentFrequency: PaymentFrequency.RECURRING,
            time: '14:00:00',
          },
          frequency: RecurringFrequency.MONTHLY,
          dayOfMonth: 5,
          totalOccurrences: 12 as any,
          currentOccurrence: 3,
          nextExecutionDate: generateRandomDate(-10, -25),
          status: RecurringTemplateStatus.ACTIVE,
        },
      ],
      { transaction },
    );

    // 6. 大量產生交易紀錄資料
    const transactionsList: any[] = [];

    // (A) 每月固定薪水 (3個月的紀錄)
    for (let i = 0; i <= 2; i++) {
      const txDate = new Date();
      txDate.setMonth(txDate.getMonth() - i);
      txDate.setDate(5); // 5號發薪水
      const dateStr = txDate.toISOString().split('T')[0];

      transactionsList.push({
        id: uuidv4(),
        userId,
        accountId: demoBankId,
        categoryId: categoryMap['薪水'],
        amount: 65000 + Math.floor(Math.random() * 5000),
        type: RootType.INCOME,
        date: dateStr,
        billingDate: dateStr,
        time: '09:00:00',
        paymentFrequency: PaymentFrequency.ONE_TIME,
        description: `${txDate.getMonth() + 1}月薪資所得`,
      });
    }

    // (B) 每月固定週期性扣款紀錄 (手動塞入已扣款的歷史資料)
    for (let i = 1; i <= 3; i++) {
      const txDate1 = new Date();
      txDate1.setMonth(txDate1.getMonth() - i);
      txDate1.setDate(15);
      const txDate2 = new Date();
      txDate2.setMonth(txDate2.getMonth() - i);
      txDate2.setDate(5);

      transactionsList.push({
        id: uuidv4(),
        userId,
        accountId: demoCreditCardId,
        categoryId: categoryMap['訂閱服務'],
        amount: 390,
        type: RootType.EXPENSE,
        date: txDate1.toISOString().split('T')[0],
        billingDate: txDate1.toISOString().split('T')[0],
        time: '10:00:00',
        paymentFrequency: PaymentFrequency.RECURRING,
        description: 'Netflix 家庭方案',
        recurringTemplateId: recurringNetflixId,
      });
      transactionsList.push({
        id: uuidv4(),
        userId,
        accountId: demoCreditCardId,
        categoryId: categoryMap['娛樂'],
        amount: 1200,
        type: RootType.EXPENSE,
        date: txDate2.toISOString().split('T')[0],
        billingDate: txDate2.toISOString().split('T')[0],
        time: '14:00:00',
        paymentFrequency: PaymentFrequency.RECURRING,
        description: '健身房月費',
        recurringTemplateId: recurringGymId,
      });
    }

    // (C) MacBook 分期付款 (前3期)
    for (let i = 1; i <= 3; i++) {
      const txId = uuidv4();
      const txDate = new Date();
      txDate.setMonth(txDate.getMonth() - (3 - i));
      txDate.setDate(20);

      transactionsList.push({
        id: txId,
        userId,
        accountId: demoCreditCardId,
        categoryId: categoryMap['娛樂'],
        amount: 6000,
        type: RootType.EXPENSE,
        date: txDate.toISOString().split('T')[0],
        billingDate: txDate.toISOString().split('T')[0],
        time: '12:00:00',
        paymentFrequency: PaymentFrequency.INSTALLMENT,
        description: `MacBook Air M3 分期 (${i}/6)`,
        installmentPlanId,
      });
    }

    // (D) 隨機產生 60 筆生活開銷 (分散於90天內)
    const expenseDescriptions = {
      飲食: [
        '便利商店',
        '商業午餐',
        '路邊攤宵夜',
        '拉麵',
        '公司聚餐',
        '手搖飲',
        '週末早午餐',
        '咖啡廳',
      ],
      交通: ['捷運儲值', 'Uber', '加油', '計程車', '停車費', '高鐵票'],
      生活用品: [
        '全聯採買',
        '屈臣氏',
        '電商購物',
        '蝦皮購物',
        '五金行',
        '衛生紙儲備',
      ],
      水電瓦斯: ['電費帳單', '水費繳納', '瓦斯費'],
      娛樂: ['電影院', 'KTV', 'Steam 遊戲', '展覽門票'],
    };

    const expenseCategories = Object.keys(expenseDescriptions);

    for (let i = 0; i < 60; i++) {
      // 隨機抽選類別與敘述
      const catName =
        expenseCategories[Math.floor(Math.random() * expenseCategories.length)];
      const descList =
        expenseDescriptions[catName as keyof typeof expenseDescriptions];
      const desc = descList[Math.floor(Math.random() * descList.length)];

      const categoryId = categoryMap[catName];
      let amount = 0;

      // 依照類別給定不同等級的金額
      if (catName === '飲食') amount = 100 + Math.floor(Math.random() * 1000);
      else if (catName === '交通')
        amount = 30 + Math.floor(Math.random() * 1500);
      else if (catName === '生活用品')
        amount = 300 + Math.floor(Math.random() * 3000);
      else if (catName === '水電瓦斯')
        amount = 500 + Math.floor(Math.random() * 2000);
      else amount = 500 + Math.floor(Math.random() * 4000);

      const accId = Math.random() > 0.6 ? demoCashId : demoCreditCardId;

      const txDate = generateRandomDate(90, 0); // 過去 90 天到今天之間
      const h = Math.floor(Math.random() * (23 - 8) + 8);
      const m = Math.floor(Math.random() * 59);
      const s = Math.floor(Math.random() * 59);
      const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

      transactionsList.push({
        id: uuidv4(),
        userId,
        accountId: accId,
        categoryId,
        amount,
        type: RootType.EXPENSE,
        date: txDate,
        billingDate: txDate,
        time: timeStr,
        paymentFrequency: PaymentFrequency.ONE_TIME,
        description: desc,
      });
    }

    // (E) 每月固定的 3 次 ATM 提款 (約為轉帳交易)
    for (let i = 0; i < 3; i++) {
      const transferOutId = uuidv4();
      const transferInId = uuidv4();
      const transferDate = generateRandomDate(90, 0);

      transactionsList.push({
        id: transferOutId,
        userId,
        accountId: demoBankId,
        categoryId: categoryMap['生活用品'],
        amount: 5000,
        type: RootType.EXPENSE,
        date: transferDate,
        billingDate: transferDate,
        time: '15:30:00',
        paymentFrequency: PaymentFrequency.ONE_TIME,
        description: 'ATM 領現金',
        linkId: transferInId,
      });
      transactionsList.push({
        id: transferInId,
        userId,
        accountId: demoCashId,
        categoryId: categoryMap['生活用品'],
        amount: 5000,
        type: RootType.INCOME,
        date: transferDate,
        billingDate: transferDate,
        time: '15:30:00',
        paymentFrequency: PaymentFrequency.ONE_TIME,
        description: 'ATM 領現金',
        linkId: transferOutId,
      });
    }

    // (F) 新增一筆最近的「信用卡帳單繳款」對帳交易
    const ccPaymentOutId = uuidv4();
    const ccPaymentInId = uuidv4();
    const ccPaymentDate = generateRandomDate(15, 5); // 最近繳的

    transactionsList.push({
      id: ccPaymentOutId,
      userId,
      accountId: demoBankId,
      categoryId: categoryMap['卡費繳款'],
      amount: 18500,
      type: RootType.EXPENSE,
      date: ccPaymentDate,
      billingDate: ccPaymentDate,
      time: '11:00:00',
      paymentFrequency: PaymentFrequency.ONE_TIME,
      description: '繳納信用卡費',
      linkId: ccPaymentInId,
    });
    transactionsList.push({
      id: ccPaymentInId,
      userId,
      accountId: demoCreditCardId,
      categoryId: categoryMap['卡費回補'],
      amount: 18500,
      type: RootType.INCOME,
      date: ccPaymentDate,
      billingDate: ccPaymentDate,
      time: '11:00:00',
      paymentFrequency: PaymentFrequency.ONE_TIME,
      description: '繳納信用卡費',
      linkId: ccPaymentOutId,
    });

    // 將資料批次寫入
    await Transaction.bulkCreate(transactionsList, { transaction });

    await transaction.commit();
    console.log(
      chalk.green(
        `Successfully added ${transactionsList.length} rich demo transactions!`,
      ),
    );
    console.log(chalk.blue('Rich Demo Data seeding completed.'));
    process.exit(0);
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }
    console.error(chalk.red('Seeding failed:'), error);
    process.exit(1);
  }
};

runSeed();
