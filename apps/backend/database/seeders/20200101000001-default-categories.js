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
  飲食: 'restaurant',
  早餐: 'breakfast_dining',
  午餐: 'lunch_dining',
  晚餐: 'dinner_dining',
  點心: 'cookie', // Changed
  飲料: 'local_cafe',
  酒類: 'wine_bar', // specific
  水果: 'nutrition',
  食材: 'kitchen', // New
  交通: 'commute', // Changed
  公車: 'directions_bus',
  捷運: 'directions_subway',
  計程車: 'local_taxi',
  '火車/高鐵': 'train',
  機票: 'flight', // New
  加油: 'local_gas_station',
  停車: 'local_parking',
  過路費: 'toll',
  維修保養: 'build',
  罰單: 'receipt_long', // New
  娛樂: 'theater_comedy', // Changed
  電影: 'movie',
  遊戲: 'sports_esports',
  聚會: 'groups', // New
  旅遊: 'flight_takeoff',
  音樂: 'music_note',
  訂閱服務: 'subscriptions',
  書籍: 'menu_book', // Moved
  展覽: 'museum', // New
  購物: 'shopping_bag',
  服飾: 'checkroom',
  '3C產品': 'devices',
  生活用品: 'local_convenience_store', // Changed
  美妝保養: 'face_retouching_natural',
  家具: 'chair', // New
  精品: 'diamond', // New
  個人: 'person',
  剪髮: 'content_cut',
  化妝品: 'brush', // New
  健身: 'fitness_center',
  進修: 'school', // New
  醫療: 'medical_services',
  藥品: 'medication',
  看診: 'local_hospital',
  保險: 'security',
  治療: 'healing', // New
  家居: 'home',
  房租: 'real_estate_agent',
  水電瓦斯: 'lightbulb', // Changed
  網路費: 'wifi',
  管理費: 'domain', // New
  修繕: 'plumbing', // New
  家庭: 'family_restroom',
  小孩: 'child_care',
  寵物: 'pets',
  孝親費: 'volunteer_activism',
  雜支: 'more_horiz', // New
  生活: 'living',
  電話費: 'phone_iphone',
  網路購物: 'shopping_cart', // New
  學習: 'school',
  課程: 'class',
  學費: 'account_balance',
  文具: 'edit', // New
  其他: 'category',
  捐款: 'volunteer_activism', // repeated but ok
  稅金: 'account_balance',
  手續費: 'paid',
  遺失: 'help_outline', // New
  薪水: 'attach_money',
  獎金: 'card_giftcard',
  轉帳: 'sync_alt',
  提款: 'money_off',
  存款: 'savings',
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
