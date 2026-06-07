import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { streamChat } from './chatService';

/**
 * 重點回歸測試：SSE 事件可能被網路切在兩次 read() 之間。
 * streamChat 必須跨 read 累積 buffer、只解析完整的行，
 * 否則半截的 data: 行會 JSON.parse 失敗被丟棄，導致草稿事件（確認卡片）有時整個消失。
 */

const enc = new TextEncoder();

/** 用給定的字串塊組出一個 ReadableStream-like 的 body.getReader() */
const streamFrom = (chunks: string[]) => {
  let i = 0;
  return {
    getReader() {
      return {
        read: async () => {
          if (i < chunks.length) {
            return { value: enc.encode(chunks[i++]), done: false };
          }
          return { value: undefined, done: true };
        },
      };
    },
  };
};

const mockFetchWith = (chunks: string[]) =>
  vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    body: streamFrom(chunks),
  });

const noop = () => {};
const signal = () => new AbortController().signal;

describe('streamChat SSE parsing', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reassembles a draft event split across two reads (does not drop it)', async () => {
    const draft = {
      amount: 2600,
      type: '支出',
      date: '2026-06-06',
      time: '12:00:00',
      description: null,
      accountId: 'acc-1',
      accountName: '現金',
      categoryId: 'cat-1',
      categoryName: '稅金',
    };
    const full = `data: ${JSON.stringify({ type: 'draft', draft })}\n\n`;
    const mid = Math.floor(full.length / 2);
    // 故意把單一 SSE 事件切成兩塊（模擬封包邊界），第二塊再接上 [DONE]
    const chunks = [full.slice(0, mid), full.slice(mid) + 'data: [DONE]\n\n'];

    global.fetch = mockFetchWith(chunks) as any;

    const onDraft = vi.fn();
    const onError = vi.fn();
    const onComplete = vi.fn();

    await streamChat('記一筆', [], noop, onError, onComplete, onDraft, signal());

    expect(onError).not.toHaveBeenCalled();
    expect(onDraft).toHaveBeenCalledTimes(1);
    expect(onDraft).toHaveBeenCalledWith(
      expect.objectContaining({ categoryName: '稅金', amount: 2600 }),
    );
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('reassembles a content event split across reads', async () => {
    const full = `data: ${JSON.stringify({ content: '你好世界' })}\n\n`;
    const chunks = [full.slice(0, 10), full.slice(10)];

    global.fetch = mockFetchWith(chunks) as any;

    const onChunk = vi.fn();
    await streamChat('hi', [], onChunk, noop, noop, noop, signal());

    expect(onChunk).toHaveBeenCalledTimes(1);
    expect(onChunk).toHaveBeenCalledWith('你好世界');
  });

  it('parses multiple events arriving in a single read in order', async () => {
    const chunk =
      `data: ${JSON.stringify({ content: 'A' })}\n\n` +
      `data: ${JSON.stringify({ content: 'B' })}\n\n` +
      `data: [DONE]\n\n`;

    global.fetch = mockFetchWith([chunk]) as any;

    const onChunk = vi.fn();
    await streamChat('hi', [], onChunk, noop, noop, noop, signal());

    expect(onChunk.mock.calls.map((c) => c[0])).toEqual(['A', 'B']);
  });

  it('surfaces a 401 as an error via onError', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 401, statusText: 'Unauthorized' }) as any;

    const onError = vi.fn();
    await streamChat('hi', [], noop, onError, noop, noop, signal());

    expect(onError).toHaveBeenCalledWith('請重新登入以使用此功能');
  });
});
