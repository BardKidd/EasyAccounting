import { Container } from '@/components/ui/container';
import {
  TransactionTable,
  TransactionFilters,
  NewTransactionSheet,
} from '@/components/transactions';
import service from '@/services';
import { ExcelExportButton } from '@/components/common/ExcelExportButton';
import { ExcelImportButton } from '@/components/common/ExcelImportButton';
import { PageType } from '@repo/shared';

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
  const page =
    typeof searchParams.page === 'string' ? parseInt(searchParams.page) : 1;

  const [transactions, categories, accounts] = await Promise.all([
    service.getTransactions({
      startDate,
      endDate,
      type: type === 'all' ? undefined : type,
      accountId: accountId === 'all' ? undefined : accountId,
      page,
    }),
    service.getCategories(),
    service.getPersonnelAccounts(),
  ]);

  return (
    <Container className="py-8 space-y-8">
      <div className="flex items-center justify-between space-y-2">
        {/* tracking-tight 會讓字距更緊湊 */}
        <h2 className="text-3xl font-bold tracking-tight">交易紀錄</h2>
        <div className="flex items-center gap-2">
          <ExcelImportButton type={PageType.TRANSACTIONS} />
          <ExcelExportButton type={PageType.TRANSACTIONS} />
          <NewTransactionSheet categories={categories} accounts={accounts} />
        </div>
      </div>
      <div className="space-y-4">
        <TransactionFilters accounts={accounts} />

        <TransactionTable
          transactions={transactions}
          categories={categories}
          accounts={accounts}
        />
      </div>
    </Container>
  );
}

export default TransactionsPage;
