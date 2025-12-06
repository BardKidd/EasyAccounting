// Next.js middleware 的進入點，不然我想放到資料夾內...

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // 不需要驗證的頁面
  const publicPath = ['/login', '/register', '/api/login', '/api/register'];
  const isInPublicPath = publicPath.includes(path);

  const token = req.cookies.get('accessToken')?.value;

  if (!token && !isInPublicPath) {
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
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
