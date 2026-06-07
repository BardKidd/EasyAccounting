import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateEmbedding, searchKnowledge, streamChatResponse } from '@/services/chatService';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import KnowledgeChunk from '@/models/knowledgeChunk';

const mockEmbedContent = vi.fn();
const mockGetGenerativeModel = vi.fn().mockReturnValue({
  embedContent: mockEmbedContent,
});
const mockCreate = vi.fn();

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(function() {
    return {
      getGenerativeModel: mockGetGenerativeModel,
    };
  })
}));

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(function() {
    return {
      chat: { completions: { create: mockCreate } }
    };
  })
}));

vi.mock('@/models/knowledgeChunk', () => ({
  default: {
    aggregate: vi.fn(),
  },
}));

// 將 chatTools 整個 mock 掉，讓 chatService 的 tool-calling 迴圈與真正的 DB / service 解耦。
const mockExecuteChatTool = vi.fn();
vi.mock('@/services/chatTools', () => ({
  chatTools: [],
  executeChatTool: (...args: any[]) => mockExecuteChatTool(...args),
}));

const TEST_USER_ID = 'user-123';

// 模擬 OpenAI streaming：只串文字
const textStream = (text: string) =>
  (async function* () {
    yield { choices: [{ delta: { content: text } }] };
  })();

// 模擬 OpenAI streaming：回一個 tool_call
const toolCallStream = (
  id: string,
  name: string,
  args: string,
) =>
  (async function* () {
    yield {
      choices: [
        {
          delta: {
            tool_calls: [
              { index: 0, id, function: { name, arguments: args } },
            ],
          },
        },
      ],
    };
  })();

describe('chatService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPEN_ROUTER_API_KEY = 'test_open_router_key';
    process.env.GOOGLE_AI_API_KEY = 'test_google_ai_key';
  });

  describe('generateEmbedding', () => {
    it('should generate embeddings successfully', async () => {
      mockEmbedContent.mockResolvedValueOnce({
        embedding: { values: [0.1, 0.2, 0.3] },
      });

      const result = await generateEmbedding('test text');
      expect(result).toEqual([0.1, 0.2, 0.3]);
      expect(mockEmbedContent).toHaveBeenCalledWith({
        content: { role: 'user', parts: [{ text: 'test text' }] },
        outputDimensionality: 768,
      });
    });
  });

  describe('searchKnowledge', () => {
    it('should search knowledge successfully', async () => {
      const mockAggregate = KnowledgeChunk.aggregate as any;
      mockAggregate.mockResolvedValue([
        { content: 'test content', metadata: { source: 'test.md' }, score: 0.9 },
      ]);

      const result = await searchKnowledge([0.1, 0.2]);
      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('test content');
      expect(mockAggregate).toHaveBeenCalled();
    });
  });

  describe('streamChatResponse', () => {
    beforeEach(() => {
      mockEmbedContent.mockResolvedValue({ embedding: { values: [0.1, 0.2] } });
      (KnowledgeChunk.aggregate as any).mockResolvedValue([]);
    });

    it('should stream response chunks successfully', async () => {
      mockCreate.mockResolvedValueOnce(
        (async function* () {
          yield { choices: [{ delta: { content: 'hello' } }] };
          yield { choices: [{ delta: { content: ' world' } }] };
        })()
      );

      const onChunk = vi.fn();
      await streamChatResponse('Hi', [], TEST_USER_ID, onChunk);

      // content 改為「整輪緩衝、確定無 tool_calls 後一次 flush」：
      // 避免模型在呼叫工具前先吐前言造成錯亂輸出，因此 onChunk 只會被呼叫一次。
      expect(onChunk).toHaveBeenCalledTimes(1);
      expect(onChunk).toHaveBeenCalledWith('hello world');
      // 沒有 tool_calls 時不應呼叫任何 tool
      expect(mockExecuteChatTool).not.toHaveBeenCalled();
    });

    it('should buffer leading text and NOT leak it when the round ends up calling a tool', async () => {
      // 模型在同一輪先吐前言文字、再回 tool_call —— 前言不可洩漏給使用者。
      mockCreate
        .mockResolvedValueOnce(
          (async function* () {
            yield { choices: [{ delta: { content: '讓我查一下…' } }] };
            yield {
              choices: [
                {
                  delta: {
                    tool_calls: [
                      {
                        index: 0,
                        id: 'call_x',
                        function: {
                          name: 'query_overview_trend',
                          arguments:
                            '{"startDate":"2026-06-01","endDate":"2026-06-30"}',
                        },
                      },
                    ],
                  },
                },
              ],
            };
          })(),
        )
        .mockResolvedValueOnce(textStream('這個月結餘 5000 元'));

      mockExecuteChatTool.mockResolvedValueOnce({ content: '{}' });

      const onChunk = vi.fn();
      await streamChatResponse('這個月收支如何', [], TEST_USER_ID, onChunk);

      // 前言「讓我查一下…」不可被推給前端
      expect(onChunk).not.toHaveBeenCalledWith('讓我查一下…');
      // 只應輸出最終答案
      expect(onChunk).toHaveBeenCalledWith('這個月結餘 5000 元');
    });

    it('should emit a fallback message when the model returns no text and no tool', async () => {
      mockCreate.mockResolvedValueOnce(
        (async function* () {
          // 空輪：既無 content 也無 tool_calls
          yield { choices: [{ delta: {} }] };
        })(),
      );

      const onChunk = vi.fn();
      await streamChatResponse('在嗎', [], TEST_USER_ID, onChunk);

      expect(onChunk).toHaveBeenCalledTimes(1);
      expect(onChunk.mock.calls[0]![0]).toContain('抱歉');
      expect(mockExecuteChatTool).not.toHaveBeenCalled();
    });

    it('should handle complex message formats properly', async () => {
      mockEmbedContent.mockResolvedValueOnce({ embedding: { values: [0.1] } });
      mockCreate.mockResolvedValueOnce(textStream('done'));

      const onChunk = vi.fn();
      await streamChatResponse([{ type: 'text', text: 'Hi with array' }], [], TEST_USER_ID, onChunk);

      expect(mockEmbedContent).toHaveBeenCalledWith(expect.objectContaining({
        content: expect.objectContaining({
          parts: [{ text: 'Hi with array' }]
        })
      }));
      expect(onChunk).toHaveBeenCalledWith('done');
    });

    it('should execute tool with the server-side userId, never one chosen by the model', async () => {
      // 第一輪：模型回 tool_call；第二輪：模型給文字答案
      mockCreate
        .mockResolvedValueOnce(
          toolCallStream(
            'call_1',
            'query_spending_by_category',
            JSON.stringify({ startDate: '2026-06-01', endDate: '2026-06-30' }),
          ),
        )
        .mockResolvedValueOnce(textStream('你這個月外食花了 1200 元'));

      mockExecuteChatTool.mockResolvedValueOnce({
        content: JSON.stringify({ expenses: [{ category: '飲食', amount: 1200 }] }),
      });

      const onChunk = vi.fn();
      await streamChatResponse('我這個月外食花多少', [], TEST_USER_ID, onChunk);

      // (a) 用正確的 userId 執行對應 tool，且參數來自模型
      expect(mockExecuteChatTool).toHaveBeenCalledWith(
        'query_spending_by_category',
        { startDate: '2026-06-01', endDate: '2026-06-30' },
        TEST_USER_ID,
      );

      // (b) tool 結果被回填到第二輪的 messages 中（role:'tool'）
      const secondCallMessages = mockCreate.mock.calls[1]![0].messages;
      const toolMsg = secondCallMessages.find((m: any) => m.role === 'tool');
      expect(toolMsg).toBeDefined();
      expect(toolMsg.tool_call_id).toBe('call_1');
      expect(toolMsg.content).toContain('1200');

      // (c) 最終串流輸出正常
      expect(onChunk).toHaveBeenCalledWith('你這個月外食花了 1200 元');
    });

    it('should forward draft events from create_transaction to onEvent', async () => {
      mockCreate
        .mockResolvedValueOnce(
          toolCallStream(
            'call_draft',
            'create_transaction',
            JSON.stringify({ amount: 120, type: '支出', categoryName: '飲料' }),
          ),
        )
        .mockResolvedValueOnce(textStream('草稿已準備好，請確認'));

      const draftEvent = {
        type: 'draft' as const,
        draft: {
          amount: 120,
          type: '支出',
          date: '2026-06-05',
          time: '10:00:00',
          description: '咖啡',
          accountId: 'acc-1',
          accountName: '現金',
          categoryId: 'cat-1',
          categoryName: '飲料',
        },
      };
      mockExecuteChatTool.mockResolvedValueOnce({
        content: '已準備好交易草稿',
        event: draftEvent,
      });

      const onChunk = vi.fn();
      const onEvent = vi.fn();
      await streamChatResponse('幫我記一筆昨天 120 的咖啡', [], TEST_USER_ID, onChunk, onEvent);

      expect(onEvent).toHaveBeenCalledWith(draftEvent);
      expect(onChunk).toHaveBeenCalledWith('草稿已準備好，請確認');
    });

    it('should stop tool loop and force a text answer after MAX_TOOL_ROUNDS', async () => {
      // 模型不斷想呼叫工具：前兩輪有 tools，第三輪關閉 tools 只能回文字
      mockCreate
        .mockResolvedValueOnce(toolCallStream('c1', 'query_overview_trend', '{"startDate":"2026-06-01","endDate":"2026-06-30"}'))
        .mockResolvedValueOnce(toolCallStream('c2', 'query_overview_trend', '{"startDate":"2026-05-01","endDate":"2026-05-31"}'))
        .mockResolvedValueOnce(textStream('最終答案'));

      mockExecuteChatTool.mockResolvedValue({ content: '{}' });

      const onChunk = vi.fn();
      await streamChatResponse('比較這兩個月', [], TEST_USER_ID, onChunk);

      // 第三輪（最後一輪）關閉 tools
      expect(mockCreate).toHaveBeenCalledTimes(3);
      expect(mockCreate.mock.calls[2]![0].tools).toBeUndefined();
      expect(onChunk).toHaveBeenCalledWith('最終答案');
    });
  });
});
