import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Bot,
  User,
  ExternalLink,
  Check,
  X as XIcon,
  Loader2,
  Wallet,
  Tag,
  CalendarDays,
} from 'lucide-react';
import { ChatMessage } from '@/services/chatService';
import { RootType } from '@repo/shared';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';

interface ChatMessageProps {
  message: ChatMessage;
  isStreaming?: boolean;
  onConfirmDraft?: () => void;
  onCancelDraft?: () => void;
}

/** AI 交易草稿的確認卡片 */
const DraftCard = ({
  draft,
  status = 'pending',
  onConfirm,
  onCancel,
}: {
  draft: NonNullable<ChatMessage['draft']>;
  status?: ChatMessage['draftStatus'];
  onConfirm?: () => void;
  onCancel?: () => void;
}) => {
  const isIncome = draft.type === RootType.INCOME;
  const isPending = status === 'pending';
  const isConfirming = status === 'confirming';
  const isConfirmed = status === 'confirmed';
  const isCancelled = status === 'cancelled';

  return (
    <div className="mt-2 w-full rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-500/30 dark:bg-emerald-500/5">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
          交易草稿
        </span>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[11px] font-medium',
            isIncome
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
              : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
          )}
        >
          {draft.type}
        </span>
      </div>

      <div
        className={cn(
          'mb-2 text-2xl font-bold tabular-nums',
          isIncome
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-rose-600 dark:text-rose-400',
        )}
      >
        {isIncome ? '+' : '-'}
        {draft.amount.toLocaleString()} 元
      </div>

      <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <Tag className="h-3.5 w-3.5 shrink-0" />
          <span>{draft.categoryName}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Wallet className="h-3.5 w-3.5 shrink-0" />
          <span>{draft.accountName}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
          <span>{draft.date}</span>
        </div>
        {draft.description && (
          <div className="pt-1 text-slate-500 dark:text-slate-500">
            備註：{draft.description}
          </div>
        )}
      </div>

      {/* 動作區：依狀態切換 */}
      <div className="mt-3">
        {isPending && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onConfirm}
              className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              <Check className="h-3.5 w-3.5" />
              確認記帳
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <XIcon className="h-3.5 w-3.5" />
              取消
            </button>
          </div>
        )}
        {isConfirming && (
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            記帳中…
          </div>
        )}
        {isConfirmed && (
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <Check className="h-3.5 w-3.5" />
            已完成記帳
          </div>
        )}
        {isCancelled && (
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
              <XIcon className="h-3.5 w-3.5" />
              已取消，未記帳
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              想修改的話，直接告訴我要改什麼即可（例如「改用現金」「金額改成
              300」）。
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export const ChatMessageBubble = ({
  message,
  isStreaming,
  onConfirmDraft,
  onCancelDraft,
}: ChatMessageProps) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={cn(
      "flex w-full gap-3 py-4",
      isUser ? "justify-end" : "justify-start"
    )}>
      {/* Avatar for AI */}
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
          <Bot className="h-5 w-5" />
        </div>
      )}

      {/* Message Bubble */}
      <div className={cn(
        "relative rounded-2xl px-4 py-3 max-w-[85%] text-sm shadow-sm transition-all duration-200",
        isUser 
          ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 rounded-tr-sm" 
          : "bg-white text-slate-700 border border-slate-100 dark:bg-[#1e293b] dark:text-slate-300 dark:border-slate-800 rounded-tl-sm shadow-slate-200/50 dark:shadow-none"
      )}>
        {/* The text content */}
        <div className={cn(
          "leading-relaxed min-w-[30px] w-full max-w-full m-0 p-0 wrap-break-word overflow-hidden",
          isUser && typeof message.content === 'string' ? "whitespace-pre-wrap" : "whitespace-normal"
        )}>
          {isUser ? (
            <div className="flex flex-col gap-2">
              {typeof message.content === 'string' ? (
                <div className="whitespace-pre-wrap">{message.content}</div>
              ) : (
                message.content.map((part, idx) => {
                  if (part.type === 'text' && part.text) {
                    return <div key={idx} className="whitespace-pre-wrap">{part.text}</div>;
                  }
                  if (part.type === 'image_url' && part.image_url?.url) {
                    return (
                      <div key={idx} className="relative rounded-lg overflow-hidden border border-slate-700/50 bg-slate-900/50 max-w-sm mt-1">
                        <img src={part.image_url.url} alt="User Uploaded Image" className="w-full h-auto object-cover max-h-60" />
                      </div>
                    );
                  }
                  return null;
                })
              )}
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert prose-emerald max-w-none text-slate-700 dark:text-slate-300 wrap-break-word">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  strong: ({node, ...props}) => <span className="font-bold text-slate-900 dark:text-white" {...props} />,
                  a: ({node, href, children, ...props}) => {
                    if (!href) return <a {...props}>{children}</a>;
                    
                    const isInternal = href.startsWith('/');
                    const LinkWrapper = isInternal ? Link : 'a';
                    const targetProps = isInternal ? {} : { target: "_blank", rel: "noopener noreferrer" };
                    
                    return (
                      <LinkWrapper 
                        href={href as any} 
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 mt-1 mb-1 text-xs font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 rounded-lg no-underline transition-colors border border-emerald-200 dark:border-emerald-500/20 shadow-sm whitespace-normal"
                        {...targetProps}
                      >
                        <span className="break-all">{children}</span>
                        {!isInternal && <ExternalLink className="w-3 h-3 shrink-0" />}
                      </LinkWrapper>
                    );
                  },
                  p: ({node, ...props}) => <p className="mb-3 last:mb-0 wrap-break-word" {...props} />,
                  ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
                  ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />,
                  li: ({node, ...props}) => <li className="mb-1 wrap-break-word" {...props} />
                }}
              >
                {typeof message.content === 'string' && message.content.length > 0 ? message.content : (isStreaming ? " " : "")}
              </ReactMarkdown>
            </div>
          )}
          {isStreaming && (
             <span className="inline-block w-1.5 h-4 bg-emerald-500 animate-pulse ml-1 align-middle" />
          )}
        </div>

        {/* AI 交易草稿確認卡片 */}
        {!isUser && message.draft && (
          <DraftCard
            draft={message.draft}
            status={message.draftStatus}
            onConfirm={onConfirmDraft}
            onCancel={onCancelDraft}
          />
        )}
      </div>

       {/* Avatar for User */}
       {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
          <User className="h-5 w-5" />
        </div>
      )}
    </div>
  );
};
