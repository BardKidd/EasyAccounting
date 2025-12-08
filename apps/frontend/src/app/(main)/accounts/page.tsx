import { Container } from '@/components/ui/container';
import { AccountList, NewAccountDialog } from '@/components/accounts';
import service from '@/services';
import { AccountType } from '@repo/shared';

export default async function AccountsPage() {
  const accounts: AccountType[] = await service.getPersonnelAccounts();

  return (
    <Container className="py-8 space-y-8">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">帳戶管理</h2>
        <NewAccountDialog />
      </div>

      <AccountList accounts={accounts} />
    </Container>
  );
}
