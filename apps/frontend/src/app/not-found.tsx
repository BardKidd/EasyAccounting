import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFount() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <p className="text-muted-foreground mb-8">找不到此頁面</p>
      <Link href="/dashboard">
        <Button className="cursor-pointer">返回儀表板</Button>
      </Link>
    </div>
  );
}
