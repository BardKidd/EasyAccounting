import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const recentTransactions = [
  {
    id: '1',
    amount: '-$80.00',
    date: '今天, 12:30 PM',
    category: '餐飲',
    description: '午餐 - 鼎泰豐',
    avatar: 'FD',
    color: 'text-rose-600',
  },
  {
    id: '2',
    amount: '-$35.00',
    date: '今天, 08:15 AM',
    category: '交通',
    description: 'Uber 上班',
    avatar: 'TR',
    color: 'text-rose-600',
  },
  {
    id: '3',
    amount: '+$5,000.00',
    date: '昨天, 05:00 PM',
    category: '薪資',
    description: '12月薪資入帳',
    avatar: 'SA',
    color: 'text-emerald-600',
  },
  {
    id: '4',
    amount: '-$120.00',
    date: '昨天, 02:00 PM',
    category: '娛樂',
    description: 'Netflix 訂閱',
    avatar: 'EN',
    color: 'text-rose-600',
  },
  {
    id: '5',
    amount: '-$250.00',
    date: '前天, 07:30 PM',
    category: '購物',
    description: 'Uniqlo 買衣服',
    avatar: 'SH',
    color: 'text-rose-600',
  },
];

export function RecentTransactions() {
  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>近期交易</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {recentTransactions.map((item) => (
            <div key={item.id} className="flex items-center">
              <Avatar className="h-9 w-9">
                <AvatarFallback>{item.avatar}</AvatarFallback>
              </Avatar>
              <div className="ml-4 space-y-1">
                <p className="text-sm font-medium leading-none">
                  {item.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.category} • {item.date}
                </p>
              </div>
              <div className={`ml-auto font-medium ${item.color}`}>
                {item.amount}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
