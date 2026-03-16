import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useChat } from './useChat';
import { streamChat } from '@/services/chatService';

vi.mock('@/services/chatService', () => ({
  streamChat: vi.fn(),
}));

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

  it('should handle clearChat', async () => {
    const { result } = renderHook(() => useChat());
    
    act(() => {
      result.current.clearChat();
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});
