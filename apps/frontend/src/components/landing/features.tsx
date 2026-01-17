import {
  BarChart3,
  Cloud,
  Lock,
  PieChart,
  Smartphone,
  Zap,
} from 'lucide-react';

const features = [
  {
    name: '智慧分析',
    description: '自動生成精美的圖表，讓您一眼掌握財務狀況，發現消費趨勢。',
    icon: PieChart,
  },
  {
    name: '雲端同步',
    description:
      '數據實時同步到雲端，隨時隨地透過瀏覽器都能記帳，資料永不丟失。',
    icon: Cloud,
  },
  {
    name: '安全加密',
    description:
      '採用銀行級加密技術，確保您的財務數據安全無虞，隱私得到最高保障。',
    icon: Lock,
  },
  {
    name: '極速記帳',
    description:
      '優化的操作介面，讓您在幾秒鐘內完成一筆記帳，不再因為繁瑣而放棄。',
    icon: Zap,
  },
  {
    name: '響應式設計',
    description:
      '完美支援各種螢幕尺寸，無論是電腦、平板或手機瀏覽器都能流暢使用。',
    icon: Smartphone,
  },
  {
    name: '預算管理',
    description: '設定每月預算，即時監控支出，避免超支，達成儲蓄目標。',
    icon: BarChart3,
  },
];

export function Features() {
  return (
    <section
      id="features"
      className="py-24 bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 transition-colors duration-500"
    >
      <div className="container mx-auto px-6 md:px-12">
        <div className="text-center mb-20 space-y-4">
          <h2 className="font-[family-name:var(--font-playfair)] text-4xl md:text-5xl font-medium tracking-tight text-slate-900 dark:text-slate-50">
            精緻生活，
            <span className="italic text-slate-500 dark:text-slate-400">
              從記帳開始
            </span>
          </h2>
          <div className="h-px w-16 mx-auto bg-amber-500/50 my-6" />
          <p className="mt-4 text-slate-700 dark:text-slate-300 md:text-lg max-w-2xl mx-auto font-light leading-relaxed tracking-wide">
            我們提供您所需的一切工具，幫助您以最優雅的方式管理個人財務。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.name}
              className="group relative p-8 bg-white dark:bg-slate-800/50 rounded-sm border border-slate-200 dark:border-slate-800 hover:border-amber-200 dark:hover:border-amber-900/50 transition-all duration-500 shadow-sm hover:shadow-xl hover:shadow-slate-300/40 dark:hover:shadow-none"
            >
              <div className="absolute top-0 left-8 -translate-y-1/2 bg-white dark:bg-slate-900 p-3 rounded-full border border-slate-200 dark:border-slate-800 group-hover:border-amber-200 dark:group-hover:border-amber-900/50 transition-colors duration-500">
                <feature.icon className="h-6 w-6 text-slate-400 group-hover:text-amber-600 transition-colors duration-500" />
              </div>

              <div className="mt-4 space-y-3">
                <h3 className="text-xl font-medium text-slate-900 dark:text-slate-100 tracking-wide font-serif">
                  {feature.name}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 leading-7 font-light text-sm">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
