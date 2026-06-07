import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { X, BotMessageSquare, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatMessageBubble } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { useChat } from '@/hooks/useChat';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export const ChatPanel = ({ isOpen, onClose, className }: ChatPanelProps) => {
  const {
    messages,
    isGenerating,
    error,
    sendMessage,
    stopGenerating,
    confirmDraft,
    cancelDraft,
  } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current;
      scrollElement.scrollTo({
        top: scrollElement.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, isGenerating]);

  // If not open, don't render content (but keep mounted for transition if we wanted,
  // though conditionally rendering might be simpler if layout shift handles it)
  // Let's rely on CSS transforms dictated by the parent, but we handle inner content here.

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-slate-50 dark:bg-[#060c15] border-l border-slate-200/50 dark:border-white/10 shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.1)] z-40 relative overflow-hidden',
        className,
      )}
    >
      {/* Decorative gradient background (matches main layout theme) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[80%] h-[30%] rounded-full bg-emerald-500/5 dark:bg-emerald-500/10 blur-[80px]" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/50 dark:border-white/10 bg-white/40 dark:bg-[#0f172a]/40 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
            <BotMessageSquare className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              AI 系統助手
            </h3>
            {/* <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-emerald-500" />
              Gemini 2.5 Flash
            </p> */}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* Optional: Clear Chat button */}
          {/* <Button variant="ghost" size="icon" onClick={clearChat} className="h-8 w-8 text-slate-400 hover:text-slate-600">
            <Trash2 className="h-4 w-4" />
          </Button> */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div
        className="flex-1 w-full p-4 relative z-10 overflow-y-auto overflow-x-hidden min-h-0 scrollbar-hide"
        ref={scrollRef}
      >
        <div className="flex flex-col gap-2 pb-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[40vh] text-center px-4 opacity-70">
              <div className="h-16 w-16 mb-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-500">
                <BotMessageSquare className="h-8 w-8" />
              </div>
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                您好！我是 EasyAccounting 助手
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[200px]">
                我可以回答關於系統邏輯、頁面操作與設定的問題。請隨時發問。
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <ChatMessageBubble
                key={idx}
                message={msg}
                isStreaming={
                  isGenerating &&
                  idx === messages.length - 1 &&
                  msg.role === 'ai'
                }
                onConfirmDraft={
                  confirmDraft ? () => confirmDraft(idx) : undefined
                }
                onCancelDraft={cancelDraft ? () => cancelDraft(idx) : undefined}
              />
            ))
          )}

          {error && (
            <div className="bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 text-xs p-3 rounded-lg border border-rose-200 dark:border-rose-900/50 mt-2 text-center">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="shrink-0 z-10 pb-safe">
        <ChatInput
          onSend={sendMessage}
          onStop={stopGenerating}
          isGenerating={isGenerating}
        />
      </div>
    </div>
  );
};
