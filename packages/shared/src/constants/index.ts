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

export enum PendingTransactionStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  SKIPPED = 'SKIPPED',
}

export enum ParseStatus {
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PASSWORD_REQUIRED = 'PASSWORD_REQUIRED',
}

export enum RecurringFrequency {
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export enum RecurringTemplateStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

// Excel 匯入模式：新增全新交易 / 編輯既有交易（依隱藏 id 欄逐列分流）
export enum ExcelImportMode {
  CREATE = 'create',
  EDIT = 'edit',
}

// Excel 匯出模式：純匯出（不含 id）/ 編輯用（含最後一欄隱藏 id）
export enum ExcelExportMode {
  EXPORT = 'export',
  EDIT = 'edit',
}

// 幣別代碼。正式值一律使用 ISO 4217（新台幣為 TWD）。
// 歷史相容：使用者先前匯出的 Excel 檔可能含舊代碼 'NTD'，匯入端以
// normalizeCurrencyCode() 映射為 'TWD'（見下方），不在 enum 保留 NTD 成員。
export enum Currency {
  TWD = 'TWD', // 新台幣
  USD = 'USD', // 美元
  JPY = 'JPY', // 日圓
  EUR = 'EUR', // 歐元
  CNY = 'CNY', // 人民幣
  HKD = 'HKD', // 港幣
  GBP = 'GBP', // 英鎊
}

// 預設幣別（本位幣預設亦為 TWD）。
export const DEFAULT_CURRENCY = Currency.TWD;

// 無小數幣別：金額以整數呈現（不顯示小數點）。TWD / JPY 無小數，其餘可有小數。
export const ZERO_DECIMAL_CURRENCIES: Currency[] = [Currency.TWD, Currency.JPY];

export const isZeroDecimalCurrency = (currency: string): boolean =>
  ZERO_DECIMAL_CURRENCIES.includes(currency as Currency);

// 幣別代碼正規化：統一所有寫入入口（Excel 匯入、未來表單/匯率寫入）的幣別字串。
// 目前唯一需要處理的歷史別名是 'NTD' → 'TWD'；其餘代碼原樣回傳（大寫去空白）。
export const normalizeCurrencyCode = (code: string): string => {
  const normalized = (code ?? '').trim().toUpperCase();
  if (normalized === 'NTD') return Currency.TWD;
  return normalized;
};

// 幣別維度表 seed 清單（migration seeder 與前端下拉共用）。
// decimalPlaces 對齊 ZERO_DECIMAL_CURRENCIES（TWD/JPY = 0，其餘 = 2）。
export interface CurrencySeed {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  isCrypto: boolean;
  isActive: boolean;
}

export const SEED_CURRENCIES: CurrencySeed[] = [
  { code: 'TWD', name: '新台幣', symbol: 'NT$', decimalPlaces: 0, isCrypto: false, isActive: true },
  { code: 'JPY', name: '日圓', symbol: '¥', decimalPlaces: 0, isCrypto: false, isActive: true },
  { code: 'USD', name: '美元', symbol: '$', decimalPlaces: 2, isCrypto: false, isActive: true },
  { code: 'EUR', name: '歐元', symbol: '€', decimalPlaces: 2, isCrypto: false, isActive: true },
  { code: 'CNY', name: '人民幣', symbol: '¥', decimalPlaces: 2, isCrypto: false, isActive: true },
  { code: 'HKD', name: '港幣', symbol: 'HK$', decimalPlaces: 2, isCrypto: false, isActive: true },
  { code: 'GBP', name: '英鎊', symbol: '£', decimalPlaces: 2, isCrypto: false, isActive: true },
];

// 本位幣金額統一精度（決策 Q2）：四捨五入到小數 5 位，對齊 DECIMAL(20,5)。
// 跨幣 SUM 時各項先 round 再相加。
export const BASE_CURRENCY_DECIMALS = 5;

export const roundToBaseCurrency = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** BASE_CURRENCY_DECIMALS;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

// 匯率精度：四捨五入到小數 10 位，對齊 exchange_rate.rate DECIMAL(20,10)。
// 反向匯率（取倒數）等匯率運算不可套用本位幣的 5 位精度，否則小匯率會掉精度
// （例：1/157.5 = 0.0063492…，5 位會被截成 0.00635）。
export const EXCHANGE_RATE_DECIMALS = 10;

export const roundRate = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** EXCHANGE_RATE_DECIMALS;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

// 預算可分配的最遠未來月份（自「當月」起算的月數上界）。Phase 2「未來月份預先分配」
// 用此上界限制 view/assign/move 的月份範圍：放寬未來、但避免無界 month 造成 fold 月份迴圈爆炸
// （generateMonthRange 會從 start 迭代到 target）。前後端共用同一上界避免漂移。
export const BUDGET_MAX_FUTURE_MONTHS = 12;
