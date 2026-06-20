'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  AuditAction,
  AuditEntityType,
  AuditLogType,
} from '@repo/shared';
import { getAuditLogs } from '@/services/auditLog';
import { cn } from '@/lib/utils';
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  History,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const ACTION_META: Record<
  AuditAction,
  { label: string; icon: typeof Plus; cls: string }
> = {
  [AuditAction.CREATE]: {
    label: '新增',
    icon: Plus,
    cls: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 ring-emerald-500/30',
  },
  [AuditAction.UPDATE]: {
    label: '修改',
    icon: Pencil,
    cls: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 ring-amber-500/30',
  },
  [AuditAction.DELETE]: {
    label: '刪除',
    icon: Trash2,
    cls: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 ring-rose-500/30',
  },
};

const ENTITY_LABEL: Record<AuditEntityType, string> = {
  [AuditEntityType.TRANSACTION]: '交易',
  [AuditEntityType.TRANSFER]: '轉帳',
  [AuditEntityType.ACCOUNT]: '帳戶',
  [AuditEntityType.CATEGORY]: '分類',
  [AuditEntityType.TAG]: '標籤',
  [AuditEntityType.BUDGET]: '預算',
};

const PAGE_SIZE = 20;

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

const fmtVal = (v: unknown) => {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

function AuditRow({ log }: { log: AuditLogType }) {
  const [open, setOpen] = useState(false);
  const meta = ACTION_META[log.action];
  const Icon = meta.icon;
  const hasDetail = log.changes.length > 0 || log.before || log.after;

  return (
    <li className="rounded-xl border border-slate-200/60 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-sm overflow-hidden">
      <button
        type="button"
        onClick={() => hasDetail && setOpen((o) => !o)}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3 text-left',
          hasDetail && 'hover:bg-slate-500/5 cursor-pointer',
        )}
      >
        <span
          className={cn(
            'flex items-center gap-1 shrink-0 rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-inset',
            meta.cls,
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {meta.label}
        </span>
        <span className="shrink-0 rounded-md bg-slate-500/10 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300">
          {ENTITY_LABEL[log.entityType] ?? log.entityType}
        </span>
        <span className="flex-1 truncate text-sm text-slate-700 dark:text-slate-200">
          {log.summary || log.entityId}
        </span>
        <span className="shrink-0 text-xs text-slate-400 tabular-nums">
          {fmtTime(log.createdAt)}
        </span>
        {hasDetail && (
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-slate-400 transition-transform',
              open && 'rotate-180',
            )}
          />
        )}
      </button>

      {open && (
        <div className="border-t border-slate-200/60 dark:border-white/10 px-4 py-3 text-xs space-y-2 bg-slate-50/60 dark:bg-black/20">
          {log.action === AuditAction.UPDATE && log.changes.length > 0 ? (
            <table className="w-full">
              <tbody>
                {log.changes.map((c) => (
                  <tr key={c.field} className="align-top">
                    <td className="py-0.5 pr-3 font-mono text-slate-500 whitespace-nowrap">
                      {c.field}
                    </td>
                    <td className="py-0.5 pr-2 text-rose-500 line-through break-all">
                      {fmtVal(c.from)}
                    </td>
                    <td className="py-0.5 pr-2 text-slate-400">→</td>
                    <td className="py-0.5 text-emerald-600 dark:text-emerald-400 break-all">
                      {fmtVal(c.to)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <pre className="max-h-60 overflow-auto rounded-lg bg-slate-900/90 p-3 text-[11px] leading-relaxed text-slate-200">
              {JSON.stringify(
                log.action === AuditAction.DELETE ? log.before : log.after,
                null,
                2,
              )}
            </pre>
          )}
          <p className="font-mono text-[10px] text-slate-400">
            id: {log.entityId}
          </p>
        </div>
      )}
    </li>
  );
}

export function AuditLogPanel() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<AuditAction | undefined>();
  const [entityType, setEntityType] = useState<AuditEntityType | undefined>();

  const { data, isLoading, error } = useSWR(
    ['/audit-logs', page, action, entityType],
    () => getAuditLogs({ page, limit: PAGE_SIZE, action, entityType }),
    { keepPreviousData: true },
  );

  const reset = (fn: () => void) => {
    fn();
    setPage(1);
  };

  const items = data?.items ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-4">
      {/* 篩選列 */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterGroup
          label="動作"
          options={[
            { value: undefined, label: '全部' },
            { value: AuditAction.CREATE, label: '新增' },
            { value: AuditAction.UPDATE, label: '修改' },
            { value: AuditAction.DELETE, label: '刪除' },
          ]}
          active={action}
          onSelect={(v) => reset(() => setAction(v as AuditAction | undefined))}
        />
        <span className="mx-1 h-5 w-px bg-slate-300/50 dark:bg-white/10" />
        <FilterGroup
          label="類型"
          options={[
            { value: undefined, label: '全部' },
            { value: AuditEntityType.TRANSACTION, label: '交易' },
            { value: AuditEntityType.TRANSFER, label: '轉帳' },
            { value: AuditEntityType.ACCOUNT, label: '帳戶' },
            { value: AuditEntityType.CATEGORY, label: '分類' },
            { value: AuditEntityType.TAG, label: '標籤' },
            { value: AuditEntityType.BUDGET, label: '預算' },
          ]}
          active={entityType}
          onSelect={(v) =>
            reset(() => setEntityType(v as AuditEntityType | undefined))
          }
        />
      </div>

      {/* 清單 */}
      {error ? (
        <p className="py-10 text-center text-sm text-rose-500">
          載入失敗：{(error as Error).message}
        </p>
      ) : isLoading && !data ? (
        <p className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> 載入中…
        </p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-slate-400">
          <History className="h-8 w-8 opacity-40" />
          <p className="text-sm">尚無變更紀錄</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((log) => (
            <AuditRow key={log.id} log={log} />
          ))}
        </ul>
      )}

      {/* 分頁 */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 text-sm text-slate-500">
          <span>
            共 {pagination.total} 筆 · 第 {pagination.page}/
            {pagination.totalPages} 頁
          </span>
          <div className="flex gap-1">
            <PagerButton
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </PagerButton>
            <PagerButton
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </PagerButton>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterGroup<T>({
  label,
  options,
  active,
  onSelect,
}: {
  label: string;
  options: { value: T | undefined; label: string }[];
  active: T | undefined;
  onSelect: (v: T | undefined) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="mr-1 text-xs text-slate-400">{label}</span>
      {options.map((opt) => (
        <button
          key={opt.label}
          type="button"
          onClick={() => onSelect(opt.value)}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer',
            active === opt.value
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
              : 'text-slate-500 hover:bg-slate-500/10',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function PagerButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-md border border-slate-200/60 dark:border-white/10 p-1.5 text-slate-600 dark:text-slate-300 enabled:hover:bg-slate-500/10 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
    >
      {children}
    </button>
  );
}
