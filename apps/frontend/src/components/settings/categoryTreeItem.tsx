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
    <div className="select-none group relative">
      <div
        className={cn(
          'flex items-center py-2.5 px-3 rounded-lg cursor-pointer transition-all duration-200 relative pr-[80px] border border-transparent',
          'hover:bg-primary/5 hover:border-border/30',
          isExpanded && 'bg-primary/5 border-border/30',
          !isMain &&
            level > 0 &&
            'ml-6 border-l border-l-border/30 rounded-l-none',
        )}
        onClick={() => {
          if (isMain) setIsExpanded(!isExpanded);
        }}
      >
        <div className="flex items-center w-6 shrink-0 text-muted-foreground/70 group-hover:text-foreground transition-colors">
          {isMain ? (
            isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )
          ) : (
            <div className="w-4 h-px bg-border/50" />
          )}
        </div>

        <div className="flex items-center gap-3 flex-1">
          <div
            className={cn(
              'p-1.5 rounded-md bg-background/50 shadow-sm border border-border/20',
              !isMain && 'scale-90',
            )}
          >
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
          </div>
          <span
            className={cn(
              'text-sm transition-colors group-hover:text-primary/90',
              isMain
                ? 'font-semibold'
                : 'font-medium text-muted-foreground group-hover:text-foreground',
            )}
          >
            {node.name}
          </span>
        </div>

        {/* Hover Actions */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0">
          {/* 只有 MainCategory 才可以新增 SubCategory */}
          {isMain && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full"
              onClick={(e) => {
                e.stopPropagation();
                onAddSub(node);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* 只有自定義的類別(有 userId) 才可以編輯/刪除 */}
          {hasUser && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(node);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(node);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div className="ml-[1.15rem] border-l border-border/40 pl-1 py-1 animate-in fade-in-50 slide-in-from-top-1 duration-200">
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
