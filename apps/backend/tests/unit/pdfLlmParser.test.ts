import { describe, it, expect } from 'vitest';
import { parseLlmResponse } from '@/validation/llmResponseSchema';

describe('llmResponseSchema Parser', () => {
  describe('parseLlmResponse', () => {
    const validJson = `[
      {
        "date": "2026-02-15",
        "time": "14:30",
        "description": "Starbucks",
        "amount": 150.0,
        "type": "expense",
        "isInstallment": false,
        "installmentCurrent": null,
        "installmentTotal": null,
        "currency": "TWD",
        "suggestedCategory": "飲食/午餐"
      }
    ]`;

    it('should successfully parse clean JSON array', () => {
      const result = parseLlmResponse(validJson);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0]!.amount).toBe(150);
        expect(result.data[0]!.description).toBe('Starbucks');
      }
    });

    it('should successfully parse markdown code block JSON', () => {
      const markdownJson = `
Here are the parsed transactions:
\`\`\`json
${validJson}
\`\`\`
Hope this helps!
`;
      const result = parseLlmResponse(markdownJson);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
      }
    });

    it('should successfully extract JSON when there are no code blocks but brackets are present', () => {
      const dirtyJson = `
Here are your transactions:
[
  {
    "date": "2026-02-16",
    "time": null,
    "description": "7-11",
    "amount": 50,
    "type": "expense"
  }
]
Please double check.
`;
      const result = parseLlmResponse(dirtyJson);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0]!.description).toBe('7-11');
      }
    });

    it('should handle and normalize string amount containing commas', () => {
      const commaJson = `[
        {
          "date": "2026-02-16",
          "time": null,
          "description": "Apple Store",
          "amount": "2,400.50",
          "type": "expense"
        }
      ]`;
      const result = parseLlmResponse(commaJson);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data[0]!.amount).toBe(2400.5);
      }
    });

    it('should fail gracefully when JSON structure is invalid', () => {
      const invalidJson = `{ "oops": "not an array" }`;
      const result = parseLlmResponse(invalidJson);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('驗證失敗');
      }
    });

    it('should fail gracefully when JSON has syntax errors', () => {
      const malformedJson = `[ { "date": "2026-02-16", missing quotes } ]`;
      const result = parseLlmResponse(malformedJson);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('JSON 解析失敗');
      }
    });
  });
});
