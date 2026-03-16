import { useState, useRef, useCallback } from 'react';
import {
  streamChat,
  ChatMessage,
  MessageContent,
} from '@/services/chatService';

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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
              newMessages[lastIndex] = {
                role: 'ai',
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
        abortControllerRef.current.signal,
      );
    },
    [messages, isGenerating],
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
  };
}
