import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function CtaSection() {
  return (
    <section className="py-20 bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 md:px-6 text-center">
        <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl mb-6">
          準備好掌握您的財務了嗎？
        </h2>
        <p className="text-primary-foreground/80 md:text-xl max-w-2xl mx-auto mb-10">
          立即加入
          EasyAccounting，開始體驗最輕鬆的記帳方式。完全免費，隨時取消。
        </p>
        <Link href="/dashboard">
          <Button size="lg" variant="secondary" className="h-12 px-8 text-lg">
            免費開始使用
          </Button>
        </Link>
      </div>
    </section>
  );
}
