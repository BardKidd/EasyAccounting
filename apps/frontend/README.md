# Next.js 學習指南

這是一份為有 React 經驗但初次使用 Next.js 的開發者準備的完整指南。

## 目錄

- [什麼是 Next.js?](#什麼是-nextjs)
- [快速開始](#快速開始)
- [專案結構](#專案結構)
- [核心概念](#核心概念)
- [路由系統](#路由系統)
- [資料獲取](#資料獲取)
- [樣式處理](#樣式處理)
- [常用指令](#常用指令)
- [與 React 的差異](#與-react-的差異)

---

## 什麼是 Next.js?

Next.js 是一個基於 React 的全端框架,提供了以下核心功能:

- **伺服器端渲染 (SSR)**: 在伺服器上預先渲染頁面,提升 SEO 和首次載入速度
- **靜態網站生成 (SSG)**: 在建置時生成靜態 HTML 檔案
- **檔案系統路由**: 基於檔案結構自動生成路由
- **API Routes**: 在同一專案中建立後端 API
- **自動程式碼分割**: 只載入當前頁面需要的程式碼
- **內建優化**: 圖片、字型、腳本等資源的自動優化

---

## 快速開始

### 啟動開發伺服器

```bash
pnpm dev
```

開發伺服器會在 `http://localhost:3000` 啟動。

### 建置生產版本

```bash
pnpm build
```

### 啟動生產伺服器

```bash
pnpm start
```

---

## 專案結構

```
apps/frontend/
├── src/                    # 原始碼目錄
│   ├── app/               # App Router (Next.js 13+ 的新路由系統)
│   │   ├── layout.tsx    # 根佈局組件
│   │   ├── page.tsx      # 首頁
│   │   └── globals.css   # 全域樣式
├── public/                # 靜態資源 (圖片、字型等)
├── next.config.ts         # Next.js 配置檔
├── tailwind.config.ts     # Tailwind CSS 配置
├── tsconfig.json          # TypeScript 配置
└── package.json           # 專案依賴
```

### 重要檔案說明

- **`src/app/layout.tsx`**: 定義應用程式的根佈局,所有頁面都會包裹在這個佈局中
- **`src/app/page.tsx`**: 對應到 `/` 路由的首頁組件
- **`next.config.ts`**: Next.js 的配置檔,可設定環境變數、重定向、圖片域名等
- **`public/`**: 靜態檔案目錄,可直接透過 `/檔名` 訪問

---

## 核心概念

### 1. App Router (推薦使用)

Next.js 13+ 引入了新的 App Router,基於 React Server Components。

#### Server Components vs Client Components

**Server Components (預設)**

- 在伺服器端渲染
- 可以直接訪問後端資源 (資料庫、檔案系統等)
- 減少客戶端 JavaScript 體積
- 不能使用瀏覽器 API 或 React hooks (useState, useEffect 等)

```tsx
// src/app/page.tsx (Server Component)
export default async function Page() {
  // 可以直接在這裡進行資料獲取
  const data = await fetch('https://api.example.com/data');
  const json = await data.json();

  return <div>{json.title}</div>;
}
```

**Client Components**

- 在客戶端渲染
- 可以使用 React hooks 和瀏覽器 API
- 需要在檔案頂部加上 `'use client'` 指令

```tsx
// src/app/components/Counter.tsx (Client Component)
'use client';

import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);

  return <button onClick={() => setCount(count + 1)}>點擊次數: {count}</button>;
}
```

### 2. 佈局 (Layouts)

佈局是在多個頁面之間共享的 UI 元素。

```tsx
// src/app/layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body>
        <nav>導航列</nav>
        <main>{children}</main>
        <footer>頁尾</footer>
      </body>
    </html>
  );
}
```

### 3. 頁面 (Pages)

每個 `page.tsx` 檔案都會成為一個可訪問的路由。

```tsx
// src/app/about/page.tsx
export default function AboutPage() {
  return <h1>關於我們</h1>;
}
```

---

## 路由系統

### 基本路由

Next.js 使用檔案系統路由,資料夾結構直接對應 URL 路徑:

```
src/app/
├── page.tsx              → /
├── about/
│   └── page.tsx         → /about
├── blog/
│   ├── page.tsx         → /blog
│   └── [slug]/
│       └── page.tsx     → /blog/:slug (動態路由)
└── dashboard/
    ├── layout.tsx       → 共享佈局
    ├── page.tsx         → /dashboard
    └── settings/
        └── page.tsx     → /dashboard/settings
```

### 動態路由

使用方括號 `[參數名]` 建立動態路由:

```tsx
// src/app/blog/[slug]/page.tsx
export default function BlogPost({ params }: { params: { slug: string } }) {
  return <h1>文章: {params.slug}</h1>;
}
```

訪問 `/blog/hello-world` 時,`params.slug` 會是 `"hello-world"`。

### 路由群組

使用 `(資料夾名)` 建立路由群組,不會影響 URL 路徑:

```
src/app/
├── (marketing)/
│   ├── about/
│   │   └── page.tsx    → /about
│   └── contact/
│       └── page.tsx    → /contact
└── (shop)/
    ├── products/
    │   └── page.tsx    → /products
    └── cart/
        └── page.tsx    → /cart
```

### 導航

使用 `Link` 組件進行客戶端導航:

```tsx
import Link from 'next/link';

export default function Navigation() {
  return (
    <nav>
      <Link href="/">首頁</Link>
      <Link href="/about">關於</Link>
      <Link href="/blog/my-post">我的文章</Link>
    </nav>
  );
}
```

使用 `useRouter` hook 進行程式化導航:

```tsx
'use client';

import { useRouter } from 'next/navigation';

export default function LoginButton() {
  const router = useRouter();

  const handleLogin = () => {
    // 登入邏輯...
    router.push('/dashboard');
  };

  return <button onClick={handleLogin}>登入</button>;
}
```

---

## 資料獲取

### Server Components 中的資料獲取

在 Server Components 中可以直接使用 `async/await`:

```tsx
// src/app/posts/page.tsx
async function getPosts() {
  const res = await fetch('https://api.example.com/posts', {
    // 預設會快取,可以設定重新驗證時間
    next: { revalidate: 60 }, // 每 60 秒重新驗證
  });

  if (!res.ok) throw new Error('Failed to fetch posts');

  return res.json();
}

export default async function PostsPage() {
  const posts = await getPosts();

  return (
    <ul>
      {posts.map((post: any) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
```

### 快取選項

```tsx
// 1. 強制快取 (預設)
fetch('https://api.example.com/data');

// 2. 不快取,每次都重新獲取
fetch('https://api.example.com/data', { cache: 'no-store' });

// 3. 定時重新驗證 (ISR - Incremental Static Regeneration)
fetch('https://api.example.com/data', {
  next: { revalidate: 3600 }, // 每小時重新驗證
});
```

### Client Components 中的資料獲取

在 Client Components 中使用傳統的 React 方式:

```tsx
'use client';

import { useState, useEffect } from 'react';

export default function ClientDataComponent() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/data')
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>載入中...</div>;

  return <div>{JSON.stringify(data)}</div>;
}
```

### API Routes

在 `app` 目錄中建立 API 端點:

```tsx
// src/app/api/hello/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  return NextResponse.json({ message: 'Hello World' });
}

export async function POST(request: Request) {
  const body = await request.json();
  // 處理 POST 請求...
  return NextResponse.json({ success: true });
}
```

訪問 `/api/hello` 即可呼叫這個 API。

---

## 樣式處理

### 1. Tailwind CSS (已配置)

這個專案已經配置好 Tailwind CSS,可以直接使用:

```tsx
export default function Button() {
  return (
    <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
      點擊我
    </button>
  );
}
```

### 2. CSS Modules

建立 `.module.css` 檔案:

```css
/* src/app/components/Button.module.css */
.button {
  background-color: blue;
  color: white;
  padding: 10px 20px;
}

.button:hover {
  background-color: darkblue;
}
```

在組件中使用:

```tsx
import styles from './Button.module.css';

export default function Button() {
  return <button className={styles.button}>點擊我</button>;
}
```

### 3. 全域樣式

在 `src/app/globals.css` 中定義全域樣式,已在 `layout.tsx` 中引入。

---

## 常用指令

```bash
# 啟動開發伺服器
pnpm dev

# 建置生產版本
pnpm build

# 啟動生產伺服器
pnpm start

# 執行 ESLint 檢查
pnpm lint

# 清除 Next.js 快取
rm -rf .next
```

---

## 與 React 的差異

### 1. 預設是 Server Components

在 Next.js App Router 中,所有組件預設都是 Server Components,除非你加上 `'use client'`。

**React SPA:**

```tsx
// 所有組件都在客戶端執行
function MyComponent() {
  const [state, setState] = useState(0);
  return <div>{state}</div>;
}
```

**Next.js:**

```tsx
// Server Component (預設)
function MyComponent() {
  // ❌ 不能使用 useState, useEffect 等 hooks
  return <div>Hello</div>;
}

// Client Component (需要明確標記)
('use client');
function MyComponent() {
  // ✅ 可以使用所有 React hooks
  const [state, setState] = useState(0);
  return <div>{state}</div>;
}
```

### 2. 路由方式不同

**React (使用 React Router):**

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </BrowserRouter>
  );
}
```

**Next.js (檔案系統路由):**

```
src/app/
├── page.tsx        # 自動對應到 /
└── about/
    └── page.tsx    # 自動對應到 /about
```

### 3. 資料獲取方式

**React:**

```tsx
function Posts() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    fetch('/api/posts')
      .then((res) => res.json())
      .then(setPosts);
  }, []);

  return <div>{/* 渲染 posts */}</div>;
}
```

**Next.js Server Component:**

```tsx
async function Posts() {
  // 直接在組件中 await
  const posts = await fetch('/api/posts').then((res) => res.json());

  return <div>{/* 渲染 posts */}</div>;
}
```

### 4. 圖片優化

**React:**

```tsx
<img src="/my-image.jpg" alt="描述" />
```

**Next.js (自動優化):**

```tsx
import Image from 'next/image';

<Image
  src="/my-image.jpg"
  alt="描述"
  width={500}
  height={300}
  // 自動優化、懶載入、響應式
/>;
```

### 5. 環境變數

**React (CRA):**

- 必須以 `REACT_APP_` 開頭
- 例如: `REACT_APP_API_URL`

**Next.js:**

- 客戶端變數需要 `NEXT_PUBLIC_` 前綴
- 伺服器端變數不需要前綴
- 例如: `NEXT_PUBLIC_API_URL` (客戶端), `DATABASE_URL` (僅伺服器端)

---

## 實用技巧

### 1. Metadata 和 SEO

```tsx
// src/app/page.tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '我的網站',
  description: '這是一個很棒的網站',
  keywords: ['Next.js', 'React', 'TypeScript'],
};

export default function Page() {
  return <h1>首頁</h1>;
}
```

### 2. Loading 狀態

建立 `loading.tsx` 自動顯示載入狀態:

```tsx
// src/app/dashboard/loading.tsx
export default function Loading() {
  return <div>載入中...</div>;
}
```

### 3. 錯誤處理

建立 `error.tsx` 處理錯誤:

```tsx
// src/app/dashboard/error.tsx
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div>
      <h2>發生錯誤!</h2>
      <p>{error.message}</p>
      <button onClick={reset}>重試</button>
    </div>
  );
}
```

### 4. 404 頁面

建立 `not-found.tsx`:

```tsx
// src/app/not-found.tsx
export default function NotFound() {
  return <h1>404 - 頁面不存在</h1>;
}
```

---

## 學習資源

- [Next.js 官方文件](https://nextjs.org/docs) - 最完整的學習資源
- [Next.js 範例](https://github.com/vercel/next.js/tree/canary/examples) - 官方提供的各種範例
- [Learn Next.js](https://nextjs.org/learn) - 互動式教學課程

---

## 下一步

1. 修改 `src/app/page.tsx` 開始建立你的首頁
2. 在 `src/app` 中建立新的資料夾和 `page.tsx` 來新增路由
3. 建立 `src/app/components` 資料夾來存放可重用的組件
4. 探索 `src/app/api` 來建立後端 API 端點

祝你學習愉快! 🚀
