import { Container } from '@/components/ui/container';
import { TransactionRulePanel } from '@/components/transactionRule/transactionRulePanel';

export default function RulesPage() {
  return (
    <Container className="py-8 space-y-8 max-w-[1100px] px-4 md:px-8">
      <div className="flex items-center justify-between space-y-2">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold bg-linear-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent font-outfit uppercase tracking-widest drop-shadow-sm">
            分類規則
          </h2>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            自訂規則：符合條件（描述 / 金額 / 類型）的新交易自動套用分類與標籤。套用於手動新增、Excel 匯入、帳單確認；不影響既有交易。
          </p>
        </div>
      </div>

      <TransactionRulePanel />
    </Container>
  );
}
