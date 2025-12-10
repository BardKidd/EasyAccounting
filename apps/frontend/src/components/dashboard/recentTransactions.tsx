import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const recentTransactions: any[] = [];

export function RecentTransactions() {
  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>近期交易</CardTitle>
      </CardHeader>
      <CardContent>
        {recentTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">尚無交易記錄</p>
            <p className="text-sm text-muted-foreground mt-2">
              點擊右上角「新增交易」按鈕開始記帳
            </p>
          </div>
        ) : (
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
        )}
      </CardContent>
    </Card>
  );
}
