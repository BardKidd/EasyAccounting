'use client';

import { motion } from 'framer-motion';

export function HowItWorks() {
  const steps = [
    {
      number: '01',
      title: '註冊帳號',
      description:
        '使用 Email 快速建立您的專屬帳戶，所有資料自動加密儲存，安全可靠，讓您安心開啟理財第一步。',
    },
    {
      number: '02',
      title: '記錄收支',
      description:
        '極致直覺的輸入介面，搭配智慧分類，無論是日常開銷或大額投資，都能隨時隨地輕鬆紀錄每一筆資金流向。',
    },
    {
      number: '03',
      title: '查看報表',
      description:
        '系統即時運算，自動生成高質感的專業分析圖表與見解，助您一眼洞悉財務體質，做出最明智的決策。',
    },
  ];

  return (
    <section className="py-24 md:py-32 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-900 overflow-hidden">
      <div className="container mx-auto px-6 md:px-12">
        <div className="flex flex-col lg:flex-row gap-16 lg:gap-24 items-start">
          {/* Left Side: Sticky Header */}
          <div className="lg:w-1/3 lg:sticky lg:top-32 space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-sm font-bold text-emerald-600 dark:text-emerald-400 tracking-widest uppercase">
              運作方式
            </div>
            <h2 className="font-outfit text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.1]">
              簡單三步，
              <span className="block text-emerald-500 mt-2">開啟新生活</span>
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
              拒絕繁雜的設定與陡峭的學習曲線。只需跟隨直覺，幾秒鐘內就能立即體驗專業巨集觀的個人財務管理。
            </p>
          </div>

          {/* Right Side: Scrolling Cards */}
          <div className="lg:w-2/3 flex flex-col gap-12 lg:gap-32 lg:pb-[30vh]">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0.2, y: 50, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ margin: '-30% 0px -30% 0px' }}
                transition={{ duration: 0.8, type: 'spring', bounce: 0.2 }}
                className="bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-8 md:p-12 shadow-xl shadow-slate-200/20 dark:shadow-none"
              >
                <div className="flex flex-col sm:flex-row gap-8 items-start">
                  <div className="w-20 h-20 shrink-0 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center shadow-sm">
                    <span className="font-outfit text-4xl font-black text-emerald-500">
                      {step.number}
                    </span>
                  </div>
                  <div className="space-y-4 pt-2">
                    <h3 className="text-3xl font-bold font-outfit text-slate-900 dark:text-white tracking-wide">
                      {step.title}
                    </h3>
                    <p className="text-lg text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
