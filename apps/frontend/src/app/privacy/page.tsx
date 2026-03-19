import { InfoLayout } from '@/components/landing/info-layout';

export const metadata = {
  title: '隱私權政策 - EasyAccounting',
  description: 'EasyAccounting 如何保護您的隱私與數據安全',
};

export default function PrivacyPage() {
  return (
    <InfoLayout
      title="隱私權政策"
      subtitle="您的數據隱私是我們的首要任務。瞭解我們如何收集、使用並保護您的資訊。"
    >
      <div className="space-y-10">
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-xs">01</span>
            資訊收集
          </h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            當您註冊 EasyAccounting 時，我們會收集您的姓名、電子郵件地址。在使用過程中，您所記錄的交易數據將被加密存儲於雲端服務中，僅供您個人訪問。
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-xs">02</span>
            數據使用
          </h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            收集的資訊主要用於：提供記帳服務、優化產品體驗、發送系統通知以及提供客戶支援。我們絕不會將您的個人數據出售給第三方廣告商。
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-xs">03</span>
            資訊安全
          </h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            我們採用業界標準的加密技術（如 SSL/TLS）來保護數據傳輸的安全。所有敏感數據均經過雜湊或加密處理後存儲，確保即使在未授權訪問的情況下也無法解讀您的財務資訊。
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-xs">04</span>
            您的權利
          </h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            您隨時可以導出您的記帳數據，或者要求我們刪除您的帳戶及所有關聯數據。一旦您提交刪除請求，我們將在 30 天內完成數據清理。
          </p>
        </section>

        <div className="pt-8 border-t border-slate-100 dark:border-slate-800 text-sm text-slate-500">
          最後更新日期：2026年3月17日
        </div>
      </div>
    </InfoLayout>
  );
}
