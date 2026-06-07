import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RootType, PaymentFrequency } from '@repo/shared';
import { useChat } from './useChat';
import { streamChat } from '@/services/chatService';
import { addTransaction } from '@/services/transaction';

vi.mock('@/services/chatService', () => ({
  streamChat: vi.fn(),
}));

vi.mock('@/services/transaction', () => ({
  addTransaction: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockRouterRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRouterRefresh }),
}));

const mockMutate = vi.fn();
vi.mock('swr', () => ({
  useSWRConfig: () => ({ mutate: mockMutate }),
}));

const sampleDraft = {
  amount: 11000,
  type: RootType.INCOME,
  date: '2026-06-05',
  time: '12:00:00',
  description: null,
  accountId: '22222222-2222-2222-2222-222222222222',
  accountName: '日常錢包',
  categoryId: '11111111-1111-1111-1111-111111111111',
  categoryName: '薪水',
};

describe('useChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useChat());
    expect(result.current.messages).toEqual([]);
    expect(result.current.isGenerating).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should not send empty message', async () => {
    const { result } = renderHook(() => useChat());
    await act(async () => {
      await result.current.sendMessage('   ');
    });
    expect(result.current.messages).toEqual([]);
    expect(streamChat).not.toHaveBeenCalled();
  });

  it('should handle send message and stream response', async () => {
    const mockStreamChat = streamChat as any;
    mockStreamChat.mockImplementation(async (content: any, history: any, onChunk: any, onError: any, onDone: any) => {
      onChunk('Hello');
      onDone();
    });

    const { result } = renderHook(() => useChat());
    
    await act(async () => {
      await result.current.sendMessage('Hi AI');
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0]).toEqual({ role: 'user', content: 'Hi AI' });
    expect(result.current.messages[1]).toEqual({ role: 'ai', content: 'Hello' });
    expect(result.current.isGenerating).toBe(false);
  });

  it('should handle stopGenerating correctly', async () => {
    const mockStreamChat = streamChat as any;
    mockStreamChat.mockImplementation(async (content: any, history: any, onChunk: any, onError: any, onDone: any) => {
      // simulate long running stream that gets aborted via signal
    });

    const { result } = renderHook(() => useChat());
    
    await act(async () => {
      // Don't await because stream is "ongoing"
      result.current.sendMessage('Hi AI');
    });

    expect(result.current.isGenerating).toBe(true);

    act(() => {
      result.current.stopGenerating();
    });

    expect(result.current.isGenerating).toBe(false);
  });

  it('should attach a draft (status pending) to the AI message when onDraft fires', async () => {
    const mockStreamChat = streamChat as any;
    mockStreamChat.mockImplementation(
      async (
        _content: any,
        _history: any,
        onChunk: any,
        _onError: any,
        onDone: any,
        onDraft: any,
      ) => {
        onDraft(sampleDraft);
        onChunk('草稿已準備好，請確認');
        onDone();
      },
    );

    const { result } = renderHook(() => useChat());
    await act(async () => {
      await result.current.sendMessage('幫我記一筆 11000 的薪水');
    });

    const aiMsg = result.current.messages[1];
    // 文字與草稿同在一則 AI 訊息上（文字串流不會蓋掉 draft）
    expect(aiMsg.content).toBe('草稿已準備好，請確認');
    expect(aiMsg.draft).toEqual(sampleDraft);
    expect(aiMsg.draftStatus).toBe('pending');
  });

  it('confirmDraft posts the transaction and marks the draft confirmed', async () => {
    const mockStreamChat = streamChat as any;
    mockStreamChat.mockImplementation(
      async (
        _content: any,
        _history: any,
        _onChunk: any,
        _onError: any,
        onDone: any,
        onDraft: any,
      ) => {
        onDraft(sampleDraft);
        onDone();
      },
    );
    (addTransaction as any).mockResolvedValue({ isSuccess: true, data: {} });

    const { result } = renderHook(() => useChat());
    await act(async () => {
      await result.current.sendMessage('記一筆薪水');
    });
    await act(async () => {
      await result.current.confirmDraft(1);
    });

    // 以既有 POST /transaction 的 payload 形狀送出（含 ONE_TIME / receipt:null）
    expect(addTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: sampleDraft.accountId,
        categoryId: sampleDraft.categoryId,
        amount: 11000,
        type: RootType.INCOME,
        paymentFrequency: PaymentFrequency.ONE_TIME,
        receipt: null,
      }),
    );
    expect(result.current.messages[1].draftStatus).toBe('confirmed');
    // 確認成功後刷新畫面資料：SWR 快取失效 + server component 重新整理
    expect(mockMutate).toHaveBeenCalled();
    expect(mockRouterRefresh).toHaveBeenCalled();
  });

  it('confirmDraft reverts to pending and does not double-submit on failure', async () => {
    const mockStreamChat = streamChat as any;
    mockStreamChat.mockImplementation(
      async (
        _content: any,
        _history: any,
        _onChunk: any,
        _onError: any,
        onDone: any,
        onDraft: any,
      ) => {
        onDraft(sampleDraft);
        onDone();
      },
    );
    (addTransaction as any).mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useChat());
    await act(async () => {
      await result.current.sendMessage('記一筆薪水');
    });
    await act(async () => {
      await result.current.confirmDraft(1);
    });

    expect(result.current.messages[1].draftStatus).toBe('pending');
    // 失敗時不應刷新畫面
    expect(mockRouterRefresh).not.toHaveBeenCalled();
  });

  it('cancelDraft marks the draft cancelled without posting', async () => {
    const mockStreamChat = streamChat as any;
    mockStreamChat.mockImplementation(
      async (
        _content: any,
        _history: any,
        _onChunk: any,
        _onError: any,
        onDone: any,
        onDraft: any,
      ) => {
        onDraft(sampleDraft);
        onDone();
      },
    );

    const { result } = renderHook(() => useChat());
    await act(async () => {
      await result.current.sendMessage('記一筆薪水');
    });
    act(() => {
      result.current.cancelDraft(1);
    });

    expect(result.current.messages[1].draftStatus).toBe('cancelled');
    expect(addTransaction).not.toHaveBeenCalled();
  });

  it('should handle clearChat', async () => {
    const { result } = renderHook(() => useChat());
    
    act(() => {
      result.current.clearChat();
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});
