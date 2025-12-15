const { v4: uuidv4 } = require('uuid');

// 主類型:收入、支出、轉帳
const MainType = {
  INCOME: '收入',
  EXPENSE: '支出',
  OPERATE: '操作',
};

// 次類型(中間層分類)
const SubType = {
  // 支出類別
  FOOD: '飲食',
  TRANSPORTATION: '交通',
  ENTERTAINMENT: '娛樂',
  SHOPPING: '購物',
  PERSONAL: '個人',
  MEDICAL: '醫療',
  HOME: '家居',
  FAMILY: '家庭',
  LIVING: '生活',
  EDUCATION: '學習',

  // 收入類別
  SALARY: '薪水',
  BONUS: '獎金',
  INVESTMENT: '投資',
  REFUND: '還款',
  LOTTERY: '彩券',
  INTEREST: '利息',
  OTHER: '其他',
};

// 細項類型(最底層分類)
const DetailType = {
  // 飲食細項
  BREAKFAST: '早餐',
  LUNCH: '午餐',
  DINNER: '晚餐',
  SNACK: '點心',
  BEVERAGE: '飲料',
  ALCOHOL: '酒類',
  FRUIT: '水果',

  // 交通細項
  BUS: '公車',
  MRT: '捷運',
  TAXI: '計程車',
  TRAIN: '火車/高鐵',
  GAS: '加油',
  PARKING: '停車',
  TOLL: '過路費',
  MAINTENANCE: '維修保養',

  // 娛樂細項
  MOVIE: '電影',
  GAME: '遊戲',
  PARTY: '聚會',
  TRAVEL: '旅遊',
  MUSIC: '音樂',
  SUBSCRIPTION: '訂閱服務',

  // 購物細項
  CLOTHING: '服飾',
  ELECTRONICS: '3C產品',
  GROCERIES: '生活用品',
  BEAUTY: '美妝保養',

  // 個人細項
  HAIRCUT: '剪髮',
  COSMETICS: '化妝品',
  GYM: '健身',

  // 醫療細項
  MEDICINE: '藥品',
  DOCTOR: '看診',
  INSURANCE: '保險',

  // 家居細項
  RENT: '房租',
  UTILITIES: '水電瓦斯',
  INTERNET: '網路費',

  // 家庭細項
  CHILD: '小孩',
  PET: '寵物',
  ELDER: '孝親費',

  // 生活細項
  PHONE: '電話費',

  // 學習細項
  BOOKS: '書籍',
  COURSE: '課程',
  TUITION: '學費',

  // 其他細項
  DONATION: '捐款',
  TAX: '稅金',
  FEE: '手續費',

  // 轉帳細項
  TRANSFER: '轉帳',
  WITHDRAWAL: '提款',
  DEPOSIT: '存款',
  RETURN: '退款',
  // EXCHANGE: '兌換',
};

const categories = [
  // 支出
  {
    name: MainType.EXPENSE,
    type: MainType.EXPENSE,
    icon: 'Wallet',
    color: '#ef4444',
    children: [
      {
        name: SubType.FOOD,
        type: MainType.EXPENSE,
        icon: 'Utensils',
        color: '#f87171',
        children: [
          {
            name: DetailType.BREAKFAST,
            type: MainType.EXPENSE,
            icon: 'Coffee',
          },
          { name: DetailType.LUNCH, type: MainType.EXPENSE, icon: 'Utensils' },
          {
            name: DetailType.DINNER,
            type: MainType.EXPENSE,
            icon: 'UtensilsCrossed',
          },
          { name: DetailType.SNACK, type: MainType.EXPENSE, icon: 'Cookie' },
          {
            name: DetailType.BEVERAGE,
            type: MainType.EXPENSE,
            icon: 'CupSoda',
          },
          { name: DetailType.ALCOHOL, type: MainType.EXPENSE, icon: 'Wine' },
          { name: DetailType.FRUIT, type: MainType.EXPENSE, icon: 'Apple' },
        ],
      },
      {
        name: SubType.TRANSPORTATION,
        type: MainType.EXPENSE,
        icon: 'Car',
        color: '#fb923c',
        children: [
          { name: DetailType.BUS, type: MainType.EXPENSE, icon: 'Bus' },
          { name: DetailType.MRT, type: MainType.EXPENSE, icon: 'Train' },
          {
            name: DetailType.TAXI,
            type: MainType.EXPENSE,
            icon: 'CarTaxiFront',
          },
          {
            name: DetailType.TRAIN,
            type: MainType.EXPENSE,
            icon: 'TrainFront',
          },
          { name: DetailType.GAS, type: MainType.EXPENSE, icon: 'Fuel' },
          {
            name: DetailType.PARKING,
            type: MainType.EXPENSE,
            icon: 'ParkingCircle',
          },
          { name: DetailType.TOLL, type: MainType.EXPENSE, icon: 'Ticket' },
          {
            name: DetailType.MAINTENANCE,
            type: MainType.EXPENSE,
            icon: 'Wrench',
          },
        ],
      },
      {
        name: SubType.ENTERTAINMENT,
        type: MainType.EXPENSE,
        icon: 'Gamepad2',
        color: '#fbbf24',
        children: [
          { name: DetailType.MOVIE, type: MainType.EXPENSE, icon: 'Film' },
          { name: DetailType.GAME, type: MainType.EXPENSE, icon: 'Gamepad2' },
          {
            name: DetailType.PARTY,
            type: MainType.EXPENSE,
            icon: 'PartyPopper',
          },
          { name: DetailType.TRAVEL, type: MainType.EXPENSE, icon: 'Plane' },
          { name: DetailType.MUSIC, type: MainType.EXPENSE, icon: 'Music' },
          {
            name: DetailType.SUBSCRIPTION,
            type: MainType.EXPENSE,
            icon: 'CreditCard',
          },
        ],
      },
      {
        name: SubType.SHOPPING,
        type: MainType.EXPENSE,
        icon: 'ShoppingBag',
        color: '#a3e635',
        children: [
          { name: DetailType.CLOTHING, type: MainType.EXPENSE, icon: 'Shirt' },
          {
            name: DetailType.ELECTRONICS,
            type: MainType.EXPENSE,
            icon: 'Smartphone',
          },
          {
            name: DetailType.GROCERIES,
            type: MainType.EXPENSE,
            icon: 'ShoppingBasket',
          },
          { name: DetailType.BEAUTY, type: MainType.EXPENSE, icon: 'Sparkles' },
        ],
      },
      {
        name: SubType.PERSONAL,
        type: MainType.EXPENSE,
        icon: 'User',
        color: '#34d399',
        children: [
          {
            name: DetailType.HAIRCUT,
            type: MainType.EXPENSE,
            icon: 'Scissors',
          },
          {
            name: DetailType.COSMETICS,
            type: MainType.EXPENSE,
            icon: 'SprayCan',
          },
          { name: DetailType.GYM, type: MainType.EXPENSE, icon: 'Dumbbell' },
        ],
      },
      {
        name: SubType.MEDICAL,
        type: MainType.EXPENSE,
        icon: 'Stethoscope',
        color: '#22d3ee',
        children: [
          { name: DetailType.MEDICINE, type: MainType.EXPENSE, icon: 'Pill' },
          {
            name: DetailType.DOCTOR,
            type: MainType.EXPENSE,
            icon: 'Stethoscope',
          },
          {
            name: DetailType.INSURANCE,
            type: MainType.EXPENSE,
            icon: 'ShieldCheck',
          },
        ],
      },
      {
        name: SubType.HOME,
        type: MainType.EXPENSE,
        icon: 'Home',
        color: '#818cf8',
        children: [
          { name: DetailType.RENT, type: MainType.EXPENSE, icon: 'Home' },
          { name: DetailType.UTILITIES, type: MainType.EXPENSE, icon: 'Zap' },
          { name: DetailType.INTERNET, type: MainType.EXPENSE, icon: 'Wifi' },
        ],
      },
      {
        name: SubType.FAMILY,
        type: MainType.EXPENSE,
        icon: 'Users',
        color: '#c084fc',
        children: [
          { name: DetailType.CHILD, type: MainType.EXPENSE, icon: 'Baby' },
          { name: DetailType.PET, type: MainType.EXPENSE, icon: 'PawPrint' },
          {
            name: DetailType.ELDER,
            type: MainType.EXPENSE,
            icon: 'HeartHandshake',
          },
        ],
      },
      {
        name: SubType.LIVING,
        type: MainType.EXPENSE,
        icon: 'Zap',
        color: '#f472b6',
        children: [
          { name: DetailType.PHONE, type: MainType.EXPENSE, icon: 'Phone' },
        ],
      },
      {
        name: SubType.EDUCATION,
        type: MainType.EXPENSE,
        icon: 'GraduationCap',
        color: '#fb7185',
        children: [
          { name: DetailType.BOOKS, type: MainType.EXPENSE, icon: 'Book' },
          {
            name: DetailType.COURSE,
            type: MainType.EXPENSE,
            icon: 'Presentation',
          },
          { name: DetailType.TUITION, type: MainType.EXPENSE, icon: 'School' },
        ],
      },
    ],
  },
  // 收入
  {
    name: MainType.INCOME,
    type: MainType.INCOME,
    icon: 'PiggyBank',
    color: '#10b981',
    children: [
      {
        name: SubType.SALARY,
        type: MainType.INCOME,
        icon: 'Banknote',
        color: '#34d399',
      },
      {
        name: SubType.BONUS,
        type: MainType.INCOME,
        icon: 'Gift',
        color: '#6ee7b7',
      },
      {
        name: SubType.INVESTMENT,
        type: MainType.INCOME,
        icon: 'TrendingUp',
        color: '#a7f3d0',
      },
      {
        name: SubType.REFUND,
        type: MainType.INCOME,
        icon: 'RefreshCcw',
        color: '#d1fae5',
      },
      {
        name: SubType.LOTTERY,
        type: MainType.INCOME,
        icon: 'Ticket',
        color: '#ecfdf5',
      },
      {
        name: SubType.INTEREST,
        type: MainType.INCOME,
        icon: 'Percent',
        color: '#047857',
      },
      {
        name: SubType.OTHER,
        type: MainType.INCOME,
        icon: 'MoreHorizontal',
        color: '#065f46',
        children: [
          { name: DetailType.DONATION, type: MainType.INCOME, icon: 'Heart' },
          { name: DetailType.TAX, type: MainType.INCOME, icon: 'FileText' },
          { name: DetailType.FEE, type: MainType.INCOME, icon: 'Receipt' },
        ],
      },
    ],
  },
  // 操作 (轉帳等)
  {
    name: MainType.OPERATE,
    type: MainType.OPERATE,
    icon: 'ArrowRightLeft',
    color: '#6366f1',
    children: [
      {
        name: DetailType.TRANSFER,
        type: MainType.OPERATE,
        icon: 'ArrowRightLeft',
        color: '#818cf8',
      },
      {
        name: DetailType.WITHDRAWAL,
        type: MainType.OPERATE,
        icon: 'ArrowUpFromLine',
        color: '#a5b4fc',
      },
      {
        name: DetailType.DEPOSIT,
        type: MainType.OPERATE,
        icon: 'ArrowDownToLine',
        color: '#c7d2fe',
      },
      {
        name: DetailType.RETURN,
        type: MainType.OPERATE,
        icon: 'Undo2',
        color: '#e0e7ff',
      },
      {
        name: DetailType.EXCHANGE,
        type: MainType.OPERATE,
        icon: 'RefreshCw',
        color: '#4f46e5',
      },
    ],
  },
];

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const rows = [];
      const now = new Date();

      const processCategory = (category, parentId = null) => {
        const id = uuidv4();

        rows.push({
          id,
          name: category.name,
          type: category.type,
          icon: category.icon,
          color: category.color,
          parentId,
          createdAt: now,
          updatedAt: now,
        });

        if (category.children && category.children.length > 0) {
          category.children.forEach((child) => processCategory(child, id));
        }
      };

      categories.forEach((category) => processCategory(category));

      await queryInterface.bulkInsert(
        { tableName: 'category', schema: 'accounting' },
        rows,
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    // 刪除所有預設類別 (沒有 userId 的)
    await queryInterface.bulkDelete(
      { tableName: 'category', schema: 'accounting' },
      { userId: null }
    );
  },
};
