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
          <h2 className="text-3xl font-bold tracking-tight bg-linear-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent font-outfit uppercase">
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
              className="group relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 flex flex-col border-slate-200/50 dark:border-white/10 bg-white/60 dark:bg-[#0f172a]/60 backdrop-blur-2xl rounded-3xl shadow-xl"
            >
              <CardHeader className="relative overflow-hidden">
                <div className="absolute inset-0 bg-linear-to-b from-emerald-500/5 to-transparent dark:from-emerald-400/5 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                <CardTitle className="flex items-center gap-3 font-playfair text-xl relative z-10 transition-colors duration-300 group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                  <div className="p-2.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 font-bold shadow-sm ring-1 ring-emerald-100 dark:ring-emerald-500/20 group-hover:scale-110 transition-transform duration-300">
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
              <CardFooter className="pt-4 border-t border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm">
                <Link
                  href={`/reconciliation/${notification.accountId}`}
                  className="w-full"
                >
                  <Button className="w-full group/btn shadow-md hover:shadow-xl transition-all duration-300 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl">
                    開始對帳
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-16 border border-slate-200/50 dark:border-white/10 rounded-3xl bg-white/60 dark:bg-[#0f172a]/60 backdrop-blur-2xl shadow-xl">
          <div className="p-6 rounded-3xl bg-emerald-50 dark:bg-emerald-500/10 shadow-sm mb-6 ring-1 ring-emerald-100 dark:ring-emerald-500/20">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
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
