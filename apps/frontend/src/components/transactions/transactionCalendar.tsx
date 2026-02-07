'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  Calendar,
  dateFnsLocalizer,
  View,
  Views,
  ToolbarProps,
} from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import {
  format,
  parse,
  startOfWeek,
  getDay,
  startOfMonth,
  endOfMonth,
} from 'date-fns';
import { zhTW } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import './calendar-custom.css';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import useSWR from 'swr';

import { TransactionType, CategoryType, AccountType } from '@repo/shared';
import { CalendarEvent } from './calendarEvent';
import { CalendarDayModal } from './calendarDayModal';
import { TransactionSheet } from './transactionSheet';
import { toast } from 'sonner';
import { getTransactions, updateTransaction } from '@/services/transaction';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getErrorMessage } from '@/lib/utils';
import {
  filterForCalendar,
  transactionToCalendarEvent,
  CalendarEventType,
} from '@/lib/calendarUtils';

// 設定日期格式化工具
const locales = {
  'zh-TW': zhTW,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const DnDCalendar = withDragAndDrop<CalendarEventType>(Calendar);

// SWR Fetcher
const transactionFetcher = async ([, dateStr]: [string, string]) => {
  const date = new Date(dateStr);
  const start = format(startOfMonth(date), 'yyyy-MM-dd');
  const end = format(endOfMonth(date), 'yyyy-MM-dd');

  // Limit 1000 for calendar view
  return await getTransactions({ startDate: start, endDate: end, limit: 1000 });
};

interface TransactionCalendarProps {
  transactions: TransactionType[];
  categories: CategoryType[];
  accounts: AccountType[];
}

const CustomToolbar = ({ date, onNavigate, label }: ToolbarProps) => {
  return (
    <div className="flex items-center justify-between p-4 px-6 mb-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all"
          onClick={() => onNavigate('PREV')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 min-w-[120px] text-center font-display tracking-tight">
          {label}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all"
          onClick={() => onNavigate('NEXT')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="h-8 px-4 text-xs font-medium rounded-full border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/30 hover:text-teal-800 dark:hover:text-teal-200 hover:border-teal-300 dark:hover:border-teal-700 transition-all"
        onClick={() => onNavigate('TODAY')}
      >
        今天
      </Button>
    </div>
  );
};

export default function TransactionCalendar({
  transactions: initialTransactions,
  categories,
  accounts,
}: TransactionCalendarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 強制鎖定在 Month View
  const view = Views.MONTH;

  // 與 URL 同步內部日期
  // 如果 URL 只有 ?view=calendar 沒有 date，我們就用今日
  const dateParam = searchParams.get('date');
  const [date, setDate] = useState(
    dateParam ? new Date(dateParam) : new Date(),
  );

  // SWR: Client-side fetching with caching
  // Key 包含 date 資訊，這樣切換月份就會自動換 key -> 抓新資料
  const currentKey = format(date, 'yyyy-MM-dd');

  const { data: transactionsData, mutate } = useSWR(
    ['/transaction/date', currentKey],
    transactionFetcher,
    {
      fallbackData: {
        items: initialTransactions,
        pagination: { total: 0, page: 1, limit: 1000, totalPages: 1 },
      },
      revalidateOnFocus: false, // 視窗切換回來不用每次都重抓，根據個人喜好
      dedupingInterval: 60000, // 1分鐘內重複的 key 不發請求 (Cache 有效期)
      keepPreviousData: true, // 載入新月份時保留舊月份畫面，體驗更好 (不會白屏)
    },
  );

  // 如果 SWR 有資料就用 data.items，沒有就用 initialProps (SWR fallbackData 其實已經處理了，這裡只是雙保險)
  const transactions = transactionsData?.items || initialTransactions;

  useEffect(() => {
    if (dateParam) {
      setDate(new Date(dateParam));
    }
  }, [dateParam]);

  // Modal 狀態
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dayTransactions, setDayTransactions] = useState<TransactionType[]>([]);

  // 編輯 Sheet 狀態
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<TransactionType | null>(null);

  // 1. 將交易資料轉換為日曆事件
  const events = useMemo(() => {
    return filterForCalendar(transactions).map(transactionToCalendarEvent);
  }, [transactions]);

  // 處理日曆導航 (使用 shallow routing)
  const onNavigate = useCallback(
    (newDate: Date) => {
      setDate(newDate);

      const newDateStr = format(newDate, 'yyyy-MM-dd');

      // 更新 URL 但不觸發 Server Component Refresh (Shallow)
      // 使用 window.history.pushState 來更新網址列，這樣重新整理時會停在該月份
      // 但不會觸發 Next.js 的 router.pushServer-side fetch
      const params = new URLSearchParams(searchParams.toString());
      params.set('date', newDateStr);

      // 更新 URL
      window.history.pushState(null, '', `?${params.toString()}`);
    },
    [searchParams],
  );

  // 2. 拖放處理
  const onEventDrop = useCallback(
    async ({
      event,
      start,
    }: {
      event: CalendarEventType;
      start: string | Date;
    }) => {
      const newDate = format(new Date(start), 'yyyy-MM-dd');

      toast.info('更新交易中...', {
        description: `移動至 ${newDate}`,
      });

      try {
        const transactionId = event.resource.id;
        if (!transactionId) {
          throw new Error('交易 ID 不存在');
        }
        const payload = { date: newDate };

        const result = await updateTransaction(
          transactionId,
          payload as Parameters<typeof updateTransaction>[1],
        );

        if (!result) throw new Error('Failed to update');

        toast.success('更新成功', {
          description: '交易日期已更新',
        });

        // 成功後讓 SWR 重新抓取資料
        mutate();
      } catch (error) {
        toast.error('更新失敗', {
          description: getErrorMessage(error),
        });
      }
    },
    [mutate],
  );

  // 3. 點擊日期格子（開啟 Modal，無交易則不顯示）
  const onSelectSlot = useCallback(
    ({ start }: { start: Date }) => {
      const dateStr = format(start, 'yyyy-MM-dd');
      const txsForDay = transactions.filter((tx) => tx.date === dateStr);

      // 無交易時不開啟 modal
      if (txsForDay.length === 0) return;

      setSelectedDate(start);
      setDayTransactions(txsForDay);
      setIsModalOpen(true);
    },
    [transactions],
  );

  // 4. 點擊事件（開啟編輯 Sheet）
  const handleEditTransaction = useCallback(
    (id: string) => {
      const tx = transactions.find((t) => t.id === id);
      if (tx) {
        setSelectedTransaction(tx);
        setIsEditSheetOpen(true);
      }
    },
    [transactions],
  );

  const onSelectEvent = useCallback(
    (event: CalendarEventType) => {
      handleEditTransaction(event.id);
    },
    [handleEditTransaction],
  );

  // 5. 自訂事件元件與 Toolbar
  const components = useMemo(
    () => ({
      toolbar: CustomToolbar,
      event: ({ event }: { event: CalendarEventType }) => (
        <CalendarEvent event={event} categories={categories} />
      ),
    }),
    [categories],
  );

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden ring-1 ring-slate-100 dark:ring-slate-900">
      <div className="h-[calc(100vh-200px)] min-h-[600px] p-0">
        <DnDCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          view={view}
          onView={() => {}} // Disable view switching
          date={date}
          onNavigate={onNavigate}
          selectable
          resizable={false}
          onSelectSlot={onSelectSlot}
          onSelectEvent={onSelectEvent}
          onEventDrop={onEventDrop}
          components={components as any}
          popup
          messages={{
            next: '下',
            previous: '上',
            today: '今天',
            month: '月',
            week: '週',
            day: '日',
            showMore: (total) => `+${total} 更多`,
          }}
          culture="zh-TW"
          className="rounded-b-2xl border-none"
        />
      </div>

      <CalendarDayModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        date={selectedDate}
        transactions={dayTransactions}
        categories={categories}
        accounts={accounts}
        onEdit={(id) => {
          setIsModalOpen(false);
          handleEditTransaction(id);
        }}
      />

      <TransactionSheet
        isOpen={isEditSheetOpen}
        onClose={() => {
          setIsEditSheetOpen(false);
          setSelectedTransaction(null);
          mutate(); // 關閉 Sheet 時也重新整理 SWR (如果有修改)
        }}
        transaction={selectedTransaction}
        categories={categories}
        accounts={accounts}
      />
    </div>
  );
}
