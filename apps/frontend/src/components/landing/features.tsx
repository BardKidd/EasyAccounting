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
    <section id="features" className="py-20 bg-muted/50">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
            強大功能，簡單易用
          </h2>
          <p className="mt-4 text-muted-foreground md:text-xl max-w-2xl mx-auto">
            我們提供您所需的一切工具，幫助您更好地管理個人財務。
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div
              key={feature.name}
              className="flex flex-col items-center text-center p-6 bg-background rounded-xl shadow-sm border hover:shadow-md transition-shadow"
            >
              <div className="p-3 bg-primary/10 rounded-full mb-4">
                <feature.icon className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">{feature.name}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
