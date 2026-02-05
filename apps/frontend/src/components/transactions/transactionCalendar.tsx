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

// Setup Localizer
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
  
  // Sync internal date with URL
  const dateParam = searchParams.get('date');
  const [date, setDate] = useState(dateParam ? new Date(dateParam) : new Date());

  useEffect(() => {
    if (dateParam) {
      setDate(new Date(dateParam));
    }
  }, [dateParam]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dayTransactions, setDayTransactions] = useState<TransactionType[]>([]);

  // 1. Transform Transactions to Calendar Events
  const events = useMemo(() => {
    return transactions
      .filter((tx) => {
        // Filter out incoming transfers (only show outgoing side of transfer)
        // Spec 3.2: WHERE NOT (targetAccountId IS NOT NULL AND type = 'INCOME')
        if (isIncomingTransfer(tx)) return false;
        return true;
      })
      .map((tx): CalendarEventType => {
        // Spec 3.1: Force UTC to avoid timezone issues
        // format: YYYY-MM-DD THH:mm:ss Z
        const dateTimeStr = `${tx.date}T${tx.time}Z`;
        const dateTime = new Date(dateTimeStr);
        
        return {
          id: tx.id || '',
          title: tx.description || 'Transaction',
          start: dateTime,
          end: dateTime,
          allDay: false, // Transactions are point-in-time
          resource: tx,
          type: tx.type,
          amount: tx.amount,
          isTransfer: isOperateTransaction(tx),
        };
      });
  }, [transactions]);

  // Handle Navigation
  const onNavigate = useCallback((newDate: Date) => {
    setDate(newDate);
    const newDateStr = format(newDate, 'yyyy-MM-dd');
    const params = new URLSearchParams(searchParams.toString());
    params.set('date', newDateStr);
    router.push(`${pathname}?${params.toString()}`);
  }, [pathname, router, searchParams]);

  // 2. Drag & Drop Handler
  const onEventDrop = useCallback(
    async ({ event, start }: { event: CalendarEventType; start: string | Date }) => {
      const newDate = format(new Date(start), 'yyyy-MM-dd');
      
      // Optimistic Update (UI will update when parent fetches new data, but we can show loading)
      toast.info('Updating Transaction...', {
        description: `Moving to ${newDate}`,
      });

      try {
        // Call Mock API
        const res = await fetch(`http://localhost:3000/api/transactions/${event.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: newDate }),
        });

        if (!res.ok) throw new Error('Failed to update');

        const updatedTx = await res.json();
        
        toast.success('Success', {
          description: 'Transaction date updated.',
        });

        // Trigger Refresh (In real app, we would invalidate query)
        // For now, assume page reload or parent re-fetch will happen.
        // Since this is MSW task, we might rely on SWR/React Query invalidation, 
        // but since we receive props, we assume parent updates.
        // For prototype, we can't force parent update easily without a callback.
        // We'll leave it as toast for now.
        router.refresh(); // Refresh server components
        
      } catch (error) {
        toast.error('Error', {
          description: 'Failed to move transaction.',
        });
      }
    },
    [toast, router],
  );

  // 3. Slot Select (Click Day -> Open Modal)
  const onSelectSlot = useCallback(
    ({ start }: { start: Date }) => {
      // Find transactions for this day
      const dateStr = format(start, 'yyyy-MM-dd');
      const txsForDay = transactions.filter((tx) => tx.date === dateStr);
      
      setSelectedDate(start);
      setDayTransactions(txsForDay);
      setIsModalOpen(true);
    },
    [transactions],
  );

  // 4. Event Click -> Open Edit Sheet
  const onSelectEvent = useCallback(
    (event: CalendarEventType) => {
      onEditTransaction(event.id);
    },
    [onEditTransaction],
  );

  // 5. Custom Event Component
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
