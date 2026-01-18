import { Container } from '@/components/ui/container';
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
    <Container className="py-8 space-y-8 max-w-[1600px] px-4 md:px-8">
      <div className="flex items-center justify-between space-y-2">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight bg-linear-to-r from-slate-900 to-slate-700 dark:from-white dark:to-white/60 bg-clip-text text-transparent font-playfair">
            信用卡對帳
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            查看並核對您的信用卡帳單，確認本期消費或延後至下期。
          </p>
        </div>
        <RefreshButton />
      </div>

      {notifications.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {notifications.map((notification) => (
            <Card
              key={notification.accountId}
              className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.01] border-slate-200/60 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl flex flex-col"
            >
              <div className="absolute inset-0 bg-linear-to-br from-white/40 to-white/0 dark:from-white/5 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-playfair text-xl">
                  <div className="p-2 rounded-full bg-primary/10 text-primary">
                    <FileCheck className="h-5 w-5" />
                  </div>
                  {notification.accountName}
                </CardTitle>
                <CardDescription>
                  結帳日: {notification.statementDate}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="text-3xl font-bold text-slate-700 dark:text-slate-200 mb-2 font-playfair">
                  {notification.unreconciledCount}
                  <span className="text-sm text-muted-foreground ml-2 font-sans font-normal">
                    筆待核對
                  </span>
                </div>
                <p className="text-sm text-muted-foreground/80 leading-relaxed">
                  {notification.message}
                </p>
              </CardContent>
              <CardFooter className="pt-4 border-t border-slate-100/50 dark:border-slate-800/50">
                <Link
                  href={`/reconciliation/${notification.accountId}`}
                  className="w-full"
                >
                  <Button className="w-full group/btn shadow-md hover:shadow-xl transition-all duration-300">
                    開始對帳
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-16 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/30 dark:bg-slate-900/30">
          <div className="p-6 rounded-full bg-white dark:bg-slate-800 shadow-sm mb-6">
            <CheckCircle2 className="h-12 w-12 text-primary/80" />
          </div>
          <h3 className="text-2xl font-bold mb-3 text-slate-800 dark:text-slate-200 font-playfair">
            目前沒有需要對帳的項目
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-center max-w-md leading-relaxed">
            太棒了！您所有的信用卡帳單都已核對完成，或是尚未到達結帳日。
          </p>
        </div>
      )}
    </Container>
  );
}
