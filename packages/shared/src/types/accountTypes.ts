export interface AccountType {
  id: string;
  userId: string;
  name: string;
  type: string;
  balance: number;
  icon: string;
  color: string;
  isActive: boolean;
}

export interface CreditAccountType extends AccountType {
  creditLimit: number;
  unpaidAmount: number;
  billingDay: Date;
  nextBillingDate: Date;
  paymentStatus: string;
  daysUntilDue: number;
}
