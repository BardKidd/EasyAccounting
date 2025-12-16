'use client';

import { useState } from 'react';
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
import { Plus, ChevronRight, ChevronDown, Folder, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategorySettingsProps {
  categories: CategoryType[];
}

function CategoryTreeItem({
  node,
  level = 0,
}: {
  node: CategoryType;
  level?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="select-none">
      <div
        className={cn(
          'flex items-center py-2 px-2 hover:bg-accent rounded-md cursor-pointer transition-colors',
          level > 0 && 'ml-4'
        )}
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center w-6 shrink-0 text-muted-foreground">
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )
          ) : (
            <div className="w-4" />
          )}
        </div>

        <div className="flex items-center gap-2 flex-1">
          {hasChildren ? (
            <Folder className="h-4 w-4 text-blue-500" />
          ) : (
            <Tag className="h-4 w-4 text-green-500" />
          )}
          <span className="text-sm font-medium">{node.name}</span>
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div className="border-l ml-5 pl-1 border-muted">
          {node.children.map((child) => (
            <CategoryTreeItem key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function CategorySettings({ categories }: CategorySettingsProps) {
  // Separate by type. Since categories is now a tree, top level nodes are the roots.
  const incomeTree = categories.filter((c) => c.type === MainType.INCOME);
  const expenseTree = categories.filter((c) => c.type === MainType.EXPENSE);

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle>支出分類</CardTitle>
            <CardDescription>管理您的支出類別結構</CardDescription>
          </div>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            新增分類
          </Button>
        </CardHeader>
        <CardContent>
          {expenseTree.length > 0 ? (
            <div className="mt-4 space-y-1">
              {expenseTree.map((node) => (
                <CategoryTreeItem key={node.id} node={node} />
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground py-4 text-center">
              尚無支出分類
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle>收入分類</CardTitle>
            <CardDescription>管理您的收入類別結構</CardDescription>
          </div>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            新增分類
          </Button>
        </CardHeader>
        <CardContent>
          {incomeTree.length > 0 ? (
            <div className="mt-4 space-y-1">
              {incomeTree.map((node) => (
                <CategoryTreeItem key={node.id} node={node} />
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground py-4 text-center">
              尚無收入分類
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
