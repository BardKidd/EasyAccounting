import Link from 'next/link';

export function Footer() {
  return (
    <footer className="py-10 border-t bg-muted/30">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2">
            <h3 className="text-xl font-bold mb-4">EasyAccounting</h3>
            <p className="text-muted-foreground max-w-xs">
              專業個人記帳應用，致力於為您提供最優質的財務管理體驗。
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">產品</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="#features" className="hover:text-foreground">
                  功能介紹
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-foreground">
                  價格方案
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-foreground">
                  更新日誌
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">公司</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="#" className="hover:text-foreground">
                  關於我們
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-foreground">
                  聯絡我們
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-foreground">
                  隱私權政策
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-foreground">
                  服務條款
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t pt-8 text-center text-sm text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} EasyAccounting. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
