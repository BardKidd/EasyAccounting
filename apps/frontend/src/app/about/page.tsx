import { InfoLayout } from '@/components/landing/info-layout';

export const metadata = {
  title: '關於我們 - EasyAccounting',
  description: '瞭解 EasyAccounting 的使命與願景',
};

export default function AboutPage() {
  return (
    <InfoLayout
      title="關於我們"
      subtitle="我們致力於打造最直覺、最美觀且功能強大的個人財務管理工具。"
    >
      <div className="space-y-8">
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            我們的使命
          </h2>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            EasyAccounting
            誕生於一個簡單的想法：記帳不應該是一件苦差事。我們相信，透過良好的視覺化設計與直覺的操作介面，每個人都能輕鬆掌握自己的財務狀況，進而做出更好的生活決策。
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            為什麼選擇我們？
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-emerald-500 mb-2">極致簡潔</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                去蕪存菁，只保留最重要的功能，讓您在三秒內完成一筆記錄。
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-emerald-500 mb-2">數據視覺化</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                美觀的圖表讓枯燥的數字活了起來，一眼看出消費漏洞。
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4 pt-8 border-t border-slate-100 dark:border-slate-800">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            聯絡團隊
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            如果您有任何建議或合作機會，歡迎透過{' '}
            <a
              href="mailto:support@riinouo-eaccounting.win"
              className="text-emerald-500 hover:underline"
            >
              support@riinouo-eaccounting.win
            </a>{' '}
            與我們聯繫。
          </p>
        </section>
      </div>
    </InfoLayout>
  );
}
