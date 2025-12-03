import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function Hero() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-32 lg:pb-32 xl:pb-36">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col items-center text-center">
          <div className="space-y-4 max-w-3xl">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl bg-clip-text text-transparent bg-linear-to-r from-primary to-primary/60 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              EasyAccounting
              <br />
              專業個人記帳應用
            </h1>
            <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
              輕鬆管理您的收支，智慧分析財務狀況。讓記帳成為一種享受，而不是負擔。
            </p>
          </div>
          <div className="flex flex-col gap-2 min-[400px]:flex-row mt-8 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-400">
            <Link href="/dashboard">
              <Button size="lg" className="h-12 px-8 text-lg">
                立即開始
              </Button>
            </Link>
            <Link href="#features">
              <Button variant="outline" size="lg" className="h-12 px-8 text-lg">
                了解更多
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 w-[800px] h-[800px] opacity-10 pointer-events-none">
        <div className="absolute inset-0 bg-linear-to-tr from-primary to-purple-500 rounded-full blur-3xl" />
      </div>
    </section>
  );
}
