import type { Metadata, Viewport } from 'next';
import { Outfit, Work_Sans } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { SWRProvider } from '@/components/swr-provider';
import { Toaster } from '@/components/ui/sonner';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';
import { SplashScreenLinks } from '@/components/pwa/splash-screen-links';
import { ServiceWorkerRegister } from '@/components/pwa/service-worker-register';

const workSans = Work_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
});

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'EasyAccounting',
  description: '專業個人記帳應用程式',
  manifest: '/manifest.json',
  applicationName: 'EasyAccounting',
  appleWebApp: {
    // 全螢幕 standalone 啟動；狀態列用 "default"（不透明、內容置於其下），
    // 避免 black-translucent 在淺色主題造成白字白底看不見（spec §1）。
    capable: true,
    statusBarStyle: 'default',
    title: 'EasyAccounting',
  },
  icons: {
    icon: [
      { url: '/icons/icon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  // viewport-fit=cover 是 Safe Area 的必要開關，必須放在 viewport export，
  // 不可寫 CSS @viewport（已被瀏覽器移除）（spec §1 / §3）。
  viewportFit: 'cover',
  // iOS 軟鍵盤彈出時縮排版視窗（而非覆蓋），讓底部彈出的 Sheet/Dialog 送出鈕不被鍵盤蓋住。
  interactiveWidget: 'resizes-content',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      {/* iOS 啟動畫面 <link>（React 19 會 hoist 進 <head>；Metadata API 無一級支援） */}
      <SplashScreenLinks />
      {/* antialiased 防止字體模糊 */}
      <body
        suppressHydrationWarning
        className={`${workSans.variable} ${outfit.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <Toaster />
          <SWRProvider>{children}</SWRProvider>
          <ServiceWorkerRegister />
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
