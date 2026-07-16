import { Account as AccountEnum } from '@repo/shared';
import {
  Wallet,
  CreditCard,
  Banknote,
  Landmark,
  CircleDollarSign,
} from 'lucide-react';

/**
 * 帳戶類型 → icon 的共用對照。
 * 獨立成無 'use client' 的模組，Server / Client Component 都能引用。
 */
export const accountIcons = {
  [AccountEnum.CASH]: Banknote,
  [AccountEnum.BANK]: Landmark,
  [AccountEnum.CREDIT_CARD]: CreditCard,
  [AccountEnum.SECURITIES_ACCOUNT]: CircleDollarSign,
  [AccountEnum.OTHER]: Wallet,
};

export const accountTypeOrder = [
  AccountEnum.CASH,
  AccountEnum.BANK,
  AccountEnum.CREDIT_CARD,
  AccountEnum.SECURITIES_ACCOUNT,
  AccountEnum.OTHER,
];
