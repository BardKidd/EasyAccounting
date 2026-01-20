export function HowItWorks() {
  const steps = [
    {
      number: '01',
      title: '註冊帳號',
      description: '使用 Email 快速建立您的專屬帳戶，開啟理財第一步。',
    },
    {
      number: '02',
      title: '記錄收支',
      description: '直覺式介面，隨時隨地記錄每一筆資金流向。',
    },
    {
      number: '03',
      title: '查看報表',
      description: '系統自動生成專業分析報表，助您做出明智決策。',
    },
  ];

  return (
    <section className="py-32 bg-gradient-to-b from-slate-50 via-slate-100 to-white dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 transition-colors duration-500 border-t border-slate-200 dark:border-slate-800">
      <div className="container mx-auto px-6 md:px-12">
        <div className="text-center mb-24">
          <h2 className="font-[family-name:var(--font-playfair)] text-4xl md:text-5xl font-medium tracking-tight text-slate-900 dark:text-slate-50 mb-6">
            簡單三步，
            <span className="italic text-slate-500 dark:text-slate-400">
              掌握財務
            </span>
          </h2>
          <div className="h-px w-16 mx-auto bg-amber-500/50 my-6" />
          <p className="text-slate-700 dark:text-slate-300 md:text-lg max-w-2xl mx-auto font-light leading-relaxed tracking-wide">
            無需繁瑣的設定，立即開始您的優雅理財之旅。
          </p>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
          {/* Connecting Line - Desktop */}
          <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-700 to-transparent -z-10" />

          {steps.map((step) => (
            <div
              key={step.number}
              className="group flex flex-col items-center text-center relative"
            >
              <div className="relative mb-8">
                <div className="w-24 h-24 flex items-center justify-center bg-white dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm group-hover:border-amber-200 dark:group-hover:border-amber-900/50 transition-colors duration-500 z-10">
                  <span className="font-[family-name:var(--font-playfair)] text-4xl italic text-slate-300 group-hover:text-amber-600 transition-colors duration-500 pr-1 pb-2">
                    {step.number}
                  </span>
                </div>
              </div>

              <h3 className="text-xl font-medium text-slate-900 dark:text-slate-100 mb-3 tracking-wide font-serif">
                {step.title}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 max-w-xs font-light leading-7 text-sm">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
