import Link from 'next/link';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-16 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-900 transition-colors duration-500">
      <div className="container mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
          {/* Brand Column */}
          <div className="md:col-span-5 space-y-6">
            <h3 className="font-[family-name:var(--font-playfair)] text-2xl font-medium tracking-tight text-slate-900 dark:text-slate-50">
              Easy
              <span className="text-slate-400 dark:text-slate-600 italic">
                Accounting
              </span>
            </h3>
            <p className="text-slate-600 dark:text-slate-400 max-w-sm leading-7 font-light text-sm">
              致力於提供最優質的個人財務管理體驗，讓記帳成為一種生活美學與享受。
            </p>
          </div>

          {/* Links Column - Product */}
          <div className="md:col-start-7 md:col-span-3">
            <h4 className="font-medium text-slate-900 dark:text-slate-50 mb-6 tracking-wide uppercase text-sm">
              產品
            </h4>
            <ul className="space-y-4 text-sm text-slate-600 dark:text-slate-400 font-light">
              <li>
                <Link
                  href="#features"
                  className="hover:text-amber-600 dark:hover:text-amber-500 transition-colors"
                >
                  功能介紹
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="hover:text-amber-600 dark:hover:text-amber-500 transition-colors"
                >
                  價格方案
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="hover:text-amber-600 dark:hover:text-amber-500 transition-colors"
                >
                  更新日誌
                </Link>
              </li>
            </ul>
          </div>

          {/* Links Column - Company */}
          <div className="md:col-span-3">
            <h4 className="font-medium text-slate-900 dark:text-slate-50 mb-6 tracking-wide uppercase text-sm">
              公司
            </h4>
            <ul className="space-y-4 text-sm text-slate-600 dark:text-slate-400 font-light">
              <li>
                <Link
                  href="#"
                  className="hover:text-amber-600 dark:hover:text-amber-500 transition-colors"
                >
                  關於我們
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="hover:text-amber-600 dark:hover:text-amber-500 transition-colors"
                >
                  聯絡我們
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="hover:text-amber-600 dark:hover:text-amber-500 transition-colors"
                >
                  隱私權政策
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="hover:text-amber-600 dark:hover:text-amber-500 transition-colors"
                >
                  服務條款
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-200 dark:border-slate-900 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-light text-slate-500 dark:text-slate-600">
          <p>&copy; {currentYear} EasyAccounting. All rights reserved.</p>
          <p>Designed with elegance.</p>
        </div>
      </div>
    </footer>
  );
}
