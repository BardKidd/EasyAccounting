'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { ShoppingBag, Coffee, Utensils } from 'lucide-react'; // Example icons
import { formatCurrency } from '@/lib/utils';

// In a real app, we would dynamically map icons based on category
const MOCK_ICONS: Record<string, any> = {
  購物: ShoppingBag,
  飲食: Utensils,
  娛樂: Coffee,
};

interface ExpenseItem {
  id: string;
  category: string;
  note: string;
  date: string;
  amount: number;
}

export function TopExpensesList({ items }: { items: ExpenseItem[] }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>單筆支出 Top 3</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {items.map((item, index) => {
            const Icon = MOCK_ICONS[item.category] || ShoppingBag;
            const rankColor =
              index === 0
                ? 'bg-gradient-to-br from-yellow-400 to-orange-500' // Gold
                : index === 1
                  ? 'bg-gradient-to-br from-slate-300 to-slate-400' // Silver
                  : 'bg-gradient-to-br from-orange-300 to-orange-400'; // Bronze

            return (
              <div
                key={item.id}
                className="group flex items-center justify-between p-3 rounded-xl border border-transparent hover:border-border hover:bg-muted/40 transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full text-white font-bold text-xs shadow-sm ${rankColor}`}
                  >
                    {index + 1}
                  </div>

                  <div className="p-2 bg-primary/10 rounded-full text-primary">
                    <Icon size={18} />
                  </div>

                  <div className="flex flex-col">
                    <span className="font-medium text-sm group-hover:text-primary transition-colors">
                      {item.note || item.category}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {item.date} · {item.category}
                    </span>
                  </div>
                </div>

                <div className="font-bold text-rose-500">
                  {formatCurrency(item.amount)}
                </div>
              </div>
            );
          })}
          {items.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              尚無支出資料
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
