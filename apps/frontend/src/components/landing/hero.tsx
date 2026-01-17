import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative min-h-[90vh] flex flex-col justify-center overflow-hidden bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 transition-colors duration-500">
      {/* Abstract Background Elements */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-amber-100/40 dark:bg-amber-900/10 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-slate-200/40 dark:bg-slate-800/10 rounded-full blur-[120px] translate-x-1/3 translate-y-1/3" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,transparent_0%,rgba(255,255,255,0.0)_40%,var(--background)_100%)] dark:bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.5)_100%)]" />
      </div>

      <div className="container relative z-10 mx-auto px-6 md:px-12">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto space-y-12">
          {/* Status Badge - Minimal & Refined */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-slate-300 dark:border-slate-800 bg-white/60 dark:bg-slate-900/50 backdrop-blur-sm text-xs font-medium tracking-widest uppercase text-slate-600 dark:text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Running Preview
            </span>
          </div>

          {/* Main Title - Serif & Statuesque */}
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-1000 ease-out delay-100">
            <h1 className="font-[family-name:var(--font-playfair)] text-6xl md:text-8xl lg:text-9xl font-medium tracking-tight text-slate-900 dark:text-slate-50 leading-[0.9]">
              Easy
              <span className="text-slate-400 dark:text-slate-600 italic">
                Accounting
              </span>
            </h1>
            <div className="h-px w-24 mx-auto bg-amber-500/50" />
            <p className="font-serif text-xl md:text-2xl text-slate-700 dark:text-slate-300 tracking-[0.15em] leading-relaxed">
              專業個人記帳應用
            </p>
          </div>

          {/* Description - Clean Sans */}
          <p className="max-w-xl mx-auto text-base md:text-lg text-slate-600 dark:text-slate-400 leading-8 font-light animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out delay-200">
            以優雅的姿態審視財務，將繁瑣的數字轉化為清晰的洞見。
            <br />
            讓記帳不僅是紀錄，更是一種生活美學。
          </p>

          {/* Actions - Sharp & Defined */}
          <div className="flex flex-col sm:flex-row gap-6 mt-4 animate-in fade-in slide-in-from-bottom-10 duration-1000 ease-out delay-300">
            <Link href="/dashboard">
              <Button
                size="lg"
                className="h-14 px-10 rounded-sm bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 text-base tracking-widest uppercase font-medium shadow-xl shadow-slate-300/60 dark:shadow-none transition-all hover:scale-105"
              >
                開始使用
              </Button>
            </Link>
            <Link href="#features">
              <Button
                variant="outline"
                size="lg"
                className="group h-14 px-10 rounded-sm border-slate-400 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 text-base tracking-widest uppercase font-medium hover:border-slate-500 transition-all"
              >
                了解更多
                <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1 text-amber-600/80" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
