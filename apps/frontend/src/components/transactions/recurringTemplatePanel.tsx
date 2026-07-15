'use client';

import { useEffect, useState } from 'react';
import {
  format,
  addMonths,
  addWeeks,
  addYears,
  parseISO,
  setDate,
  getDaysInMonth,
} from 'date-fns';
import { zhTW } from 'date-fns/locale';
import {
  RefreshCw,
  Pause,
  X,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
} from 'lucide-react';
import {
  RecurringFrequency,
  RecurringTemplateStatus,
  RecurringTemplateType,
  CategoryType,
  AccountType,
  TransactionType,
} from '@repo/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MobileRowActions } from '@/components/ui/mobile-row-actions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import services from '@/services';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { TransactionSheet } from './transactionSheet';

const UPCOMING_PREVIEW_DAYS = 5;

/** 前端推算下 N 筆日期（與後端 calcNextExecutionDate 邏輯一致） */
function calcNextDates(
  template: RecurringTemplateType,
  count: number,
): string[] {
  const dates: string[] = [];
  let current = parseISO(template.nextExecutionDate);
  const dayOfMonth = (template as any).dayOfMonth as number | null;
  const monthDay = (template as any).monthDay as string | null;

  for (let i = 0; i < count; i++) {
    dates.push(format(current, 'yyyy-MM-dd'));

    if (template.frequency === RecurringFrequency.WEEKLY) {
      current = addWeeks(current, 1);
    } else if (template.frequency === RecurringFrequency.MONTHLY) {
      const originalDay = dayOfMonth ?? current.getDate();
      const next = addMonths(current, 1);
      const daysInNext = getDaysInMonth(next);
      current = setDate(next, Math.min(originalDay, daysInNext));
    } else if (template.frequency === RecurringFrequency.YEARLY) {
      current = addYears(current, 1);
    }
  }
  return dates;
}

const FREQ_LABEL: Record<RecurringFrequency, string> = {
  [RecurringFrequency.WEEKLY]: '每週',
  [RecurringFrequency.MONTHLY]: '每月',
  [RecurringFrequency.YEARLY]: '每年',
};

interface RecurringTemplatePanelProps {
  initialTemplates?: RecurringTemplateType[];
  categories?: CategoryType[];
  accounts?: AccountType[];
  showCreateButton?: boolean;
}

export function RecurringTemplatePanel({
  initialTemplates = [],
  categories = [],
  accounts = [],
  showCreateButton = false,
}: RecurringTemplatePanelProps) {
  const router = useRouter();
  const [templates, setTemplates] =
    useState<RecurringTemplateType[]>(initialTemplates);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  // Edit State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTemplate, setEditTemplate] =
    useState<RecurringTemplateType | null>(null);

  // Create State
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Sync with server data (when router.refresh() happens)
  useEffect(() => {
    setTemplates(initialTemplates);
  }, [initialTemplates]);

  const handleArchive = async (templateId: string) => {
    setLoading(true);
    try {
      await services.archiveRecurringTemplate(templateId);
      toast.success('週期規則已暫停');
      router.refresh();
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === templateId
            ? { ...t, status: RecurringTemplateStatus.ARCHIVED }
            : t,
        ),
      );
    } catch {
      toast.error('操作失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async (templateId: string) => {
    setLoading(true);
    try {
      await services.resumeRecurringTemplate(templateId);
      toast.success('週期規則已恢復');
      router.refresh();
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === templateId
            ? { ...t, status: RecurringTemplateStatus.ACTIVE }
            : t,
        ),
      );
    } catch {
      toast.error('操作失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      const res = await services.cancelRecurringTemplate(id, {});
      if (res.isSuccess) {
        toast.success('已刪除此週期規則');
        setTemplates((prev) => prev.filter((t) => t.id !== id));
      } else {
        toast.error(res.message || '刪除失敗');
      }
    } catch (error) {
      toast.error('刪除失敗');
    } finally {
      setLoading(false);
      setDeleteId(null);
    }
  };

  if (templates.length === 0 && !showCreateButton) return null;

  return (
    <div className="space-y-4 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <RefreshCw className="h-4 w-4" />
          <span>週期性交易規則</span>
        </div>
        {showCreateButton && (
          <Button
            onClick={() => setIsCreateOpen(true)}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            新增週期事件
          </Button>
        )}
      </div>

      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-slate-500 border border-dashed rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <RefreshCw className="h-8 w-8 mb-3 opacity-20" />
          <p className="text-sm">目前沒有任何週期性交易規則</p>
          <p className="text-xs opacity-60 mt-1">
            設定週期性交易，讓系統自動幫您記帳
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map((template) => {
            const attrs = template.baseTransactionAttrs;
            const isActive = template.status === RecurringTemplateStatus.ACTIVE;
            const isExpanded = expanded[template.id] ?? false;
            const upcomingDates = isActive
              ? calcNextDates(template, UPCOMING_PREVIEW_DAYS)
              : [];

            return (
              <div
                key={template.id}
                className="rounded-lg border bg-card p-3 space-y-2"
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant={isActive ? 'default' : 'secondary'}>
                      {isActive ? '執行中' : '已暫停'}
                    </Badge>
                    <span className="text-sm font-medium truncate">
                      {attrs.description || '無備注'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {FREQ_LABEL[template.frequency]}
                    </span>

                    {/* 桌面：維持原本的行內動作按鈕（hover 可見） */}
                    <div className="hidden md:flex items-center gap-1">
                      {isActive ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={loading}
                          onClick={() => handleArchive(template.id)}
                          title="暫停"
                        >
                          <Pause className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={loading}
                          onClick={() => handleResume(template.id)}
                          title="恢復"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={loading}
                        onClick={() => {
                          setEditTemplate(template);
                          setIsEditOpen(true);
                        }}
                        title="編輯"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        disabled={loading}
                        onClick={() => setDeleteId(template.id)}
                        title="刪除設定"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* 手機：收合成單顆 44px kebab，點開底部 Sheet（≥52px 動作列） */}
                    <MobileRowActions
                      triggerClassName="md:hidden"
                      title="週期規則操作"
                      actions={[
                        isActive
                          ? {
                              label: '暫停',
                              icon: Pause,
                              onSelect: () => handleArchive(template.id),
                              disabled: loading,
                            }
                          : {
                              label: '恢復',
                              icon: RefreshCw,
                              onSelect: () => handleResume(template.id),
                              disabled: loading,
                            },
                        {
                          label: '編輯',
                          icon: Pencil,
                          onSelect: () => {
                            setEditTemplate(template);
                            setIsEditOpen(true);
                          },
                          disabled: loading,
                        },
                        {
                          label: '刪除設定',
                          icon: Trash2,
                          onSelect: () => setDeleteId(template.id),
                          destructive: true,
                          disabled: loading,
                        },
                      ]}
                    />

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 md:h-7 md:w-7"
                      onClick={() =>
                        setExpanded((prev) => ({
                          ...prev,
                          [template.id]: !isExpanded,
                        }))
                      }
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="pl-1 space-y-1">
                    <div className="text-xs text-muted-foreground">
                      金額：${attrs.amount.toLocaleString()}
                      {template.totalOccurrences !== null
                        ? `  ·  進度：${template.currentOccurrence}/${template.totalOccurrences} 筆`
                        : '  ·  無限週期'}
                    </div>

                    {isActive && upcomingDates.length > 0 && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">
                          預計執行日期：
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {upcomingDates.map((d) => (
                            <Badge
                              key={d}
                              variant="outline"
                              className="text-xs font-normal"
                            >
                              {format(parseISO(d), 'M/d (eee)', {
                                locale: zhTW,
                              })}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <TransactionSheet
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          router.refresh();
        }}
        categories={categories}
        accounts={accounts}
        mode="template"
      />

      {/* 刪除確認用 */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要刪除這筆週期性規則嗎？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作會讓此規則不再產生未來的交易。已經寫入記帳紀錄的歷史交易將不會受到影響。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (deleteId) handleDelete(deleteId);
              }}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              disabled={loading}
            >
              {loading ? '刪除中...' : '確定刪除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 編輯主檔用 */}
      <TransactionSheet
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setEditTemplate(null);
          router.refresh();
        }}
        categories={categories}
        accounts={accounts}
        mode="template"
        transaction={
          editTemplate
            ? ({
                id: 'dummy-id-for-template-edit',
                ...editTemplate.baseTransactionAttrs,
                recurringTemplateId: editTemplate.id,
                date: editTemplate.nextExecutionDate,
              } as TransactionType)
            : null
        }
        hideDelete
        recurringTemplate={editTemplate}
      />
    </div>
  );
}
