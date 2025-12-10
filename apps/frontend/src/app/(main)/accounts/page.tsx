import { Container } from '@/components/ui/container';
import { AccountList } from '@/components/accounts';
import service from '@/services';
import { AccountType } from '@repo/shared';

export default async function AccountsPage() {
  const accounts: AccountType[] = await service.getPersonnelAccounts();

  return (
    <Container className="py-8">
      <AccountList accounts={accounts} />
    </Container>
  );
}
