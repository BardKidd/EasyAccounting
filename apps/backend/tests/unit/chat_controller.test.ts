import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';

// 把 service 整個 mock 掉，controller 測試只關心「身分守衛 + 串接行為」。
const mockStreamChatResponse = vi.fn();
vi.mock('@/services/chatService', () => ({
  streamChatResponse: (...args: any[]) => mockStreamChatResponse(...args),
}));

import { handleChat } from '@/controllers/chatController';

const mockResponse = () => {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.writeHead = vi.fn().mockReturnValue(res);
  res.write = vi.fn().mockReturnValue(true);
  res.end = vi.fn().mockReturnValue(res);
  return res;
};

const mockRequest = (overrides: Partial<Request> = {}) => {
  return {
    user: { userId: 'user-123' },
    body: { message: 'Hi', history: [] },
    on: vi.fn(), // req.on('close', ...)
    ...overrides,
  } as unknown as Request;
};

describe('chatController.handleChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 and does NOT call any user-data service when there is no userId', async () => {
    const req = mockRequest({ user: undefined } as any);
    const res = mockResponse();

    await handleChat(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    // 關鍵：沒有身分時絕不啟動會查使用者資料的 chat 流程
    expect(mockStreamChatResponse).not.toHaveBeenCalled();
  });

  it('returns 401 when req.user exists but userId is missing', async () => {
    const req = mockRequest({ user: {} } as any);
    const res = mockResponse();

    await handleChat(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockStreamChatResponse).not.toHaveBeenCalled();
  });

  it('returns 400 (without calling the service) when message is missing', async () => {
    const req = mockRequest({ body: { history: [] } });
    const res = mockResponse();

    await handleChat(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockStreamChatResponse).not.toHaveBeenCalled();
  });

  it('passes the server-side userId into streamChatResponse and finishes the SSE stream', async () => {
    mockStreamChatResponse.mockResolvedValueOnce(undefined);
    const req = mockRequest();
    const res = mockResponse();

    await handleChat(req, res);

    // userId 為第 3 個位置參數，且取自 req.user（非 body）
    expect(mockStreamChatResponse).toHaveBeenCalledTimes(1);
    const args = mockStreamChatResponse.mock.calls[0]!;
    expect(args[0]).toBe('Hi'); // message
    expect(args[2]).toBe('user-123'); // userId
    expect(typeof args[3]).toBe('function'); // onChunk
    expect(typeof args[4]).toBe('function'); // onEvent

    expect(res.writeHead).toHaveBeenCalledWith(200, expect.any(Object));
    expect(res.write).toHaveBeenCalledWith('data: [DONE]\n\n');
    expect(res.end).toHaveBeenCalled();
  });

  it('forwards onChunk text and onEvent draft into the SSE stream', async () => {
    // 讓 service 透過注入的回呼把一段文字與一個 draft 事件推回來
    mockStreamChatResponse.mockImplementationOnce(
      async (
        _msg: any,
        _hist: any,
        _userId: any,
        onChunk: (c: string) => void,
        onEvent: (e: any) => void,
      ) => {
        onChunk('你好');
        onEvent({ type: 'draft', draft: { amount: 120 } });
      },
    );

    const req = mockRequest();
    const res = mockResponse();

    await handleChat(req, res);

    expect(res.write).toHaveBeenCalledWith(
      `data: ${JSON.stringify({ content: '你好' })}\n\n`,
    );
    expect(res.write).toHaveBeenCalledWith(
      `data: ${JSON.stringify({ type: 'draft', draft: { amount: 120 } })}\n\n`,
    );
  });
});
