'use client';

import { Container } from '@/components/ui/container';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Plus, Trash2, Edit2 } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { budgetService } from '@/services/mock/budgetMock';
import { BudgetDetail, BudgetCategory } from '@/types/budget';
import { formatCurrency, cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { CategoryType, RootType } from '@repo/shared';
import { getCategories } from '@/services/category';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

export default function BudgetDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  const [budget, setBudget] = useState<BudgetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryType[]>([]);
  
  // Sub-budget Form State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Edit Sub-budget State
  const [editingSub, setEditingSub] = useState<BudgetCategory | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await budgetService.getBudgetById(id);
      if (res.isSuccess) {
        setBudget(res.data);
      } else {
        toast.error('找不到預算');
        router.push('/budgets');
      }

      // Fetch Categories (Mock fallback)
      try {
        const catData = await getCategories();
        setCategories(catData);
      } catch (e) {
        console.warn('Using mock categories');
        setCategories([
            { id: 1, name: '餐飲', icon: 'utensils', color: '#ff0000', type: 'EXPENSE', children: [], createdAt: '', updatedAt: '' },
            { id: 2, name: '交通', icon: 'car', color: '#00ff00', type: 'EXPENSE', children: [], createdAt: '', updatedAt: '' },
            { id: 3, name: '娛樂', icon: 'gamepad', color: '#0000ff', type: 'EXPENSE', children: [], createdAt: '', updatedAt: '' },
        ] as any);
      }
    } catch (error) {
      toast.error('載入失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const handleAddSubBudget = async () => {
    if (!selectedCategory || !amount) return;
    setSubmitting(true);
    try {
        await budgetService.addBudgetCategory(id, Number(selectedCategory), Number(amount));
        toast.success('新增成功');
        setIsAddOpen(false);
        setSelectedCategory('');
        setAmount('');
        // Refresh
        const res = await budgetService.getBudgetById(id);
        if (res.isSuccess) setBudget(res.data);
    } catch (e) {
        toast.error('新增失敗');
    } finally {
        setSubmitting(false);
    }
  };

  const handleUpdateSubBudget = async () => {
      if (!editingSub || !editAmount) return;
      setSubmitting(true);
      try {
          await budgetService.updateBudgetCategory(editingSub.id, Number(editAmount));
          toast.success('更新成功');
          setEditingSub(null);
          setEditAmount('');
          // Refresh
          const res = await budgetService.getBudgetById(id);
          if (res.isSuccess) setBudget(res.data);
      } catch (e) {
          toast.error('更新失敗');
      } finally {
          setSubmitting(false);
      }
  }

  const handleDeleteSubBudget = async (subId: number) => {
      if (!confirm('確定要刪除此子預算嗎？')) return;
      try {
          await budgetService.deleteBudgetCategory(subId);
          toast.success('刪除成功');
          // Refresh
          const res = await budgetService.getBudgetById(id);
          if (res.isSuccess) setBudget(res.data);
      } catch (e) {
          toast.error('刪除失敗');
      }
  }

  if (loading) return (
      <Container className="py-8 space-y-8 max-w-[1000px] px-4">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-[200px] w-full" />
      </Container>
  );

  if (!budget) return null;

  // Filter available categories: 
  // 1. Must be Main Category (we assume fetched categories are roots or check children)
  // 2. Not already in budget.categories
  const usedCategoryIds = budget.categories.map(c => c.categoryId);
  
  // Flatten if categories structure is nested, but requirement says "Select MainCategory".
  // Assuming 'categories' state contains Root types (EXPENSE/INCOME).
  // We need to extract MainCategories from EXPENSE root.
  const expenseRoot = categories.find(c => c.type === RootType.EXPENSE);
  const mainCategories = expenseRoot?.children || categories.filter(c => c.type === RootType.EXPENSE); // Fallback for simple list

  const availableCategories = mainCategories.filter(c => !usedCategoryIds.includes(Number(c.id)));

  // Mock usage for sub-budgets (random for now as spec doesn't say we need full calculation logic in mock)
  const getSubUsage = (amount: number) => {
      const spent = Math.floor(Math.random() * amount);
      const percent = (spent / amount) * 100;
      return { spent, percent };
  };

  const { usage } = budget;
  let statusColor = 'bg-green-500';
  if (usage.usageRate >= 100) statusColor = 'bg-red-500';
  else if (usage.usageRate >= 80) statusColor = 'bg-orange-500';

  return (
    <Container className="py-8 space-y-8 max-w-[1000px] px-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/budgets')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
            <h2 className="text-2xl font-bold font-playfair">{budget.name}</h2>
            <p className="text-muted-foreground text-sm">{budget.description}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>預算總覽</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="flex items-end justify-between">
                <div>
                    <div className="text-3xl font-bold">{formatCurrency(usage.spent)}</div>
                    <div className="text-muted-foreground text-sm">已花費</div>
                </div>
                <div className="text-right">
                    <div className="text-xl font-medium text-muted-foreground">/ {formatCurrency(usage.available)}</div>
                    <div className="text-sm text-muted-foreground">總額度</div>
                </div>
            </div>
            
            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span className={cn(usage.usageRate >= 100 ? "text-red-500" : "text-primary")}>
                        {usage.usageRate.toFixed(1)}% 使用率
                    </span>
                    <span>剩餘 {formatCurrency(usage.remaining)}</span>
                </div>
                <Progress value={Math.min(usage.usageRate, 100)} className={cn("h-3", `[&>[data-slot=progress-indicator]]:${statusColor}`)} />
            </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
          <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold font-playfair">子預算 (分類配額)</h3>
              <Button onClick={() => setIsAddOpen(true)} size="sm">
                  <Plus className="mr-2 h-4 w-4" /> 新增子預算
              </Button>
          </div>

          <div className="grid gap-4">
              {budget.categories.map(cat => {
                  const catName = categories.flatMap(r => r.children || [r]).find(c => Number(c.id) === cat.categoryId)?.name || `Category ${cat.categoryId}`;
                  const { spent, percent } = getSubUsage(cat.amount);
                  
                  return (
                      <Card key={cat.id} className="overflow-hidden">
                          <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                  <div className="font-medium">{catName}</div>
                                  <div className="flex gap-2">
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                                          setEditingSub(cat);
                                          setEditAmount(cat.amount.toString());
                                      }}>
                                          <Edit2 className="h-3 w-3" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteSubBudget(cat.id)}>
                                          <Trash2 className="h-3 w-3" />
                                      </Button>
                                  </div>
                              </div>
                              <div className="flex justify-between text-sm mb-1">
                                  <span>{formatCurrency(spent)}</span>
                                  <span>{formatCurrency(cat.amount)}</span>
                              </div>
                              <Progress value={percent} className="h-2" />
                          </CardContent>
                      </Card>
                  );
              })}
              {budget.categories.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground bg-slate-50 dark:bg-slate-900 rounded-lg border border-dashed">
                      尚未設定子預算
                  </div>
              )}
          </div>
      </div>

      {/* Add Sub-budget Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>新增子預算</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                  <div className="space-y-2">
                      <label className="text-sm font-medium">主分類</label>
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                          <SelectTrigger>
                              <SelectValue placeholder="選擇主分類" />
                          </SelectTrigger>
                          <SelectContent>
                              {availableCategories.map(c => (
                                  <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                              ))}
                              {availableCategories.length === 0 && (
                                  <div className="p-2 text-sm text-muted-foreground text-center">無可用分類</div>
                              )}
                          </SelectContent>
                      </Select>
                  </div>
                  <div className="space-y-2">
                      <label className="text-sm font-medium">配額金額</label>
                      <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />
                  </div>
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddOpen(false)}>取消</Button>
                  <Button onClick={handleAddSubBudget} disabled={submitting || !selectedCategory || !amount}>新增</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      {/* Edit Sub-budget Dialog */}
      <Dialog open={!!editingSub} onOpenChange={(open) => !open && setEditingSub(null)}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>編輯子預算</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                   <div className="space-y-2">
                      <label className="text-sm font-medium">配額金額</label>
                      <Input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} placeholder="0" />
                  </div>
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setEditingSub(null)}>取消</Button>
                  <Button onClick={handleUpdateSubBudget} disabled={submitting || !editAmount}>更新</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </Container>
  );
}
