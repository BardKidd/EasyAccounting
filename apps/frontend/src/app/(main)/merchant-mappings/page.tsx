import { Container } from '@/components/ui/container';
import { MerchantMappingPanel } from '@/components/merchantMapping/merchantMappingPanel';

export default function MerchantMappingsPage() {
  return (
    <Container className="py-8 space-y-8 max-w-[1100px] px-4 md:px-8">
      <div className="flex items-center justify-between space-y-2">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold bg-linear-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent font-outfit uppercase tracking-widest drop-shadow-sm">
            商家分類
          </h2>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            系統從你的帳單解析學到的「商家 → 分類」自動對應。可改分類、停用或刪除；停用者不再自動套用。
          </p>
        </div>
      </div>

      <MerchantMappingPanel />
    </Container>
  );
}
