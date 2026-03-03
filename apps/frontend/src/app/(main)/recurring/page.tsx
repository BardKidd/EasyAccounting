import { Container } from '@/components/ui/container';
import { RecurringTemplatePanel } from '@/components/transactions/recurringTemplatePanel';
import service from '@/services';

export default async function RecurringTemplatesPage() {
  const [categories, accounts, templates] = await Promise.all([
    service.getCategories(),
    service.getPersonnelAccounts(),
    service.getRecurringTemplates(),
  ]);

  return (
    <Container className="py-8 space-y-8 max-w-[1200px] px-4 md:px-8">
      <div className="flex items-center justify-between space-y-2">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold bg-linear-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent font-outfit uppercase tracking-widest drop-shadow-sm">
            週期性交易
          </h2>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            管理自動執行的定期收支規則
          </p>
        </div>
      </div>

      <div className="mt-8">
        <RecurringTemplatePanel
          accounts={accounts}
          categories={categories}
          initialTemplates={templates}
          showCreateButton={true}
        />
      </div>
    </Container>
  );
}
