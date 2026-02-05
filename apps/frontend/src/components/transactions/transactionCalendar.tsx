'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Calendar, dateFnsLocalizer, View, Views } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

import { TransactionType, CategoryType, AccountType, RootType } from '@repo/shared';
import { CalendarEvent } from './calendarEvent';
import { CalendarDayModal } from './calendarDayModal';
import { toast } from 'sonner';
import { isOperateTransaction, isIncomingTransfer } from '@repo/shared';
import { updateTransaction } from '@/services/transaction';

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

interface CalendarEventType {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource: TransactionType;
  type: RootType;
  amount: number;
  isTransfer: boolean;
}

const DnDCalendar = withDragAndDrop<CalendarEventType>(Calendar);

interface TransactionCalendarProps {
  transactions: TransactionType[];
  categories: CategoryType[];
  accounts: AccountType[];
  onEditTransaction: (id: string) => void;
}

export default function TransactionCalendar({
  transactions,
  categories,
  accounts,
  onEditTransaction,
}: TransactionCalendarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [view, setView] = useState<View>(Views.MONTH);
  
  // 與 URL 同步內部日期
  const dateParam = searchParams.get('date');
  const [date, setDate] = useState(dateParam ? new Date(dateParam) : new Date());

  useEffect(() => {
    if (dateParam) {
      setDate(new Date(dateParam));
    }
  }, [dateParam]);

  // Modal 狀態
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dayTransactions, setDayTransactions] = useState<TransactionType[]>([]);

  // 1. 將交易資料轉換為日曆事件
  const events = useMemo(() => {
    return transactions
      .filter((tx) => {
        // 篩選掉轉帳的收款方（只顯示扣款方）
        // Spec 3.2: WHERE NOT (targetAccountId IS NOT NULL AND type = 'INCOME')
        if (isIncomingTransfer(tx)) return false;
        return true;
      })
      .map((tx): CalendarEventType => {
        // Spec 3.1: 強制使用 UTC 解析，避免時區問題
        // format: YYYY-MM-DD THH:mm:ss Z
        const dateTimeStr = `${tx.date}T${tx.time}Z`;
        const dateTime = new Date(dateTimeStr);
        
        return {
          id: tx.id || '',
          title: tx.description || 'Transaction',
          start: dateTime,
          end: dateTime,
          allDay: false, // 交易是時間點，非全天事件
          resource: tx,
          type: tx.type,
          amount: tx.amount,
          isTransfer: isOperateTransaction(tx),
        };
      });
  }, [transactions]);

  // 處理日曆導航
  const onNavigate = useCallback((newDate: Date) => {
    setDate(newDate);
    const newDateStr = format(newDate, 'yyyy-MM-dd');
    const params = new URLSearchParams(searchParams.toString());
    params.set('date', newDateStr);
    router.push(`${pathname}?${params.toString()}`);
  }, [pathname, router, searchParams]);

  // 2. 拖放處理
  const onEventDrop = useCallback(
    async ({ event, start }: { event: CalendarEventType; start: string | Date }) => {
      const newDate = format(new Date(start), 'yyyy-MM-dd');
      
      // 樂觀更新 (UI 會在父組件重新抓取資料時更新，但我們可以先顯示 Loading)
      toast.info('更新交易中...', {
        description: `移動至 ${newDate}`,
      });

      try {
        // 呼叫 API 更新日期
        // 使用 service 封裝的 apiHandler
        // 需補齊 UpdateTransactionSchema 所需欄位，使用 spread 原始資料
        const payload = {
            ...event.resource,
            date: newDate,
        } as any; // 轉型為 any 以避免與 UpdateTransactionSchema 的嚴格型別不符（可能與 TransactionType 略有差異）

        const result = await updateTransaction(event.id, payload);

        if (!result) throw new Error('Failed to update');
        
        toast.success('更新成功', {
          description: '交易日期已更新',
        });

        // 觸發重新整理 (在真實 App 中會 invalidate query)
        // 因為這是 Server Component 架構，我們使用 router.refresh() 來重新抓取資料
        router.refresh(); 
        
      } catch (error) {
        toast.error('更新失敗', {
          description: '無法移動交易',
        });
      }
    },
    [toast, router],
  );

  // 3. 點擊日期格子（開啟 Modal）
  const onSelectSlot = useCallback(
    ({ start }: { start: Date }) => {
      // 找出當日的交易
      const dateStr = format(start, 'yyyy-MM-dd');
      const txsForDay = transactions.filter((tx) => tx.date === dateStr);
      
      setSelectedDate(start);
      setDayTransactions(txsForDay);
      setIsModalOpen(true);
    },
    [transactions],
  );

  // 4. 點擊事件（開啟編輯 Sheet）
  const onSelectEvent = useCallback(
    (event: CalendarEventType) => {
      onEditTransaction(event.id);
    },
    [onEditTransaction],
  );

  // 5. 自訂事件元件
  const components = useMemo(
    () => ({
      event: ({ event }: { event: CalendarEventType }) => (
        <CalendarEvent event={event} categories={categories} />
      ),
    }),
    [categories],
  );

  return (
    <div className="h-[calc(100vh-250px)] min-h-[600px] bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-4">
      <DnDCalendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        view={view}
        onView={setView}
        date={date}
        onNavigate={onNavigate}
        selectable
        onSelectSlot={onSelectSlot}
        onSelectEvent={onSelectEvent}
        onEventDrop={onEventDrop}
        components={components}
        popup // Show +N more
        messages={{
            next: '下個月',
            previous: '上個月',
            today: '今天',
            month: '月',
            week: '週',
            day: '日',
            showMore: (total) => `+${total} 更多`,
        }}
        culture="zh-TW"
      />

      <CalendarDayModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        date={selectedDate}
        transactions={dayTransactions}
        categories={categories}
        accounts={accounts}
        onEdit={(id) => {
            setIsModalOpen(false);
            onEditTransaction(id);
        }}
      />
    </div>
  );
}
