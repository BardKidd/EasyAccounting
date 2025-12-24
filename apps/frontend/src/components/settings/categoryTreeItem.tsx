'use client';

import { useState } from 'react';
import {
  Plus,
  ChevronRight,
  ChevronDown,
  Folder,
  Tag,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ExtendedCategoryType } from './types';
import { getIcon } from '@/lib/icon-mapping';

interface CategoryTreeItemProps {
  node: ExtendedCategoryType;
  onAddSub: (node: ExtendedCategoryType) => void;
  onEdit: (node: ExtendedCategoryType) => void;
  onDelete: (node: ExtendedCategoryType) => void;
  level?: number;
}

export function CategoryTreeItem({
  node,
  onAddSub,
  onEdit,
  onDelete,
  level = 0,
}: CategoryTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  const isMain = node.isMainCategory;
  const hasUser = !!node.userId;
  const IconComponent = getIcon(node.icon);

  return (
    <div className="select-none group">
      <div
        className={cn(
          'flex items-center py-2 px-2 hover:bg-accent rounded-md cursor-pointer transition-colors relative pr-[80px]',
          // SubCategory 才需要 ml-4
          !isMain && level > 0 && 'ml-4'
        )}
        onClick={() => {
          if (isMain) setIsExpanded(!isExpanded);
        }}
      >
        <div className="flex items-center w-6 shrink-0 text-muted-foreground">
          {isMain ? (
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
          {isMain ? (
            <IconComponent
              className="h-4 w-4"
              style={{ color: node.color || '#3b82f6' }}
            />
          ) : (
            <IconComponent
              className="h-4 w-4"
              style={{ color: node.color || '#10b981' }}
            />
          )}
          <span className="text-sm font-medium">{node.name}</span>
        </div>

        {/* Hover Actions */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* 只有 MainCategory 才可以新增 SubCategory */}
          {isMain && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-primary cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onAddSub(node);
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}

          {/* 只有自定義的類別(有 userId) 才可以編輯/刪除 */}
          {hasUser && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-primary cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(node);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(node);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div className="border-l border-dashed ml-5 pl-1 border-muted">
          {node.children.map((child) => (
            <CategoryTreeItem
              key={child.id}
              node={{ ...child, isMainCategory: false }}
              onAddSub={onAddSub}
              onEdit={onEdit}
              onDelete={onDelete}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
