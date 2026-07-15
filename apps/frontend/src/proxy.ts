import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // 不需要驗證的頁面
  const publicPath = [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/api/login',
    '/api/register',
    '/',
    // PWA 離線 fallback：必須公開，否則 SW precache `/offline` 會抓到 302→/login，
    // 且離線頁本就應在任何登入狀態下都能顯示（spec §4 / FR-3）。
    '/offline',
  ];
  const isInPublicPath = publicPath.includes(path);

  const token = req.cookies.get('accessToken')?.value;
  const refreshToken = req.cookies.get('refreshToken')?.value;

  if (!token && !refreshToken && !isInPublicPath) {
    return NextResponse.redirect(new URL('/login', req.url)); // 伺服器端的寫法
  }

  return NextResponse.next();
}

// 誰需要驗證
export const config = {
  matcher: [
    '/',
    '/login',
    '/register',
    '/dashboard',
    '/dashboard/:path*',
    '/transaction/:path*',
    // 排除含 `.` 的路徑（靜態資產：manifest.json / sw.js / icons、splash 圖檔等），
    // 否則未登入時 middleware 會把 /manifest.json 302 導向 /login → 回 HTML → PWA manifest 解析失敗。
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
