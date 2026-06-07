import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSWRConfig } from 'swr';
import { toast } from 'sonner';
import {
  PaymentFrequency,
  CreateTransactionSchema,
  ChatTransactionDraft,
} from '@repo/shared';
import {
  streamChat,
  ChatMessage,
  MessageContent,
} from '@/services/chatService';
import { addTransaction } from '@/services/transaction';
import { getErrorMessage } from '@/lib/utils';

/** 把 AI 草稿轉成既有 POST /transaction 需要的 payload */
const draftToPayload = (
  draft: ChatTransactionDraft,
): CreateTransactionSchema => ({
  accountId: draft.accountId,
  categoryId: draft.categoryId,
  amount: draft.amount,
  description: draft.description,
  date: draft.date,
  time: draft.time,
  receipt: null,
  paymentFrequency: PaymentFrequency.ONE_TIME,
  type: draft.type,
});

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const router = useRouter();
  const { mutate } = useSWRConfig();

  const sendMessage = useCallback(
    async (content: string | MessageContent[]) => {
      const isEmpty =
        typeof content === 'string' ? !content.trim() : content.length === 0;
      if (isEmpty || isGenerating) return;

      setError(null);
      setIsGenerating(true);

      const userMsg: ChatMessage = { role: 'user', content };
      setMessages((prev) => [...prev, userMsg]);

      // Create a new AbortController for this request
      abortControllerRef.current = new AbortController();

      let aiAccumulatedContent = '';

      setMessages((prev) => [...prev, { role: 'ai', content: '' }]);

      await streamChat(
        content,
        // Pass the current state of messages as history, excluding current interaction
        messages,
        (chunk) => {
          aiAccumulatedContent += chunk;
          setMessages((prev) => {
            const newMessages = [...prev];
            // Update the last message (which is the AI message we just created)
            const lastIndex = newMessages.length - 1;
            if (newMessages[lastIndex].role === 'ai') {
              // 用 spread 保留可能已掛上的 draft / draftStatus，只更新文字內容
              newMessages[lastIndex] = {
                ...newMessages[lastIndex],
                content: aiAccumulatedContent,
              };
            }
            return newMessages;
          });
        },
        (err) => {
          setError(err);
        },
        () => {
          setIsGenerating(false);
          abortControllerRef.current = null;
        },
        (draft) => {
          // 收到交易草稿：掛到目前這則 AI 訊息上，由 UI 顯示確認卡片
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastIndex = newMessages.length - 1;
            if (lastIndex >= 0 && newMessages[lastIndex].role === 'ai') {
              newMessages[lastIndex] = {
                ...newMessages[lastIndex],
                draft,
                draftStatus: 'pending',
              };
            }
            return newMessages;
          });
        },
        abortControllerRef.current.signal,
      );
    },
    [messages, isGenerating],
  );

  // 更新某則訊息上的草稿狀態
  const setDraftStatus = useCallback(
    (index: number, draftStatus: ChatMessage['draftStatus']) => {
      setMessages((prev) => {
        const newMessages = [...prev];
        const target = newMessages[index];
        if (target?.draft) {
          newMessages[index] = { ...target, draftStatus };
        }
        return newMessages;
      });
    },
    [],
  );

  // 使用者按下「確認」：以既有 POST /transaction 正式記帳
  const confirmDraft = useCallback(
    async (index: number) => {
      const target = messages[index];
      if (!target?.draft || target.draftStatus !== 'pending') return;

      setDraftStatus(index, 'confirming');
      try {
        const result = await addTransaction(draftToPayload(target.draft));
        if (!result) throw new Error('記帳失敗，請稍後再試');
        setDraftStatus(index, 'confirmed');
        toast.success('已為您記下這筆交易');

        // 重新整理畫面資料：
        // - mutate(() => true)：使所有 client 端 SWR 快取（如交易月曆）失效並重抓
        // - router.refresh()：刷新 server component 抓的資料（儀表板摘要、交易表等）
        mutate(() => true);
        router.refresh();
      } catch (err) {
        setDraftStatus(index, 'pending'); // 失敗回到可重試狀態
        toast.error(getErrorMessage(err));
      }
    },
    [messages, setDraftStatus, mutate, router],
  );

  // 使用者按下「取消」：僅標記為取消，不送出
  const cancelDraft = useCallback(
    (index: number) => {
      setDraftStatus(index, 'cancelled');
    },
    [setDraftStatus],
  );

  const stopGenerating = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsGenerating(false);
    }
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
    stopGenerating();
  }, [stopGenerating]);

  return {
    messages,
    isGenerating,
    error,
    sendMessage,
    stopGenerating,
    clearChat,
    confirmDraft,
    cancelDraft,
  };
}
