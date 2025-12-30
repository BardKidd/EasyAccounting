import { Container } from '@/components/ui/container';
import { AccountList } from '@/components/accounts';
import service from '@/services';
import { AccountType } from '@repo/shared';

export const dynamic = 'force-dynamic'; // 取消 Next.js 的快取機制。

export default async function AccountsPage() {
  const accounts: AccountType[] = await service.getPersonnelAccounts();

  return (
    <Container className="py-8 space-y-8">
      <AccountList accounts={accounts} />
    </Container>
  );
}
