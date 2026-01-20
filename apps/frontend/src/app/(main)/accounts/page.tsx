import { Container } from '@/components/ui/container';
import { AccountList } from '@/components/accounts';
import service from '@/services';
import { AccountType } from '@repo/shared';

export const dynamic = 'force-dynamic'; // 取消 Next.js 的快取機制。

export default async function AccountsPage() {
  const accounts: AccountType[] = await service.getPersonnelAccounts();

  return (
    <Container className="py-6 space-y-6 max-w-[1600px] px-4 md:px-8">
      <div className="space-y-1">
        <h2 className="text-3xl font-bold tracking-tight bg-linear-to-r from-slate-900 to-slate-700 dark:from-white dark:to-white/60 bg-clip-text text-transparent font-playfair">
          帳戶管理
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          管理與檢視您的所有資產帳戶
        </p>
      </div>
      <AccountList accounts={accounts} />
    </Container>
  );
}
