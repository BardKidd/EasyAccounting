'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Calendar,
  dateFnsLocalizer,
  View,
  Views,
  ToolbarProps,
} from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import './calendar-custom.css';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

import {
  TransactionType,
  CategoryType,
  AccountType,
  RootType,
} from '@repo/shared';
import { CalendarEvent } from './calendarEvent';
import { CalendarDayModal } from './calendarDayModal';
import { toast } from 'sonner';
import { isOperateTransaction } from '@repo/shared';
import { updateTransaction } from '@/services/transaction';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn, getErrorMessage } from '@/lib/utils';
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

interface TransactionCalendarProps {
  transactions: TransactionType[];
  categories: CategoryType[];
  accounts: AccountType[];
}

const CustomToolbar = ({ date, onNavigate, label }: ToolbarProps) => {
  return (
    <div className="flex items-center justify-between p-4 px-6 mb-2 bg-linear-to-r from-teal-50/50 to-transparent dark:from-teal-950/20">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full text-teal-600 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-200 hover:bg-teal-100 dark:hover:bg-teal-900/40"
          onClick={() => onNavigate('PREV')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 min-w-[120px] text-center font-display tracking-tight">
          {label}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full text-teal-600 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-200 hover:bg-teal-100 dark:hover:bg-teal-900/40"
          onClick={() => onNavigate('NEXT')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="h-8 px-4 text-xs font-medium rounded-full border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/30 hover:text-teal-800 dark:hover:text-teal-200 hover:border-teal-300 dark:hover:border-teal-700"
        onClick={() => onNavigate('TODAY')}
      >
        今天
      </Button>
    </div>
  );
};

export default function TransactionCalendar({
  transactions,
  categories,
  accounts,
}: TransactionCalendarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 強制鎖定在 Month View
  const view = Views.MONTH;

  // 與 URL 同步內部日期
  const dateParam = searchParams.get('date');
  const [date, setDate] = useState(
    dateParam ? new Date(dateParam) : new Date(),
  );

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
    return filterForCalendar(transactions).map(transactionToCalendarEvent);
  }, [transactions]);

  // 處理日曆導航
  const onNavigate = useCallback(
    (newDate: Date) => {
      setDate(newDate);
      const newDateStr = format(newDate, 'yyyy-MM-dd');
      const params = new URLSearchParams(searchParams.toString());
      params.set('date', newDateStr);
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
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
        // 拖放只需更新 date，不需要送完整 payload
        // 後端 updateIncomeExpense 支援部分更新
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
        router.refresh();
      } catch (error) {
        toast.error('更新失敗', {
          description: getErrorMessage(error),
        });
      }
    },
    [router],
  );

  // 3. 點擊日期格子（開啟 Modal）
  const onSelectSlot = useCallback(
    ({ start }: { start: Date }) => {
      const dateStr = format(start, 'yyyy-MM-dd');
      const txsForDay = transactions.filter((tx) => tx.date === dateStr);

      setSelectedDate(start);
      setDayTransactions(txsForDay);
      setIsModalOpen(true);
    },
    [transactions],
  );

  // 4. 點擊事件（開啟編輯 Sheet） - 目前先用 console.log
  const handleEditTransaction = useCallback((id: string) => {
    console.log('編輯交易:', id);
  }, []);

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
    <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800 overflow-hidden ring-1 ring-slate-100 dark:ring-slate-900">
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
    </div>
  );
}
