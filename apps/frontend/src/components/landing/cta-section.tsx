import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function CtaSection() {
  return (
    <section className="py-32 relative overflow-hidden bg-slate-900 text-slate-50">
      {/* Background Decoration */}
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-slate-800/30 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-amber-900/20 rounded-full blur-[60px] translate-y-1/3 -translate-x-1/3" />
      </div>

      <div className="container relative mx-auto px-6 md:px-12 text-center">
        <div className="max-w-3xl mx-auto space-y-8">
          <h2 className="font-[family-name:var(--font-playfair)] text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight">
            準備好掌握您的
            <span className="italic text-amber-500 mr-2">財務</span>了嗎？
          </h2>

          <p className="text-slate-400 md:text-lg font-light leading-relaxed tracking-wide">
            加入 EasyAccounting，體驗前所未有的優雅記帳方式。
            <br />
            現在開始，完全免費，隨時皆可取消。
          </p>

          <div className="pt-4">
            <Link href="/dashboard">
              <Button
                size="lg"
                className="h-14 px-12 rounded-sm bg-amber-600 text-white hover:bg-amber-700 text-base tracking-widest uppercase font-medium shadow-lg shadow-amber-900/20 hover:scale-105 transition-all duration-300"
              >
                免費開始使用
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
