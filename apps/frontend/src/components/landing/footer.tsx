import Link from 'next/link';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-16 bg-slate-950 text-slate-400 border-t border-slate-900 transition-colors duration-500 relative z-10">
      <div className="container mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
          {/* Brand Column */}
          <div className="md:col-span-5 space-y-6">
            <h3 className="font-outfit text-3xl font-bold tracking-tight text-white">
              Easy<span className="text-emerald-500">Accounting</span>
            </h3>
            <p className="text-slate-500 max-w-sm leading-7 font-normal text-sm">
              致力於提供最優質的個人財務管理體驗，讓記帳成為一種簡單而精確的習慣。
            </p>
          </div>

          {/* Links Column - Product */}
          <div className="md:col-start-7 md:col-span-3">
            <h4 className="font-semibold text-slate-200 mb-6 tracking-wide text-sm">
              產品
            </h4>
            <ul className="space-y-4 text-sm font-medium">
              <li>
                <Link
                  href="#features"
                  className="hover:text-emerald-400 transition-colors"
                >
                  功能介紹
                </Link>
              </li>
              <li>
                <Link
                  href="/updates"
                  className="hover:text-emerald-400 transition-colors"
                >
                  更新日誌
                </Link>
              </li>
            </ul>
          </div>

          {/* Links Column - Company */}
          <div className="md:col-span-3">
            <h4 className="font-semibold text-slate-200 mb-6 tracking-wide text-sm">
              公司
            </h4>
            <ul className="space-y-4 text-sm font-medium">
              <li>
                <Link
                  href="/about"
                  className="hover:text-emerald-400 transition-colors"
                >
                  關於我們
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="hover:text-emerald-400 transition-colors"
                >
                  聯絡我們
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="hover:text-emerald-400 transition-colors"
                >
                  隱私權政策
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="hover:text-emerald-400 transition-colors"
                >
                  服務條款
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-900 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm font-medium text-slate-600">
          <p>&copy; {currentYear} EasyAccounting. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Designed with <span className="text-emerald-500">♥</span> elegance.
          </p>
        </div>
      </div>
    </footer>
  );
}
