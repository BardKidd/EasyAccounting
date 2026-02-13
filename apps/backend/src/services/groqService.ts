import Groq from 'groq-sdk';
import {
  parseLlmResponse,
  ParsedTransaction,
} from '@/validation/llmResponseSchema';

// ---------- Client ----------

let groqClient: Groq | null = null;

const getGroqClient = (): Groq => {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is not defined');
    }
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
};

// ---------- Prompt ----------

const buildSystemPrompt = (headerContext: string | null): string => {
  const basePrompt = `You are a professional credit card bill analysis expert. Extract all transaction records from the provided bill image.

## CRITICAL RULES

1.  **NO SUMMARIZATION**: You must extract **EVERY SINGLE** transaction visible in the image. If there are 50 transactions, return 50 objects.
2.  **NO LAZINESS**: Do not list only the first few items. Scan line by line to ensure no omissions.
3.  **PRECISE EXTRACTION**: Amounts and dates must be completely accurate. Do not miss installment payments or foreign currency transactions.

## Output Format

Return a JSON array, where each object represents a transaction:

\`\`\`json
[
  {
    "date": "YYYY-MM-DD",
    "time": "HH:mm",
    "description": "Brand/Merchant Name (Simplified)",
    "amount": 1500.00,
    "type": "expense",
    "isInstallment": false,
    "installmentCurrent": null,
    "installmentTotal": null,
    "currency": "TWD",
    "extraAdd": 0,
    "extraMinus": 0
  }
]
\`\`\`

## Detailed Field Rules

1. **Language**: **Always use Traditional Chinese (繁體中文)** if the content is in Chinese (including Simplified Chinese). Keep other languages (English, Japanese, etc.) in their original form.
2. **Date**: Use \`YYYY-MM-DD\`. If only Month/Day is shown, infer the year from the bill header.
3. **Time**: Format as \`HH:mm\` if available, otherwise null.
4. **Description**: Extract the BRAND NAME, not the raw description. Examples:
   - "UBER* EATS HELP.UBER.COM" → "Uber Eats"
   - "全聯福利中心台北南港" → "全聯福利中心"
   - "MOMO購物網" → "momo"
4. **Amount**: Number, positive, no thousands separators.
5. **Type**: \`expense\` for purchases, \`income\` for refunds (negative amounts).
6. **Installment**: If it's an installment, set \`isInstallment: true\` and populate \`installmentCurrent\`/\`installmentTotal\`.
7. **extraAdd**: Discount amount (positive number) if present.
8. **extraMinus**: Handling fee (positive number) if present (e.g., foreign transaction fee).
9. **Currency**: Default \`TWD\`. Use ISO code (e.g., USD, JPY) for foreign currencies.
10. **Exclusions**: Only parse "Transaction Detail" or "Consumption" sections. Ignore summaries, interest, late fees, minimum payments.`;

  if (headerContext) {
    return `${basePrompt}

## Important Context

This is a continuation page of the bill. The table columns follow the same order as the previous page.
Previous page header/first row context:
${headerContext}

Please parse this page using the same column structure.`;
  }

  return basePrompt;
};

// ---------- Core ----------

const MAX_RETRIES = 2;

const callGroqWithRetry = async (
  base64Images: string[],
  headerContext: string | null,
): Promise<string> => {
  const client = getGroqClient();

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const imageContents = base64Images.map((b64) => ({
        type: 'image_url' as const,
        image_url: { url: `data:image/jpeg;base64,${b64}` },
      }));

      const response = await client.chat.completions.create({
        model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
        messages: [
          { role: 'system', content: buildSystemPrompt(headerContext) },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please extract all transactions from this bill image.',
              },
              ...imageContents,
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 8192,
      });

      if (response.usage) {
        console.log(
          `[Groq] Token Usage - Prompt: ${response.usage.prompt_tokens}, Completion: ${response.usage.completion_tokens}, Total: ${response.usage.total_tokens}`,
        );
      }

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      if (attempt === MAX_RETRIES) throw error;

      // 指數退避
      const delay = Math.pow(2, attempt) * 1000;
      console.warn(
        `[Groq] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw new Error('Groq call failed after all retries');
};

/**
 * 解析帳單圖片
 *
 * 逐頁送圖片給 Groq，收集所有交易
 * 第一頁成功後，將表頭 context 帶給後續頁面（解決跨頁表格問題）
 *
 * 備註：未來如需 fallback 可考慮 Together AI
 */
export const parseImages = async (
  imageBuffers: Buffer[],
): Promise<{
  transactions: ParsedTransaction[];
  pageCount: number;
  provider: string;
  model: string;
}> => {
  const allTransactions: ParsedTransaction[] = [];
  let headerContext: string | null = null;

  for (let i = 0; i < imageBuffers.length; i++) {
    // 避免觸發 Rate Limit (429)，每頁間隔 6 秒 (因免費額度限制 6000 TPM，約 10 頁/分)
    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, 6000));
    }
    const base64 = imageBuffers[i]!.toString('base64');

    const rawResponse = await callGroqWithRetry([base64], headerContext);
    const result = parseLlmResponse(rawResponse);

    if (!result.success) {
      console.error(`[Groq] Page ${i + 1} parse failed: ${result.error}`);
      console.error(
        `[Groq] Raw response (first 500 chars): ${rawResponse.slice(0, 500)}`,
      );
      console.error(
        `[Groq] Raw response (last 200 chars): ${rawResponse.slice(-200)}`,
      );
      continue; // 跳過解析失敗的頁面，不要整批失敗
    }

    // 第一頁成功後，記錄表頭 context 給後續頁面
    if (i === 0 && result.data.length > 0) {
      const first = result.data[0]!;
      headerContext = Object.keys(first).join(', ');
    }

    allTransactions.push(...result.data);
  }

  return {
    transactions: allTransactions,
    pageCount: imageBuffers.length,
    provider: 'groq',
    model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
  };
};
