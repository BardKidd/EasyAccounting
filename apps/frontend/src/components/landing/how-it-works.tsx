export function HowItWorks() {
  const steps = [
    {
      number: '01',
      title: '註冊帳號',
      description: '使用 Email 帳號快速註冊，完全免費。',
    },
    {
      number: '02',
      title: '記錄收支',
      description: '隨時隨地記錄您的每一筆收入和支出，分類清晰。',
    },
    {
      number: '03',
      title: '查看報表',
      description: '系統自動生成分析報表，助您做出更明智的財務決策。',
    },
  ];

  return (
    <section className="py-20">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
            只需三步，輕鬆上手
          </h2>
          <p className="mt-4 text-muted-foreground md:text-xl max-w-2xl mx-auto">
            無需複雜的設定，立即開始您的理財之旅。
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connector Line (Desktop only) */}
          <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-border -z-10" />

          {steps.map((step) => (
            <div
              key={step.number}
              className="flex flex-col items-center text-center"
            >
              <div className="w-24 h-24 rounded-full bg-background border-4 border-primary/20 flex items-center justify-center text-3xl font-bold text-primary mb-6 shadow-sm">
                {step.number}
              </div>
              <h3 className="text-xl font-bold mb-2">{step.title}</h3>
              <p className="text-muted-foreground max-w-xs">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
