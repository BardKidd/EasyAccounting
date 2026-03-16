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
    it('should stream response chunks successfully', async () => {
      mockEmbedContent.mockResolvedValueOnce({
        embedding: { values: [0.1, 0.2] },
      });

      const mockAggregate = KnowledgeChunk.aggregate as any;
      mockAggregate.mockResolvedValue([]);

      mockCreate.mockResolvedValueOnce(
        (async function* () {
          yield { choices: [{ delta: { content: 'hello' } }] };
          yield { choices: [{ delta: { content: ' world' } }] };
        })()
      );

      const onChunk = vi.fn();
      await streamChatResponse('Hi', [], onChunk);

      expect(onChunk).toHaveBeenCalledWith('hello');
      expect(onChunk).toHaveBeenCalledWith(' world');
      expect(onChunk).toHaveBeenCalledTimes(2);
    });

    it('should handle complex message formats properly', async () => {
      mockEmbedContent.mockResolvedValueOnce({
        embedding: { values: [0.1] },
      });

      const mockAggregate = KnowledgeChunk.aggregate as any;
      mockAggregate.mockResolvedValue([]);

      mockCreate.mockResolvedValueOnce(
        (async function* () {
          yield { choices: [{ delta: { content: 'done' } }] };
        })()
      );

      const onChunk = vi.fn();
      await streamChatResponse([{ type: 'text', text: 'Hi with array' }], [], onChunk);
      
      expect(mockEmbedContent).toHaveBeenCalledWith(expect.objectContaining({
        content: expect.objectContaining({
          parts: [{ text: 'Hi with array' }]
        })
      }));
      expect(onChunk).toHaveBeenCalledWith('done');
    });
  });
});

