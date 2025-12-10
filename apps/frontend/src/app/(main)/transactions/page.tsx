import { Container } from '@/components/ui/container';
import {
  TransactionTable,
  TransactionFilters,
  //   NewTransactionSheet, // unused
} from '@/components/transactions';
import service from '@/services';
import { Suspense } from 'react';
import {
  MainType,
  TransactionType,
  PaymentFrequency,
  AccountType,
  Account,
} from '@repo/shared';

// 看一下 Next.js 15 後的 query 都變成非同步了。
// 因為使用了 Partial Prerendering(PPR) 渲染方式，是種靜態+動態的混合渲染方式。可優先渲染不變的 Header 或 Sidebar 等，而內容則等等再渲染。所以才會有時間差。
// 這裡要先說明一下所謂的動態或靜態並不是 Server Components/Client Components 的概念。
// Server Components 指的是在伺服器端渲染的組件，Client Components 指的是在客戶端渲染的組件。
// 這裡的動、靜態指的是產生的內容會不會變動，舉例來說靜態就會是所有使用者都會看到一樣的內容，例如"登入頁面"或"關於我們"等頁面。
// 而動態就會是根據不同的使用者或不同的時間而產生不同的內容，例如交易紀錄頁面。會根據特定請求而改變顯示內容。
// 這時可能有的疑問是："既然動態是根據不同請求而改變內容，那動態路由(e.g. /:id)這種算嗎？"
// 答案是：Query 參數(searchParams) 因為無法預測，所以"必定"是動態渲染。
// 但動態路由(params, 如 /:id) 雖然也是變數，卻可以透過 generateStaticParams(<- Next.js 15 新增) 在打包時先做成靜態頁面 (SSG)。
interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function TransactionsPage(props: PageProps) {
  const searchParams = await props.searchParams;

  // Extract params
  const startDate =
    typeof searchParams.startDate === 'string'
      ? searchParams.startDate
      : undefined;
  const endDate =
    typeof searchParams.endDate === 'string' ? searchParams.endDate : undefined;
  const type =
    typeof searchParams.type === 'string' ? searchParams.type : undefined;
  const accountId =
    typeof searchParams.accountId === 'string'
      ? searchParams.accountId
      : undefined;

  // transactions
  const [categories, accounts] = await Promise.all([
    //! 還沒有這支 API
    // service.getTransactions({
    //   startDate,
    //   endDate,
    //   type: type === 'all' ? undefined : type,
    //   accountId: accountId === 'all' ? undefined : accountId,
    // }),
    service.getCategories(),
    service.getPersonnelAccounts(),
  ]);

  const mockAccounts: AccountType[] = [
    {
      id: 'mock-account-1',
      userId: 'mock-user',
      name: '現金',
      type: Account.CASH,
      balance: 5000,
      icon: 'banknote',
      color: '#10b981',
      isActive: true,
    },
    {
      id: 'mock-account-2',
      userId: 'mock-user',
      name: '玉山銀行',
      type: Account.BANK,
      balance: 150000,
      icon: 'landmark',
      color: '#3b82f6',
      isActive: true,
    },
  ];

  const mockTransactions: TransactionType[] = [
    {
      id: 'mock-1',
      date: new Date().toISOString(),
      time: '12:30',
      type: MainType.EXPENSE,
      categoryId: categories[0]?.id || 'unknown',
      accountId: mockAccounts[0].id,
      description: '午餐 - 雞腿便當',
      amount: 120,
      userId: 'mock-user',
      receipt: null,
      paymentFrequency: PaymentFrequency.ONE_TIME,
    },
    {
      id: 'mock-2',
      date: new Date().toISOString(),
      time: '18:45',
      type: MainType.EXPENSE,
      categoryId: categories[0]?.id || 'unknown',
      accountId: mockAccounts[0].id,
      description: '晚餐 - 義大利麵',
      amount: 250,
      userId: 'mock-user',
      receipt: null,
      paymentFrequency: PaymentFrequency.ONE_TIME,
    },
    {
      id: 'mock-3',
      date: new Date(
        new Date().setDate(new Date().getDate() - 1)
      ).toISOString(),
      time: '09:00',
      type: MainType.INCOME,
      categoryId: categories[0]?.id || 'unknown',
      accountId: mockAccounts[1].id,
      description: '薪資收入',
      amount: 50000,
      userId: 'mock-user',
      receipt: null,
      paymentFrequency: PaymentFrequency.ONE_TIME,
    },
    {
      id: 'mock-4',
      date: new Date(
        new Date().setDate(new Date().getDate() - 2)
      ).toISOString(),
      time: '15:20',
      type: MainType.EXPENSE,
      categoryId: categories[0]?.id || 'unknown',
      accountId: mockAccounts[0].id,
      description: '全聯採購',
      amount: 890,
      userId: 'mock-user',
      receipt: null,
      paymentFrequency: PaymentFrequency.ONE_TIME,
    },
  ];

  return (
    <Container className="py-8 space-y-8">
      <div className="flex items-center justify-between space-y-2">
        {/* tracking-tight 會讓字距更緊湊 */}
        <h2 className="text-3xl font-bold tracking-tight">交易紀錄</h2>
        {/* <NewTransactionSheet categories={categories} /> */}
      </div>

      <div className="space-y-4">
        <TransactionFilters accounts={mockAccounts} />

        <Suspense fallback={<div>載入中...</div>}>
          <TransactionTable
            transactions={mockTransactions}
            categories={categories}
            accounts={mockAccounts}
          />
        </Suspense>
      </div>
    </Container>
  );
}

export default TransactionsPage;
