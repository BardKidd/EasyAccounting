// app/page.tsx (Server Component)
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const metadata = {
  title: 'EasyAccounting - 專業個人記帳應用',
  description: '輕鬆管理您的收支，智慧分析財務狀況',
};

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold mb-4">EasyAccounting</h1>
      <p className="text-muted-foreground mb-8">專業個人記帳應用</p>
      <Link href="/dashboard">
        <Button size="lg">開始記帳</Button>
      </Link>
    </div>
  );
}
