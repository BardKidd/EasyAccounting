export interface OverviewTrendType {
  income: number;
  expense: number;
  transferIn: number;
  transferOut: number;
  balance: number;
}

export interface OverviewTop3CategoriesType {
  categoryId: string;
  amount: number;
  category: {
    name: string;
    color: string | null;
    icon: string;
    id: string;
  };
}

export interface OverviewTop3ExpensesType {
  categoryId: string;
  amount: number;
  id: string;
  date: string;
  description: string;
  category: {
    name: string;
    icon: string;
    id: string;
  };
}
