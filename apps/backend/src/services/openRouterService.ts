import OpenAI from 'openai';
import {
  parseLlmResponse,
  ParsedTransaction,
} from '@/validation/llmResponseSchema';

// ---------- Client ----------

let openRouterClient: OpenAI | null = null;

const getClient = (): OpenAI => {
  if (!openRouterClient) {
    const apiKey = process.env.OPEN_ROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OPEN_ROUTER_API_KEY is not defined');
    }
    openRouterClient = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey,
      defaultHeaders: {
        'HTTP-Referer': 'https://easyaccounting.app',
        'X-Title': 'EasyAccounting',
      },
    });
  }
  return openRouterClient;
};

// ---------- Constants ----------
const MODEL_ID = 'google/gemini-2.5-flash-lite';
const MAX_RETRIES = 2;

// ---------- Prompt ----------

const buildSystemPrompt = (
  headerContext: string | null,
  categoryList: string | null,
): string => {
  const basePrompt = `
  # Role
  You are a highly precise financial data extraction engine specializing in Taiwanese Credit Card Statements. Your goal is to convert bill images into structured JSON with 100% accuracy.

  # Execution Process (Internal Monologue)
  Before generating JSON, perform these steps mentally:
  1. Identify the table boundaries and column headers (e.g., 消費日, 入帳日, 說明/項目, 臺幣金額).
  2. Scan line-by-line. If a transaction spans two lines (common in installments), merge them.
  3. Distinguish between "Original Purchase" and "Foreign Transaction Fee (國外交易手續費)".

  # CRITICAL EXTRACTION RULES
  1. **NO OMISSIONS**: Every single line item in the transaction section must be extracted. Count the items before outputting.
  2. **ZERO SUMMARY**: Do not include "Total Amount", "Previous Balance", or "Minimum Payment".
  3. **STRICT TRADITIONAL CHINESE**: Convert any Simplified Chinese or raw merchant codes into clean Traditional Chinese (e.g., "Uber*Eats 幫手" -> "Uber Eats").
  4. **INSTALLMENT LOGIC**: Identify patterns like "02/06" or "第2期/共6期". 
    - Set isInstallment: true.
    - Set installmentCurrent: 2, installmentTotal: 6.

  # Field Specifications
  - **description**: Clean brand names. (e.g., "連線商業銀行" -> "LINE Bank", "蝦皮拍賣-通訊服務" -> "蝦皮購物").
  - **type**: 
    - expense: Standard purchases.
    - income: Cash back, refunds, or reversals (often marked with "minus" or "CR").
  - **amount**: Positive float. Remove all commas and currency symbols.

  # Output Format
  Return ONLY a valid JSON array.

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
      "suggestedCategory": "飲食/午餐"
    }
  ]
  \`\`\`

## Detailed Field Rules

1. **Language**: **Always use Traditional Chinese (繁體中文)** if the content is in Chinese (including Simplified Chinese). Keep other languages (English, Japanese, etc.) in their original form.
2. **Date**: Use \`YYYY-MM-DD\` (Western calendar). Follow these rules strictly:
   - **TODAY'S DATE**: Today is **${new Date().toISOString().split('T')[0]}**. Credit card bill dates are ALWAYS within the last 1-2 months from today. If your inferred year results in dates far from today, you are wrong — re-check.
   - **民國年 (ROC Calendar) Conversion**: Taiwanese bills often use 民國 (ROC) year. Convert by adding 1911. Examples: 民國 115 = 2026, 民國 114 = 2025, 115/01/15 = 2026-01-15.
   - **Year Inference**: Look for year clues in bill headers: 繳款截止日, 帳單結帳日, 本期帳單日期, 對帳單期間. Use those dates to determine the correct year for all transactions.
   - **If only MM/DD shown**: Infer the year from the bill period. If no bill period is found, use TODAY'S DATE as reference — the year should make the transaction date fall within the last 1-2 months. DO NOT default to 2024 or any arbitrary year.
   - **Cross-year bills**: If a bill period spans Dec-Jan (e.g., 12/25~01/25), December transactions belong to the previous year and January transactions to the current year.
3. **Time**: Format as \`HH:mm\` if available, otherwise null.
4. **Description**: Extract the BRAND NAME, not the raw description. Examples:
   - "UBER* EATS HELP.UBER.COM" → "Uber Eats"
   - "全聯福利中心台北南港" → "全聯福利中心"
   - "MOMO購物網" → "momo"
4. **Amount**: Number, positive, no thousands separators.
5. **Type**: \`expense\` for purchases, \`income\` for refunds (negative amounts).
6. **Installment**: If it's an installment, set \`isInstallment: true\` and populate \`installmentCurrent\`/\`installmentTotal\`.
7. **Currency**: Default \`TWD\`. Use ISO code (e.g., USD, JPY) for foreign currencies.
10. **Exclusions — CRITICAL**: You MUST only extract **actual individual consumer transactions**. Specifically, **DO NOT** extract any of the following:
      - **Summary / Total rows**: 本期合計, 本期應繳金額, 本期應繳總金額, 本期最低應繳, 本期新增款項合計, 累計未繳款項
      - **Previous period info**: 上期應繳金額, 上期帳單金額, 前期餘額, 上期未還金額
      - **Payment records**: 繳款紀錄, 自動轉帳繳款, 感謝您辦理本行自動轉帳繳款, 溢繳款
      - **Section headers / labels**: 本期消費明細, 本期費用明細, 卡號, 對帳單期間, 繳款截止日
      - **Interest / fees / adjustments**: 循環利息, 預借現金利息, 遲繳違約金, 年費
      - **Point / reward redemptions**: e point折抵消費, 紅利折抵, 現金回饋
      - **Any row** where the description is clearly a summary label rather than a merchant/vendor name

      **Decision framework**: A valid transaction has a **specific date**, a **merchant/vendor name** (not a summary label), and a **monetary amount** for a **specific purchase**. If it looks like metadata about the bill itself, skip it.
11. **suggestedCategory**: Suggest a category from the provided list below. Use the format \`"MainCategory/SubCategory"\` or \`"MainCategory"\` if no sub-category fits. If no category fits, set to null.`;

  // 注入類別清單
  let prompt = basePrompt;
  if (categoryList) {
    prompt += `

## Available Categories

Choose from the following categories for the \`suggestedCategory\` field:
${categoryList}

Use the exact format "MainCategory/SubCategory" or "MainCategory" if no sub-category fits.`;
  }

  if (headerContext) {
    prompt += `

## Important Context

This is a continuation page of the bill. The table columns follow the same order as the previous page.
Previous page header/first row context:
${headerContext}

Please parse this page using the same column structure.`;
  }

  return prompt;
};

// ---------- Core ----------

const callWithRetry = async (
  base64Images: string[],
  headerContext: string | null,
  categoryList: string | null,
): Promise<string> => {
  const client = getClient();

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const imageContents: OpenAI.Chat.Completions.ChatCompletionContentPartImage[] =
        base64Images.map((b64) => ({
          type: 'image_url' as const,
          image_url: { url: `data:image/jpeg;base64,${b64}` },
        }));

      const response = await client.chat.completions.create({
        model: MODEL_ID,
        messages: [
          {
            role: 'system',
            content: buildSystemPrompt(headerContext, categoryList),
          },
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
        max_tokens: 32768, // 自己設定 output 的上限（K2.5 最高支援 65536）
      });

      const finishReason = response.choices[0]?.finish_reason;
      if (finishReason !== 'stop') {
        console.warn(
          `[OpenRouter] ⚠️ finish_reason=${finishReason} (response may be truncated!)`,
        );
      }

      if (response.usage) {
        console.log(
          `[OpenRouter] Token Usage - Prompt: ${response.usage.prompt_tokens}, Completion: ${response.usage.completion_tokens}, Total: ${response.usage.total_tokens} | finish_reason: ${finishReason}`,
        );
      }

      if (!response.choices || response.choices.length === 0) {
        throw new Error(
          `API returned no choices. Response: ${JSON.stringify(response)}`,
        );
      }

      const content = response.choices[0]?.message?.content || '';
      console.log(`[OpenRouter] Raw response length: ${content.length} chars`);

      if (!content.trim()) {
        throw new Error(
          `API returned empty content. finish_reason=${finishReason}. Choices: ${JSON.stringify(response.choices)}`,
        );
      }

      return content;
    } catch (error) {
      if (attempt === MAX_RETRIES) throw error;

      // 指數退避
      const delay = Math.pow(2, attempt) * 1000;
      console.warn(
        `[OpenRouter] Attempt ${attempt + 1} failed, retrying in ${delay}ms... Error: ${error instanceof Error ? error.message : String(error)}`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw new Error('OpenRouter call failed after all retries');
};

/**
 * 解析帳單圖片
 *
 * 逐頁送圖片給 OpenRouter (Kimi K2.5)，收集所有交易
 * 第一頁成功後，將表頭 context 帶給後續頁面（解決跨頁表格問題）
 */
export const parseImages = async (
  imageBuffers: Buffer[],
  categoryList: string | null = null,
): Promise<{
  transactions: ParsedTransaction[];
  pageCount: number;
  provider: string;
  model: string;
}> => {
  const allTransactions: ParsedTransaction[] = [];
  let headerContext: string | null = null;

  console.log(`[OpenRouter] 🔍 Starting parse: ${imageBuffers.length} page(s)`);

  for (let i = 0; i < imageBuffers.length; i++) {
    const base64 = imageBuffers[i]!.toString('base64');
    console.log(
      `[OpenRouter] 📄 Processing page ${i + 1}/${imageBuffers.length} (image size: ${(imageBuffers[i]!.length / 1024).toFixed(0)}KB)`,
    );

    const rawResponse = await callWithRetry(
      [base64],
      headerContext,
      categoryList,
    );
    const result = parseLlmResponse(rawResponse);

    if (!result.success) {
      console.error(
        `[OpenRouter] ❌ Page ${i + 1} parse failed: ${result.error}`,
      );
      console.error(
        `[OpenRouter] Raw response (first 500 chars): ${rawResponse.slice(0, 500)}`,
      );
      console.error(
        `[OpenRouter] Raw response (last 200 chars): ${rawResponse.slice(-200)}`,
      );
      continue;
    }

    console.log(
      `[OpenRouter] ✅ Page ${i + 1}: ${result.data.length} transactions found (accumulated: ${allTransactions.length + result.data.length})`,
    );

    // 第一頁成功後，記錄表頭 context 給後續頁面
    if (i === 0 && result.data.length > 0) {
      const first = result.data[0]!;
      headerContext = Object.keys(first).join(', ');
    }

    allTransactions.push(...result.data);
  }

  console.log(
    `[OpenRouter] 🏁 Parse complete: ${allTransactions.length} total transactions from ${imageBuffers.length} pages`,
  );

  return {
    transactions: allTransactions,
    pageCount: imageBuffers.length,
    provider: 'openrouter',
    model: MODEL_ID,
  };
};
