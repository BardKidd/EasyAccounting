'use strict';
const { v4: uuidv4 } = require('uuid');

const RootType = {
  INCOME: '收入',
  EXPENSE: '支出',
  OPERATE: '操作',
};

// 顏色與圖示對照表
const COLOR_MAP = {
  飲食: '#FF7043',
  早餐: '#FFCC80',
  午餐: '#FFA726',
  晚餐: '#F57C00',
  點心: '#FFAB91',
  飲料: '#8D6E63',
  酒類: '#5D4037',
  水果: '#C0CA33',
  食材: '#AED581',
  交通: '#42A5F5',
  公車: '#90CAF9',
  捷運: '#2196F3',
  計程車: '#FFEB3B',
  '火車/高鐵': '#5C6BC0',
  機票: '#3949AB', // New
  加油: '#EF5350',
  停車: '#BDBDBD',
  過路費: '#757575',
  維修保養: '#78909C',
  罰單: '#D32F2F', // New
  娛樂: '#AB47BC',
  電影: '#CE93D8',
  遊戲: '#BA68C8',
  聚會: '#E1BEE7',
  旅遊: '#4DB6AC',
  音樂: '#F48FB1',
  訂閱服務: '#EC407A',
  書籍: '#A1887F', // Moved from Education
  展覽: '#9575CD', // New
  購物: '#F06292',
  服飾: '#F48FB1',
  '3C產品': '#4DD0E1',
  生活用品: '#81C784',
  美妝保養: '#F06292',
  家具: '#795548', // New
  精品: '#AD1457', // New
  個人: '#26C6DA',
  剪髮: '#80DEEA',
  化妝品: '#F8BBD0',
  健身: '#00BCD4',
  進修: '#0097A7', // New
  醫療: '#EF5350',
  藥品: '#E57373',
  看診: '#EF9A9A',
  保險: '#B71C1C',
  治療: '#FFCDD2', // New
  家居: '#26A69A',
  房租: '#80CBC4',
  水電瓦斯: '#4DB6AC',
  網路費: '#009688',
  管理費: '#00796B', // New
  修繕: '#004D40', // New
  家庭: '#FFCA28',
  小孩: '#FFE082',
  寵物: '#FFD54F',
  孝親費: '#FF6F00',
  雜支: '#FFECB3', // New
  生活: '#7E57C2',
  電話費: '#9575CD',
  網路購物: '#B39DDB', // New
  學習: '#5C6BC0',
  課程: '#7986CB',
  學費: '#3F51B5',
  文具: '#1A237E', // New
  其他: '#78909C',
  捐款: '#8D6E63',
  稅金: '#546E7A',
  手續費: '#B0BEC5',
  遺失: '#37474F', // New
  薪水: '#66BB6A',
  獎金: '#81C784',
  投資: '#4DB6AC',
  還款: '#4DD0E1',
  退款: '#00BCD4',
  彩券: '#FFD700',
  利息: '#FFC107',
  轉帳: '#78909C',
  提款: '#B0BEC5',
  存款: '#B0BEC5',
};

const ICON_MAP = {
  飲食: 'Utensils',
  早餐: 'Coffee',
  午餐: 'Utensils',
  晚餐: 'UtensilsCrossed',
  點心: 'Cookie',
  飲料: 'CupSoda',
  酒類: 'Wine',
  水果: 'Apple',
  食材: 'ShoppingBasket',
  交通: 'Car',
  公車: 'Bus',
  捷運: 'Train',
  計程車: 'CarTaxiFront',
  '火車/高鐵': 'TrainFront',
  機票: 'Plane',
  加油: 'Fuel',
  停車: 'ParkingCircle',
  過路費: 'Ticket',
  維修保養: 'Wrench',
  罰單: 'Receipt',
  娛樂: 'PartyPopper',
  電影: 'Film',
  遊戲: 'Gamepad2',
  聚會: 'Users',
  旅遊: 'Plane',
  音樂: 'Music',
  訂閱服務: 'RefreshCcw',
  書籍: 'Book',
  展覽: 'Ticket',
  購物: 'ShoppingBag',
  服飾: 'Shirt',
  '3C產品': 'Smartphone',
  生活用品: 'ShoppingBasket',
  美妝保養: 'Sparkles',
  家具: 'Home',
  精品: 'Gift',
  個人: 'User',
  剪髮: 'Scissors',
  化妝品: 'SprayCan',
  健身: 'Dumbbell',
  進修: 'GraduationCap',
  醫療: 'Stethoscope',
  藥品: 'Pill',
  看診: 'Stethoscope',
  保險: 'ShieldCheck',
  治療: 'Stethoscope',
  家居: 'Home',
  房租: 'building', // Using lowercase key which maps to Building2
  水電瓦斯: 'Zap',
  網路費: 'Wifi',
  管理費: 'building',
  修繕: 'Wrench',
  家庭: 'Users',
  小孩: 'Baby',
  寵物: 'PawPrint',
  孝親費: 'HeartHandshake',
  雜支: 'MoreHorizontal',
  生活: 'Sparkles',
  電話費: 'Phone',
  網路購物: 'ShoppingBag',
  學習: 'School',
  課程: 'Presentation',
  學費: 'School',
  文具: 'FileText',
  其他: 'MoreHorizontal',
  捐款: 'Heart',
  稅金: 'FileText',
  手續費: 'Percent',
  遺失: 'help',
  薪水: 'Banknote',
  獎金: 'Gift',
  投資: 'TrendingUp',
  還款: 'Undo2',
  退款: 'ArrowDownToLine',
  彩券: 'Ticket',
  利息: 'Percent',
  轉帳: 'ArrowRightLeft',
  提款: 'ArrowUpFromLine',
  存款: 'ArrowDownToLine',
};

// 定義分類階層結構 (根據 constants/index.ts 的最新改動)
const CATEGORY_HIERARCHY = {
  [RootType.EXPENSE]: {
    飲食: ['早餐', '午餐', '晚餐', '點心', '飲料', '酒類', '水果', '食材'],
    交通: [
      '公車',
      '捷運',
      '計程車',
      '火車/高鐵',
      '機票',
      '加油',
      '停車',
      '過路費',
      '維修保養',
      '罰單',
    ],
    娛樂: ['電影', '遊戲', '聚會', '旅遊', '音樂', '訂閱服務', '書籍', '展覽'],
    購物: ['服飾', '3C產品', '生活用品', '美妝保養', '家具', '精品'],
    個人: ['剪髮', '化妝品', '健身', '進修'],
    醫療: ['藥品', '看診', '保險', '治療'],
    家居: ['房租', '水電瓦斯', '網路費', '管理費', '修繕'],
    家庭: ['小孩', '寵物', '孝親費', '雜支'],
    生活: ['電話費', '網路購物'],
    學習: ['課程', '學費', '文具'],
    其他: ['捐款', '稅金', '手續費', '遺失'],
  },
  [RootType.INCOME]: {
    薪水: [],
    獎金: [],
    投資: [],
    還款: [],
    退款: [],
    彩券: [],
    利息: [],
    其他: [],
  },
  [RootType.OPERATE]: {
    轉帳: [],
    提款: [],
    存款: [],
  },
};

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = 'accounting';
    const tableName = 'category';
    const now = new Date();

    const categories = [];

    // Helper to dry up code
    const createCat = (name, type, parentId, level) => ({
      id: uuidv4(),
      name,
      type,
      parentId,
      userId: null,
      icon: ICON_MAP[name] || 'category', // Default icon
      color: COLOR_MAP[name] || '#9E9E9E', // Default grey
      createdAt: now,
      updatedAt: now,
    });

    // 1. 建立 Root Categories
    for (const [rootName, mains] of Object.entries(CATEGORY_HIERARCHY)) {
      const rootCat = createCat(rootName, rootName, null, 'ROOT');
      categories.push(rootCat);
      const rootId = rootCat.id;

      // 2. 建立 Main Categories
      for (const [mainName, subs] of Object.entries(mains)) {
        const mainCat = createCat(mainName, rootName, rootId, 'MAIN');
        categories.push(mainCat);
        const mainId = mainCat.id;

        // 3. 建立 Sub Categories
        for (const subName of subs) {
          categories.push(createCat(subName, rootName, mainId, 'SUB'));
        }
      }
    }

    await queryInterface.bulkInsert({ schema, tableName }, categories, {});
  },

  async down(queryInterface, Sequelize) {
    // 刪除所有 userId 為 null 的預設分類
    await queryInterface.bulkDelete(
      { schema: 'accounting', tableName: 'category' },
      { userId: null },
      {}
    );
  },
};
