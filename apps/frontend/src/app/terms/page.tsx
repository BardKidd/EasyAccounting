import { InfoLayout } from '@/components/landing/info-layout';

export const metadata = {
  title: '服務條款 - EasyAccounting',
  description: 'EasyAccounting 的使用條款與細則',
};

export default function TermsPage() {
  return (
    <InfoLayout
      title="服務條款"
      subtitle="在使用 EasyAccounting 服務前，請仔細閱讀以下條款。"
    >
      <div className="space-y-10">
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">1. 接受條款</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
            註冊並使用 EasyAccounting 應用程式即表示您同意接受本服務條款的約束。如果您不同意本條款的任何部分，請勿繼續使用本服務。
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">2. 用戶帳戶</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
            您有責任維護您的帳戶安全及密碼機密性。對於在您帳戶下發生的所有活動，您應負全部責任。我們保留因任何理由隨時停止或取消您的帳戶的權利。
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">3. 使用規範</h2>
          <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li>不得以任何非法方式使用本服務。</li>
            <li>不得干擾或破壞本服務的伺服器或網絡。</li>
            <li>不得嘗試未經授權訪問本服務的其他用戶數據。</li>
            <li>不得上傳包含惡意代碼、病毒或有害資訊的內容。</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">4. 免責聲明</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm italic">
            本服務按「現狀」提供，不附帶任何明示或暗示的保證。EasyAccounting 對於因使用本服務而產生的任何直接或間接損害（包括但不限於財務損失、數據丟失等）不承擔任何責任。
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">5. 條款修改</h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
            我們保留隨時修改或更新本服務條款的權利。重要更改將透過電子郵件或應用程式內通知。繼續使用本服務即表示您接受修改後的條款。
          </p>
        </section>

        <div className="pt-8 border-t border-slate-100 dark:border-slate-800 text-sm text-slate-500">
          最後更新日期：2026年3月17日
        </div>
      </div>
    </InfoLayout>
  );
}
