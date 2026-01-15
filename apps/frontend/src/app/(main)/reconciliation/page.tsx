import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileCheck, ArrowRight, CheckCircle2 } from 'lucide-react';
import { getReconciliationNotifications } from '@/services/reconciliationService';
import Link from 'next/link';
import { RefreshButton } from './refresh-button';

export default async function ReconciliationPage() {
  const res = await getReconciliationNotifications();
  if (!res.isSuccess) {
    console.error('Failed to fetch notifications:', res.message);
  }
  const notifications = res.isSuccess ? res.data : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">信用卡對帳</h1>
          <p className="text-muted-foreground mt-2">
            查看並核對您的信用卡帳單，確認本期消費或延後至下期。
          </p>
        </div>
        <RefreshButton />
      </div>

      {notifications.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {notifications.map((notification) => (
            <Card key={notification.accountId} className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-primary" />
                  {notification.accountName}
                </CardTitle>
                <CardDescription>
                  結帳日: {notification.statementDate}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="text-2xl font-bold text-destructive mb-2">
                  {notification.unreconciledCount} 筆待核對
                </div>
                <p className="text-sm text-muted-foreground">
                  {notification.message}
                </p>
              </CardContent>
              <CardFooter>
                <Link
                  href={`/reconciliation/${notification.accountId}`}
                  className="w-full"
                >
                  <Button className="w-full group">
                    開始對帳
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 border rounded-xl bg-card text-card-foreground shadow-sm">
          <div className="p-4 rounded-full bg-primary/10 mb-4">
            <CheckCircle2 className="h-12 w-12 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">目前沒有需要對帳的項目</h3>
          <p className="text-muted-foreground text-center max-w-sm">
            太棒了！您所有的信用卡帳單都已核對完成，或是尚未到達結帳日。
          </p>
        </div>
      )}
    </div>
  );
}
