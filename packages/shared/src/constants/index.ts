// 主類型 (根分類): 收入、支出、操作
export enum RootType {
  INCOME = '收入',
  EXPENSE = '支出',
  OPERATE = '操作',
}

// 主分類 (中間層分類 - User Main Category)
export enum MainType {
  // 支出類別
  FOOD = '飲食',
  TRANSPORTATION = '交通',
  ENTERTAINMENT = '娛樂',
  SHOPPING = '購物',
  PERSONAL = '個人',
  MEDICAL = '醫療',
  HOME = '家居',
  FAMILY = '家庭',
  LIVING = '生活',
  EDUCATION = '學習',

  // 收入類別
  SALARY = '薪水',
  BONUS = '獎金',
  INVESTMENT = '投資',
  REFUND = '還款',
  RETURN = '退款',
  LOTTERY = '彩券',
  INTEREST = '利息',
  OTHER = '其他',

  // 操作類別
  TRANSFER = '轉帳',
  WITHDRAWAL = '提款',
  DEPOSIT = '存款',
}

// 子分類 (最底層分類 - User Sub Category)
export enum SubType {
  // 飲食細項
  BREAKFAST = '早餐',
  LUNCH = '午餐',
  DINNER = '晚餐',
  SNACK = '點心',
  BEVERAGE = '飲料',
  ALCOHOL = '酒類',
  FRUIT = '水果',
  INGREDIENTS = '食材',

  // 交通細項
  BUS = '公車',
  MRT = '捷運',
  TAXI = '計程車',
  TRAIN = '火車/高鐵',
  PLANE_TICKET = '機票',
  GAS = '加油',
  PARKING = '停車',
  TOLL = '過路費',
  MAINTENANCE = '維修保養',
  FINE = '罰單',

  // 娛樂細項
  MOVIE = '電影',
  GAME = '遊戲',
  PARTY = '聚會',
  TRAVEL = '旅遊',
  MUSIC = '音樂',
  SUBSCRIPTION = '訂閱服務',
  BOOKS = '書籍',
  EXHIBITION = '展覽',

  // 購物細項
  CLOTHING = '服飾',
  ELECTRONICS = '3C產品',
  GROCERIES = '生活用品',
  BEAUTY = '美妝保養',
  FURNITURE = '家具',
  LUXURY = '精品',

  // 個人細項
  HAIRCUT = '剪髮',
  COSMETICS = '化妝品',
  GYM = '健身',
  SELF_STUDY = '進修',

  // 醫療細項
  MEDICINE = '藥品',
  DOCTOR = '看診',
  INSURANCE = '保險',
  TREATMENT = '治療',

  // 家居細項
  RENT = '房租',
  UTILITIES = '水電瓦斯',
  INTERNET = '網路費',
  MANAGEMENT_FEE = '管理費',
  REPAIR = '修繕',

  // 家庭細項
  CHILD = '小孩',
  PET = '寵物',
  ELDER = '孝親費',
  MISC = '雜支',

  // 生活細項
  PHONE = '電話費',
  ONLINE_SHOPPING = '網路購物',

  // 學習細項
  COURSE = '課程',
  TUITION = '學費',
  STATIONERY = '文具',

  // 其他細項
  DONATION = '捐款',
  TAX = '稅金',
  FEE = '手續費',
  LOST = '遺失',
}

export enum Account {
  CASH = '現金',
  BANK = '銀行',
  CREDIT_CARD = '信用卡',
  SECURITIES_ACCOUNT = '證券戶',
  OTHER = '其他',
}

export enum PaymentStatus {
  PENDING = '待繳',
  PAID = '已繳',
  OVERDUE = '逾期',
}

export enum PaymentFrequency {
  ONE_TIME = '單次',
  RECURRING = '週期',
  INSTALLMENT = '分期',
}

export enum PeriodType {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

// 這裡放當前頁面是什麼，參考 url 怎麼寫就怎麼寫。
export enum PageType {
  DASHBOARD = 'dashboard',
  TRANSACTIONS = 'transactions',
  ACCOUNTS = 'accounts',
  STATISTICS = 'statistics',
  SETTINGS = 'settings',
}

export enum InterestType {
  NONE = 'NONE',
  // REGULAR = 'REGULAR', // Future expansion
}

export enum CalculationMethod {
  ROUND = 'ROUND',
  FLOOR = 'FLOOR',
  CEIL = 'CEIL',
}

export enum RemainderPlacement {
  FIRST = 'FIRST',
  LAST = 'LAST',
}

export enum RewardsType {
  EVERY = 'EVERY',
  FIRST = 'FIRST', // Future expansion
}

export enum TransactionViewMode {
  LIST = 'list',
  CALENDAR = 'calendar',
}
