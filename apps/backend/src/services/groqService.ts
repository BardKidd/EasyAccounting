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
  const basePrompt = `你是一位專業的信用卡帳單解析專家。請從提供的帳單圖片中提取所有交易記錄。

## 輸出格式

回傳一個 JSON 陣列，每個物件代表一筆交易：

\`\`\`json
[
  {
    "date": "YYYY-MM-DD",
    "time": "HH:mm",
    "description": "品牌/商家名稱（簡化）",
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

## 規則

1. **日期格式**：統一使用 \`YYYY-MM-DD\`，如果帳單只有月/日，年份用帳單最上方的年份
2. **時間**：如有則填，沒有則為 null
3. **描述**：提取品牌名稱而非帳單原始敘述。例如：
   - "UBER* EATS HELP.UBER.COM" → "Uber Eats"
   - "全聯福利中心台北南港" → "全聯福利中心"
   - "MOMO購物網" → "momo"
4. **金額**：數字形式，不含千分位符號。正數。
5. **類型**：消費為 \`expense\`，退款為 \`income\`
6. **分期**：如果交易註明「分期」，設定 \`isInstallment: true\`，並填入 \`installmentCurrent\`（第幾期）和 \`installmentTotal\`（總期數）
7. **extraAdd**：折扣金額（正數），如帳單有顯示
8. **extraMinus**：手續費金額（正數），如帳單有顯示（通常出現在分期交易）
9. **幣別**：預設 TWD，如果是外幣交易填入對應幣別代碼
10. **只抓交易行**：忽略帳單摘要、利息、最低應繳等非交易項目`;

  if (headerContext) {
    return `${basePrompt}

## 重要提示

這是帳單的接續頁面，表格欄位順序同前一頁。前頁表頭為：
${headerContext}

請按照相同的欄位順序解析此頁的交易。`;
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
              { type: 'text', text: '請解析這張帳單圖片中的所有交易。' },
              ...imageContents,
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 4096,
      });

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
    const base64 = imageBuffers[i]!.toString('base64');

    const rawResponse = await callGroqWithRetry([base64], headerContext);
    const result = parseLlmResponse(rawResponse);

    if (!result.success) {
      console.warn(`[Groq] Page ${i + 1} parse failed: ${result.error}`);
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
