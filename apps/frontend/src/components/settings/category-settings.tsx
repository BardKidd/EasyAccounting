'use client';

import { CategoryType, MainType } from '@repo/shared';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';

interface CategorySettingsProps {
  categories: CategoryType[];
}

export function CategorySettings({ categories }: CategorySettingsProps) {
  // Separate by type
  const incomeCategories = categories.filter((c) => c.type === MainType.INCOME);
  const expenseCategories = categories.filter(
    (c) => c.type === MainType.EXPENSE
  );

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>支出分類</CardTitle>
          <CardDescription>管理您的支出類別</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {expenseCategories.map((cat) => (
              <Badge key={cat.id} variant="secondary" className="px-3 py-1">
                {cat.name}
              </Badge>
            ))}
            <Button variant="outline" size="sm" className="h-6 rounded-full">
              <Plus className="mr-1 h-3 w-3" />
              新增
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>收入分類</CardTitle>
          <CardDescription>管理您的收入類別</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {incomeCategories.map((cat) => (
              <Badge key={cat.id} variant="secondary" className="px-3 py-1">
                {cat.name}
              </Badge>
            ))}
            <Button variant="outline" size="sm" className="h-6 rounded-full">
              <Plus className="mr-1 h-3 w-3" />
              新增
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 
         Note: This is a simplified view. 
         Real implementation would probably list sub-categories 
         or allow editing/deleting/reordering.
         The user said "可以在里面放使用者自己自訂的分類", so adding "New" is key.
      */}
    </div>
  );
}
