// 需要增加新的 Icon 需要來這裡添加
import {
  Wallet,
  CreditCard,
  Banknote,
  PiggyBank,
  Building2,
  Landmark,
  CircleDollarSign,
  HandCoins,
  Receipt,
  TrendingUp,
} from 'lucide-react';

// DB 值: Icon 值
export const ACCOUNT_ICONS = {
  wallet: Wallet,
  'credit-card': CreditCard,
  banknote: Banknote,
  'piggy-bank': PiggyBank,
  building: Building2,
  landmark: Landmark,
  dollar: CircleDollarSign,
  coins: HandCoins,
  receipt: Receipt,
  trending: TrendingUp,
} as const;

export type IconName = keyof typeof ACCOUNT_ICONS;
