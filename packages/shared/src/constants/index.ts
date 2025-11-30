// 主類型:收入、支出、轉帳
export enum MainType {
  INCOME = '收入',
  EXPENSE = '支出',
  OPERATE = '操作',
}

// 次類型(中間層分類)
export enum SubType {
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
  LOTTERY = '彩券',
  INTEREST = '利息',
  OTHER = '其他',
}

// 細項類型(最底層分類)
export enum DetailType {
  // 飲食細項
  BREAKFAST = '早餐',
  LUNCH = '午餐',
  DINNER = '晚餐',
  SNACK = '點心',
  BEVERAGE = '飲料',
  ALCOHOL = '酒類',
  FRUIT = '水果',

  // 轉帳細項
  TRANSFER = '轉帳',
  WITHDRAWAL = '提款',
  DEPOSIT = '存款',
  RETURN = '退款',
  EXCHANGE = '兌換',
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
