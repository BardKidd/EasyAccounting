import { Container } from '@/components/ui/container';
import {
  TransactionTable,
  TransactionFilters,
  NewTransactionSheet,
  TransactionCalendar,
} from '@/components/transactions';
import service from '@/services';
import { ExcelExportButton } from '@/components/common/ExcelExportButton';
import ExcelImportButton from '@/components/common/ExcelImportButton';
import { TemplateDownloadButton } from '@/components/common/TemplateDownloadButton';
import { PageType } from '@repo/shared';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { startOfMonth, endOfMonth, format, parseISO } from 'date-fns';

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

  // 預設視圖改為日曆 (Calendar)
  const view = (typeof searchParams.view === 'string' ? searchParams.view : 'calendar') as 'list' | 'calendar';
  
  // List View Params
  const startDateParam =
    typeof searchParams.startDate === 'string'
      ? searchParams.startDate
      : undefined;
  const endDateParam =
    typeof searchParams.endDate === 'string' ? searchParams.endDate : undefined;
  const type =
    typeof searchParams.type === 'string' ? searchParams.type : undefined;
  const accountId =
    typeof searchParams.accountId === 'string'
      ? searchParams.accountId
      : undefined;
  const page =
    typeof searchParams.page === 'string' ? parseInt(searchParams.page) : 1;

  // Calendar View Params
  // Default to current month if no date param
  const dateParam = typeof searchParams.date === 'string' ? searchParams.date : format(new Date(), 'yyyy-MM-dd');
  const calendarDate = parseISO(dateParam);
  const calendarStart = format(startOfMonth(calendarDate), 'yyyy-MM-dd');
  const calendarEnd = format(endOfMonth(calendarDate), 'yyyy-MM-dd');

  // Fetch Logic
  let transactions;
  let categories;
  let accounts;

  if (view === 'calendar') {
    // Calendar Fetch: No pagination (limit 1000), specific month range, no other filters
    [transactions, categories, accounts] = await Promise.all([
      service.getTransactions({
        startDate: calendarStart,
        endDate: calendarEnd,
        limit: 1000,
        // Spec: Calendar doesn't share filters initially, mostly clean slate for the month
      }),
      service.getCategories(),
      service.getPersonnelAccounts(),
    ]);
  } else {
    // List Fetch: Standard with filters and pagination
    [transactions, categories, accounts] = await Promise.all([
      service.getTransactions({
        startDate: startDateParam,
        endDate: endDateParam,
        type: type === 'all' ? undefined : type,
        accountId: accountId === 'all' ? undefined : accountId,
        page,
      }),
      service.getCategories(),
      service.getPersonnelAccounts(),
    ]);
  }

  // Helper for generating query string for tabs
  // 保留現有的 searchParams，只更新 view 參數
  const getTabLink = (targetView: 'list' | 'calendar') => {
      const newParams = new URLSearchParams();
      
      // Copy existing params
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value !== undefined) {
           if (Array.isArray(value)) {
             value.forEach(v => newParams.append(key, v));
           } else {
             newParams.set(key, value);
           }
        }
      });

      newParams.set('view', targetView);
      return `?${newParams.toString()}`;
  };

  return (
    <Container className="py-8 space-y-8 max-w-[1600px] px-4 md:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight bg-linear-to-r from-slate-900 to-slate-700 dark:from-white dark:to-white/60 bg-clip-text text-transparent font-playfair">
            交易紀錄
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            管理與檢視您的每一筆收支
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <TemplateDownloadButton />
          <ExcelImportButton shouldRefresh={true} />
          <ExcelExportButton type={PageType.TRANSACTIONS} />
          <NewTransactionSheet categories={categories} accounts={accounts} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-slate-200 dark:border-slate-800">
          <Link
            href={getTabLink('list')}
            className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                view === 'list' 
                    ? "border-slate-900 text-slate-900 dark:border-slate-100 dark:text-slate-100" 
                    : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            )}
          >
              列表
          </Link>
          <Link
            href={getTabLink('calendar')}
             className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                view === 'calendar' 
                    ? "border-slate-900 text-slate-900 dark:border-slate-100 dark:text-slate-100" 
                    : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            )}
          >
              日曆
          </Link>
      </div>

      <div className="space-y-4">
        {view === 'list' && (
            <>
                <TransactionFilters accounts={accounts} />
                <TransactionTable
                    transactions={transactions}
                    categories={categories}
                    accounts={accounts}
                />
            </>
        )}

        {view === 'calendar' && (
            <TransactionCalendar 
                transactions={transactions.items} 
                categories={categories}
                accounts={accounts}
                onEditTransaction={() => {
                    // 開啟編輯 Sheet 的邏輯 - 目前尚不確定 TransactionTable 是內部處理還是複用 NewTransactionSheet。
                    // TransactionTable 似乎沒有傳遞 onEdit。
                    // 規格書提到「開啟該筆交易的編輯 Sheet（複用 newTransactionSheet）」。
                    // 但 NewTransactionSheet 目前主要用於「新增」。
                    // 需確認如何帶入現有資料進行編輯。
                    // 此次迭代暫未實作編輯功能，待後續任務整合。
                    // 查看 import，目前沒有 "EditTransactionSheet"。
                    console.log("此迭代尚未實作編輯功能");
                }}
            />
        )}
      </div>
    </Container>
  );
}

export default TransactionsPage;