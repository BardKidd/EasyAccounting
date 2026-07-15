'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { CategoryType, RootType, MerchantMappingListItem } from '@repo/shared';
import { getCategories } from '@/services/category';
import {
  getMerchantMappings,
  updateMerchantMapping,
  deleteMerchantMapping,
} from '@/services/merchantMapping';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Trash2, Store } from 'lucide-react';
import { cn } from '@/lib/utils';

// 攤平分類樹為可選項（支出：主 / 主｜子），供改分類下拉。
function useExpenseOptions(categories: CategoryType[] | undefined) {
  return useMemo(() => {
    const opts: { id: string; label: string; color: string | null }[] = [];
    for (const root of (categories || []).filter(
      (c) => c.type === RootType.EXPENSE,
    )) {
      for (const main of root.children || []) {
        if (main.children && main.children.length > 0) {
          for (const sub of main.children) {
            opts.push({
              id: sub.id,
              label: `${main.name}／${sub.name}`,
              color: sub.color ?? main.color,
            });
          }
        } else {
          opts.push({ id: main.id, label: main.name, color: main.color });
        }
      }
    }
    return opts;
  }, [categories]);
}

export function MerchantMappingPanel() {
  const [includeDisabled, setIncludeDisabled] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const {
    data: mappings,
    isLoading,
    error,
    mutate,
  } = useSWR(['merchant-mappings', includeDisabled], () =>
    getMerchantMappings(includeDisabled),
  );
  const { data: categories } = useSWR('categories', getCategories);
  const options = useExpenseOptions(categories);

  const runUpdate = async (
    id: string,
    patch: { categoryId?: string; isEnabled?: boolean },
    okMsg: string,
  ) => {
    setBusyId(id);
    try {
      const res = await updateMerchantMapping(id, patch);
      if (!res.isSuccess) throw new Error(res.message);
      toast.success(okMsg);
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '更新失敗');
    } finally {
      setBusyId(null);
    }
  };

  const runDelete = async (id: string) => {
    setBusyId(id);
    try {
      const res = await deleteMerchantMapping(id);
      if (!res.isSuccess) throw new Error(res.message);
      toast.success('對應已刪除');
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '刪除失敗');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <span className="text-sm text-slate-500 dark:text-slate-400">
          顯示已停用
        </span>
        <Switch
          checked={includeDisabled}
          onCheckedChange={setIncludeDisabled}
          aria-label="顯示已停用的對應"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-rose-200 dark:border-rose-500/30 py-16 text-center">
          <Store className="h-10 w-10 text-rose-300 dark:text-rose-500/60" />
          <p className="text-sm text-rose-600 dark:text-rose-400">
            載入商家分類失敗{error instanceof Error ? `：${error.message}` : ''}
          </p>
          <Button variant="outline" size="sm" onClick={() => mutate()}>
            重試
          </Button>
        </div>
      ) : !mappings || mappings.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 py-16 text-center">
          <Store className="h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            尚無商家分類對應。解析帳單並確認入帳後，系統會自動學習你的分類習慣。
          </p>
        </div>
      ) : (
        <>
        <div className="hidden md:block rounded-2xl border border-slate-100 dark:border-white/5 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>商家</TableHead>
                <TableHead>分類</TableHead>
                <TableHead className="text-center">學習次數</TableHead>
                <TableHead className="text-center">啟用</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.map((m: MerchantMappingListItem) => (
                <TableRow
                  key={m.id}
                  className={m.isEnabled ? '' : 'opacity-60'}
                >
                  <TableCell className="font-medium max-w-[240px] truncate">
                    {m.merchantName}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Select
                        value={m.categoryId}
                        onValueChange={(v) =>
                          runUpdate(m.id, { categoryId: v }, '分類已更新')
                        }
                        disabled={busyId === m.id}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="選擇分類" />
                        </SelectTrigger>
                        <SelectContent>
                          {/* 目前分類非現行葉節點選項（如原本無子分類的主分類後來新增子分類），
                              但分類仍存在時，補一個合成選項顯示現值，避免 Select 空白無提示。 */}
                          {m.categoryName !== null &&
                            !options.some((o) => o.id === m.categoryId) && (
                              <SelectItem value={m.categoryId}>
                                {m.categoryName}（目前）
                              </SelectItem>
                            )}
                          {options.map((o) => (
                            <SelectItem key={o.id} value={o.id}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {m.categoryName === null && (
                        <Badge variant="destructive">分類已刪除</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{m.matchCount}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={m.isEnabled}
                      disabled={busyId === m.id}
                      onCheckedChange={(v) =>
                        runUpdate(
                          m.id,
                          { isEnabled: v },
                          v ? '已啟用' : '已停用',
                        )
                      }
                      aria-label={m.isEnabled ? '停用此對應' : '啟用此對應'}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={busyId === m.id}
                          aria-label="刪除對應"
                        >
                          <Trash2 className="h-4 w-4 text-rose-500" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>刪除商家分類對應</AlertDialogTitle>
                          <AlertDialogDescription>
                            確定刪除「{m.merchantName}」的自動分類對應？此後解析帳單將不再自動套用此分類。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>取消</AlertDialogCancel>
                          <AlertDialogAction onClick={() => runDelete(m.id)}>
                            刪除
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* 手機：可觸控卡片列（分類 Select 全寬、金額/情境同屏、無橫向捲動） */}
        <div className="md:hidden space-y-2">
          {mappings.map((m: MerchantMappingListItem) => (
            <div
              key={m.id}
              className={cn(
                'rounded-2xl border border-slate-100 dark:border-white/5 bg-card p-3',
                !m.isEnabled && 'opacity-60',
              )}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                  <Store className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {m.merchantName}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary">學習 {m.matchCount} 次</Badge>
                    {m.categoryName === null && (
                      <Badge variant="destructive">分類已刪除</Badge>
                    )}
                  </div>
                </div>
                <Switch
                  checked={m.isEnabled}
                  disabled={busyId === m.id}
                  onCheckedChange={(v) =>
                    runUpdate(m.id, { isEnabled: v }, v ? '已啟用' : '已停用')
                  }
                  aria-label={m.isEnabled ? '停用此對應' : '啟用此對應'}
                />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Select
                  value={m.categoryId}
                  onValueChange={(v) =>
                    runUpdate(m.id, { categoryId: v }, '分類已更新')
                  }
                  disabled={busyId === m.id}
                >
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue placeholder="選擇分類" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* 目前分類非現行葉節點選項時，補一個合成選項顯示現值，避免 Select 空白無提示。 */}
                    {m.categoryName !== null &&
                      !options.some((o) => o.id === m.categoryId) && (
                        <SelectItem value={m.categoryId}>
                          {m.categoryName}（目前）
                        </SelectItem>
                      )}
                    {options.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 shrink-0"
                      disabled={busyId === m.id}
                      aria-label="刪除對應"
                    >
                      <Trash2 className="h-4 w-4 text-rose-500" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>刪除商家分類對應</AlertDialogTitle>
                      <AlertDialogDescription>
                        確定刪除「{m.merchantName}」的自動分類對應？此後解析帳單將不再自動套用此分類。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction onClick={() => runDelete(m.id)}>
                        刪除
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
        </>
      )}
    </div>
  );
}
