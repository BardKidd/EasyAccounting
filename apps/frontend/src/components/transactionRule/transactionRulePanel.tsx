'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import {
  CategoryType,
  RootType,
  RuleMatchMode,
  TransactionRuleListItem,
  createTransactionRuleSchema,
} from '@repo/shared';
import { getErrorMessage } from '@/lib/utils';
import { getCategories } from '@/services/category';
import {
  getRules,
  createRule,
  updateRule,
  deleteRule,
  reorderRules,
} from '@/services/transactionRule';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { TagMultiSelect } from '@/components/transactions/tagMultiSelect';
import { Trash2, Plus, Pencil, ArrowUp, ArrowDown, SlidersHorizontal } from 'lucide-react';
import {
  MobileRowActions,
  type MobileRowAction,
} from '@/components/ui/mobile-row-actions';

const MATCH_MODE_LABEL: Record<RuleMatchMode, string> = {
  [RuleMatchMode.CONTAINS]: '包含',
  [RuleMatchMode.EQUALS]: '等於',
  [RuleMatchMode.STARTS_WITH]: '開頭為',
};

// 攤平分類（支出 + 收入，主 / 主｜子）供動作下拉。
function flattenCategories(categories: CategoryType[] | undefined) {
  const opts: { id: string; label: string }[] = [];
  for (const root of categories || []) {
    if (root.type !== RootType.EXPENSE && root.type !== RootType.INCOME) continue;
    const prefix = root.type === RootType.INCOME ? '收入' : '支出';
    for (const main of root.children || []) {
      if (main.children && main.children.length > 0) {
        for (const sub of main.children) {
          opts.push({ id: sub.id, label: `${prefix}｜${main.name}／${sub.name}` });
        }
      } else {
        opts.push({ id: main.id, label: `${prefix}｜${main.name}` });
      }
    }
  }
  return opts;
}

interface FormState {
  name: string;
  descriptionMatch: string;
  matchMode: RuleMatchMode;
  amountMin: string;
  amountMax: string;
  transactionType: '' | RootType.EXPENSE | RootType.INCOME;
  setCategoryId: string;
  tagIds: string[];
}

const emptyForm: FormState = {
  name: '',
  descriptionMatch: '',
  matchMode: RuleMatchMode.CONTAINS,
  amountMin: '',
  amountMax: '',
  transactionType: '',
  setCategoryId: '',
  tagIds: [],
};

const conditionSummary = (r: TransactionRuleListItem) => {
  const parts: string[] = [];
  if (r.descriptionMatch)
    parts.push(`描述${MATCH_MODE_LABEL[r.matchMode]}「${r.descriptionMatch}」`);
  if (r.amountMin != null || r.amountMax != null) {
    const lo = r.amountMin != null ? r.amountMin : '';
    const hi = r.amountMax != null ? r.amountMax : '';
    parts.push(`金額 ${lo}~${hi}`);
  }
  if (r.transactionType) parts.push(`類型=${r.transactionType}`);
  return parts.length ? parts.join('、') : '（無條件）';
};

export function TransactionRulePanel() {
  const [includeDisabled, setIncludeDisabled] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);
  // 編輯規則時，若 setCategoryId 指向的分類已軟刪 / 變非葉節點（不在下拉選項），
  // 保留一個備援選項避免下拉顯示空白（誤導成未選分類）。
  const [fallbackCategory, setFallbackCategory] = useState<{
    id: string;
    label: string;
  } | null>(null);
  // 手機刪除確認：MobileRowActions 選取後會用 SheetClose 關閉自身 Sheet，
  // 無法沿用桌面「每列 AlertDialogTrigger」，故改用單一受控 AlertDialog。
  const [mobileDeleteId, setMobileDeleteId] = useState<string | null>(null);

  const {
    data: rules,
    isLoading,
    error,
    mutate,
  } = useSWR(['rules', includeDisabled], () => getRules(includeDisabled));
  const { data: categories } = useSWR('categories', getCategories);
  const options = useMemo(() => flattenCategories(categories), [categories]);

  const patch = (p: Partial<FormState>) => setForm((f) => ({ ...f, ...p }));

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setFallbackCategory(null);
    setDialogOpen(true);
  };

  const openEdit = (r: TransactionRuleListItem) => {
    setEditId(r.id);
    setForm({
      name: r.name ?? '',
      descriptionMatch: r.descriptionMatch ?? '',
      matchMode: r.matchMode,
      amountMin: r.amountMin != null ? String(r.amountMin) : '',
      amountMax: r.amountMax != null ? String(r.amountMax) : '',
      transactionType: (r.transactionType as any) ?? '',
      setCategoryId: r.setCategoryId ?? '',
      tagIds: r.tags.map((t) => t.id),
    });
    // 現有分類不在下拉選項（軟刪 / 非葉）時提供備援項，避免下拉顯示空白。
    setFallbackCategory(
      r.setCategoryId && !options.some((o) => o.id === r.setCategoryId)
        ? { id: r.setCategoryId, label: r.setCategoryName ?? '（目前分類）' }
        : null,
    );
    setDialogOpen(true);
  };

  const buildPayload = () => {
    const draft = {
      name: form.name.trim() || null,
      descriptionMatch: form.descriptionMatch.trim() || null,
      matchMode: form.matchMode,
      amountMin: form.amountMin === '' ? null : Number(form.amountMin),
      amountMax: form.amountMax === '' ? null : Number(form.amountMax),
      transactionType: form.transactionType || null,
      setCategoryId: form.setCategoryId || null,
      tagIds: form.tagIds,
    };
    // R13：前端表單與後端 validate middleware 共用同一 @repo/shared schema（單一真實來源），
    // 條件/動作/金額區間/長度/標籤數上限全走 schema，不再手刻不完整檢查。
    const parsed = createTransactionRuleSchema.safeParse(draft);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? '輸入不合法' };
    }
    return { payload: parsed.data };
  };

  const submit = async () => {
    const { payload, error: verr } = buildPayload();
    if (verr || !payload) {
      if (verr) toast.error(verr);
      return;
    }
    setSaving(true);
    try {
      const res = editId
        ? await updateRule(editId, payload)
        : await createRule(payload);
      if (!res.isSuccess) throw new Error(res.message);
      toast.success(editId ? '規則已更新' : '規則已建立');
      setDialogOpen(false);
      await mutate();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const runToggle = async (r: TransactionRuleListItem, v: boolean) => {
    setBusyId(r.id);
    try {
      const res = await updateRule(r.id, { isEnabled: v });
      if (!res.isSuccess) throw new Error(res.message);
      await mutate();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const runDelete = async (id: string) => {
    setBusyId(id);
    try {
      const res = await deleteRule(id);
      if (!res.isSuccess) throw new Error(res.message);
      toast.success('規則已刪除');
      await mutate();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    // includeDisabled 關閉時列表只含啟用規則，reorder 只送這些 id 會讓被隱藏的停用規則
    // priority 殘留 / 重複，故只在「顯示已停用」時允許排序；並防連點併發。
    if (!rules || reordering || !includeDisabled) return;
    const target = index + dir;
    if (target < 0 || target >= rules.length) return;
    const ids = rules.map((r) => r.id);
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
    setReordering(true);
    try {
      const res = await reorderRules(ids);
      if (!res.isSuccess) throw new Error(res.message);
      await mutate();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setReordering(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            顯示已停用
          </span>
          <Switch checked={includeDisabled} onCheckedChange={setIncludeDisabled} />
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1">
          <Plus className="h-4 w-4" /> 新增規則
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-rose-200 dark:border-rose-500/30 py-16 text-center">
          <p className="text-sm text-rose-600 dark:text-rose-400">
            載入規則失敗{error ? `：${getErrorMessage(error)}` : ''}
          </p>
          <Button variant="outline" size="sm" onClick={() => mutate()}>
            重試
          </Button>
        </div>
      ) : !rules || rules.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 py-16 text-center">
          <SlidersHorizontal className="h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            尚無規則。新增規則讓符合條件的交易自動分類 / 加標籤。
          </p>
        </div>
      ) : (
        <>
        <div className="hidden md:block rounded-2xl border border-slate-100 dark:border-white/5 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[70px]">順序</TableHead>
                <TableHead>規則</TableHead>
                <TableHead>條件</TableHead>
                <TableHead>動作</TableHead>
                <TableHead className="text-center">啟用</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((r, i) => (
                <TableRow key={r.id} className={r.isEnabled ? '' : 'opacity-60'}>
                  <TableCell>
                    <div
                      className="flex flex-col"
                      title={
                        !includeDisabled
                          ? '開啟「顯示已停用」後才能排序（避免打亂已停用規則順序）'
                          : undefined
                      }
                    >
                      <button
                        className="text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        disabled={i === 0 || reordering || !includeDisabled}
                        onClick={() => move(i, -1)}
                        aria-label="上移"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        className="text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        disabled={
                          i === rules.length - 1 || reordering || !includeDisabled
                        }
                        onClick={() => move(i, 1)}
                        aria-label="下移"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {r.name || <span className="text-slate-400">（未命名）</span>}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600 dark:text-slate-300 max-w-[240px]">
                    {conditionSummary(r)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1">
                      {r.setCategoryId && (
                        <Badge variant="secondary">
                          {r.setCategoryName ?? '（分類已刪除）'}
                        </Badge>
                      )}
                      {r.tags.map((t) => (
                        <Badge
                          key={t.id}
                          style={{ backgroundColor: t.color, color: '#fff' }}
                        >
                          {t.name}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={r.isEnabled}
                      disabled={busyId === r.id}
                      onCheckedChange={(v) => runToggle(r, v)}
                    />
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(r)}
                      aria-label="編輯"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={busyId === r.id}
                          aria-label="刪除"
                        >
                          <Trash2 className="h-4 w-4 text-rose-500" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>刪除規則</AlertDialogTitle>
                          <AlertDialogDescription>
                            確定刪除此規則？此後新交易將不再自動套用。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>取消</AlertDialogCancel>
                          <AlertDialogAction onClick={() => runDelete(r.id)}>
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

        {/* 手機：可點卡片列（隱藏會橫向捲動的表格，金額 / 條件 / 動作同屏一欄呈現） */}
        <div className="md:hidden space-y-2">
          {rules.map((r, i) => (
            <div
              key={r.id}
              className={`rounded-2xl border border-slate-200 dark:border-slate-800 p-3 ${
                r.isEnabled ? '' : 'opacity-60'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate font-medium">
                  {r.name || <span className="text-slate-400">（未命名）</span>}
                </span>
                <Switch
                  checked={r.isEnabled}
                  disabled={busyId === r.id}
                  onCheckedChange={(v) => runToggle(r, v)}
                />
                <MobileRowActions
                  actions={
                    [
                      {
                        label: '上移',
                        icon: ArrowUp,
                        onSelect: () => move(i, -1),
                        disabled: i === 0 || reordering || !includeDisabled,
                      },
                      {
                        label: '下移',
                        icon: ArrowDown,
                        onSelect: () => move(i, 1),
                        disabled:
                          i === rules.length - 1 ||
                          reordering ||
                          !includeDisabled,
                      },
                      {
                        label: '編輯',
                        icon: Pencil,
                        onSelect: () => openEdit(r),
                      },
                      {
                        label: '刪除',
                        icon: Trash2,
                        onSelect: () => setMobileDeleteId(r.id),
                        destructive: true,
                      },
                    ] satisfies MobileRowAction[]
                  }
                />
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {conditionSummary(r)}
              </p>
              {(r.setCategoryId || r.tags.length > 0) && (
                <div className="mt-2 flex flex-wrap items-center gap-1">
                  {r.setCategoryId && (
                    <Badge variant="secondary">
                      {r.setCategoryName ?? '（分類已刪除）'}
                    </Badge>
                  )}
                  {r.tags.map((t) => (
                    <Badge
                      key={t.id}
                      style={{ backgroundColor: t.color, color: '#fff' }}
                    >
                      {t.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        </>
      )}

      {/* 手機：刪除確認（受控，因 MobileRowActions 選取後自行以 SheetClose 關閉 Sheet） */}
      <AlertDialog
        open={!!mobileDeleteId}
        onOpenChange={(o) => !o && setMobileDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>刪除規則</AlertDialogTitle>
            <AlertDialogDescription>
              確定刪除此規則？此後新交易將不再自動套用。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                runDelete(mobileDeleteId!);
                setMobileDeleteId(null);
              }}
            >
              刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 建立 / 編輯 表單 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? '編輯規則' : '新增規則'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>名稱（選填）</Label>
              <Input
                value={form.name}
                onChange={(e) => patch({ name: e.target.value })}
                placeholder="例：星巴克 → 餐飲"
              />
            </div>

            <div className="rounded-lg border p-3 space-y-3">
              <p className="text-xs font-semibold text-slate-500">條件（皆須符合）</p>
              <div className="flex gap-2">
                <Select
                  value={form.matchMode}
                  onValueChange={(v) => patch({ matchMode: v as RuleMatchMode })}
                >
                  <SelectTrigger className="w-[110px] cursor-pointer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(RuleMatchMode).map((m) => (
                      <SelectItem key={m} value={m} className="cursor-pointer">
                        {MATCH_MODE_LABEL[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  className="flex-1"
                  value={form.descriptionMatch}
                  onChange={(e) => patch({ descriptionMatch: e.target.value })}
                  placeholder="描述關鍵字（如 starbucks）"
                />
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={form.amountMin}
                  onChange={(e) => patch({ amountMin: e.target.value })}
                  placeholder="金額下限"
                />
                <span className="text-slate-400">~</span>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={form.amountMax}
                  onChange={(e) => patch({ amountMax: e.target.value })}
                  placeholder="金額上限"
                />
              </div>
              <Select
                value={form.transactionType || 'any'}
                onValueChange={(v) =>
                  patch({ transactionType: v === 'any' ? '' : (v as any) })
                }
              >
                <SelectTrigger className="cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any" className="cursor-pointer">
                    類型：不限
                  </SelectItem>
                  <SelectItem value={RootType.EXPENSE} className="cursor-pointer">
                    類型：支出
                  </SelectItem>
                  <SelectItem value={RootType.INCOME} className="cursor-pointer">
                    類型：收入
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border p-3 space-y-3">
              <p className="text-xs font-semibold text-slate-500">動作（至少一項）</p>
              <div className="space-y-1.5">
                <Label>套用分類</Label>
                <Select
                  value={form.setCategoryId || 'none'}
                  onValueChange={(v) =>
                    patch({ setCategoryId: v === 'none' ? '' : v })
                  }
                >
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue placeholder="選擇分類" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="cursor-pointer">
                      不套用分類
                    </SelectItem>
                    {fallbackCategory &&
                      !options.some((o) => o.id === fallbackCategory.id) && (
                        <SelectItem
                          value={fallbackCategory.id}
                          className="cursor-pointer"
                        >
                          {fallbackCategory.label}（已刪除／不可選）
                        </SelectItem>
                      )}
                    {options.map((o) => (
                      <SelectItem key={o.id} value={o.id} className="cursor-pointer">
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>套用標籤</Label>
                <TagMultiSelect
                  value={form.tagIds}
                  onChange={(ids) => patch({ tagIds: ids })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? '儲存中…' : '儲存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
