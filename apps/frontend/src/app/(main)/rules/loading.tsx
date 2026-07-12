import { Skeleton } from '@/components/ui/skeleton';
import { Container } from '@/components/ui/container';

export default function Loading() {
  return (
    <Container className="py-8 space-y-8 max-w-[1100px] px-4 md:px-8">
      {/* Header（靜態文字與頁面一致，避免載入完成時閃跳） */}
      <div className="flex items-center justify-between space-y-2">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold bg-linear-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent font-outfit uppercase tracking-widest drop-shadow-sm">
            分類規則
          </h2>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            自訂規則：符合條件（描述 / 金額 / 類型）的新交易自動套用分類與標籤。套用於手動新增、Excel
            匯入、帳單確認；不影響既有交易。
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* 工具列：左「顯示已停用」、右「新增規則」 */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              顯示已停用
            </span>
            <Skeleton className="h-5 w-9 rounded-full" />
          </div>
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>

        {/* 規則列（形狀與 TransactionRulePanel 內部 skeleton 一致） */}
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </Container>
  );
}
