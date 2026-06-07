import type OpenAI from 'openai';
import { Op } from 'sequelize';
import { format } from 'date-fns';
import {
  RootType,
  PaymentFrequency,
  createTransactionSchema,
  chatDateRangeSchema,
  chatQueryTransactionsSchema,
  chatCreateTransactionDraftSchema,
  chatListCategoriesSchema,
  type ChatTransactionDraft,
} from '@repo/shared';
import statisticsServices from '@/services/statisticsServices';
import transactionServices from '@/services/transactionServices';
import Category from '@/models/category';
import Account from '@/models/account';

/**
 * AI Chat 助理的 tool-calling 工具集。
 *
 * 設計重點：
 * - 所有 tool 的 userId 一律由呼叫端（綁定登入身分）注入，LLM 無法指定，避免越權。
 * - 參數先用 @repo/shared 的 Zod schema 驗證；非法時回傳「友善錯誤字串」給 LLM 重試，
 *   而不是丟例外中斷整個對話。
 * - 唯讀查詢直接重用 statisticsServices / transactionServices，不重寫 SQL。
 * - create_transaction 一律走「先草稿、後確認」：不在對話中靜默寫入，只回傳結構化草稿事件。
 */

// ---------- OpenAI tools 定義 ----------

export const chatTools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'query_spending_by_category',
      description:
        '查詢使用者在指定日期區間內，各分類的支出加總（由高到低）。適用於「我這個月外食花多少」「上季哪個分類超支最多」等問題。',
      parameters: {
        type: 'object',
        properties: {
          startDate: {
            type: 'string',
            description: '區間起始日，格式 YYYY-MM-DD',
          },
          endDate: { type: 'string', description: '區間結束日，格式 YYYY-MM-DD' },
        },
        required: ['startDate', 'endDate'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_overview_trend',
      description:
        '查詢使用者在指定日期區間內的收支總覽：總收入、總支出、結餘，以及金額最高的前三筆支出。適用於「這個月收支如何」「我花最多的是哪幾筆」。',
      parameters: {
        type: 'object',
        properties: {
          startDate: {
            type: 'string',
            description: '區間起始日，格式 YYYY-MM-DD',
          },
          endDate: { type: 'string', description: '區間結束日，格式 YYYY-MM-DD' },
        },
        required: ['startDate', 'endDate'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_transactions',
      description:
        '依日期區間、收支類型、關鍵字、金額區間過濾使用者的交易明細清單（最多回傳 20 筆）。適用於「我上週買了什麼」「有沒有超過 1000 元的支出」。注意：關鍵字／金額過濾僅掃描日期區間內最新的 100 筆交易，若使用者的交易量很大，請盡量提供較窄的日期區間以免遺漏。',
      parameters: {
        type: 'object',
        properties: {
          startDate: { type: 'string', description: '起始日 YYYY-MM-DD（可選）' },
          endDate: { type: 'string', description: '結束日 YYYY-MM-DD（可選）' },
          type: {
            type: 'string',
            enum: [RootType.INCOME, RootType.EXPENSE],
            description: '收支類型（可選）：收入 或 支出',
          },
          keyword: {
            type: 'string',
            description: '描述關鍵字過濾（可選）',
          },
          minAmount: { type: 'number', description: '最小金額（可選）' },
          maxAmount: { type: 'number', description: '最大金額（可選）' },
          limit: {
            type: 'number',
            description: '最多回傳筆數，1~20，預設 20',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_categories',
      description:
        '列出使用者目前可用的分類名稱（可選擇只看「收入」或「支出」）。當使用者問「我有哪些分類」「可以用什麼分類」，或在記帳找不到分類需要提供選項時使用。',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: [RootType.INCOME, RootType.EXPENSE],
            description: '只列出此收支類型的分類（可選）；不填則兩種都列。',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_accounts',
      description:
        '列出使用者目前可用的帳戶名稱。當使用者問「我有哪些帳戶」，或記帳找不到帳戶需要提供選項時使用。',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_transaction',
      description:
        '將使用者用自然語言描述的一筆交易整理成「草稿」。注意：這不會直接記帳，只會產生草稿讓使用者確認。適用於「幫我記一筆昨天 120 的咖啡」。請盡量推斷出金額、收支類型、分類名稱與日期。',
      parameters: {
        type: 'object',
        properties: {
          amount: { type: 'number', description: '金額（正數）' },
          type: {
            type: 'string',
            enum: [RootType.INCOME, RootType.EXPENSE],
            description: '收支類型：收入 或 支出',
          },
          categoryName: {
            type: 'string',
            description:
              '分類名稱，例如「飲料」「午餐」「交通」「薪水」。請用最貼近的既有分類。',
          },
          accountName: {
            type: 'string',
            description: '帳戶名稱（可選），未提供則使用使用者的第一個帳戶',
          },
          description: { type: 'string', description: '交易備註（可選）' },
          date: {
            type: 'string',
            description: '交易日期 YYYY-MM-DD（可選），未提供則為今天',
          },
        },
        required: ['amount', 'type', 'categoryName'],
      },
    },
  },
];

// ---------- 內部 helper ----------

const todayStr = () => format(new Date(), 'yyyy-MM-dd');

/**
 * 名稱模糊比對的分數與挑選邏輯。
 *
 * 為什麼需要：精準 / 子字串 iLike 無法處理「稅務支出」對「稅金」這種
 * 「共享關鍵字但不互相包含」的情況（兩者都含「稅」卻互不為子字串）。
 * 因此再加一層「字元集合 Dice 係數」當後備：把名稱拆成字元集合算重疊比例。
 *
 * 注意：模糊比對只是後備，且草稿一律會顯示給使用者確認，
 * 故即使偶有誤判，使用者也看得到並可取消／改正。
 */
const FUZZY_THRESHOLD = 0.3;

/** 兩字串以「字元集合」計算 Dice 係數：2*交集 / (|a|+|b|)，範圍 0~1。 */
const charDice = (a: string, b: string): number => {
  const sa = new Set([...a]);
  const sb = new Set([...b]);
  if (sa.size === 0 || sb.size === 0) return 0;
  let inter = 0;
  sa.forEach((c) => {
    if (sb.has(c)) inter++;
  });
  return (2 * inter) / (sa.size + sb.size);
};

/** 名稱相似度：精準=1、互為子字串=0.8、否則取字元 Dice。 */
const nameScore = (query: string, name: string): number => {
  const q = query.trim().toLowerCase();
  const n = name.trim().toLowerCase();
  if (!q || !n) return 0;
  if (q === n) return 1;
  if (q.includes(n) || n.includes(q)) return 0.8;
  return charDice(q, n);
};

/**
 * 從候選清單挑出與 query 最接近、且分數達門檻者。
 * 同分時優先有 parentId 的子分類（交易實際掛載處）。
 */
const bestNameMatch = <T extends { name: string; parentId?: unknown }>(
  query: string,
  candidates: T[],
): T | null => {
  let best: T | null = null;
  let bestScore = 0;
  for (const c of candidates) {
    const s = nameScore(query, c.name);
    const isChild = !!c.parentId;
    const bestIsChild = !!best?.parentId;
    if (s > bestScore || (s === bestScore && isChild && !bestIsChild)) {
      best = c;
      bestScore = s;
    }
  }
  return bestScore >= FUZZY_THRESHOLD ? best : null;
};

/**
 * 解析分類名稱 → categoryId（取使用者自有或系統預設，優先子分類）。
 * 比對策略：先精準 iLike；找不到則取「該收支類型」全部分類，於記憶體做模糊比對
 * （子字串／字元重疊），讓「稅務支出」也能對到「稅金」。
 *
 * @param type 若提供，僅在該收支類型下比對，避免支出對到同名收入分類。
 */
const resolveCategoryId = async (
  userId: string,
  name: string,
  type?: RootType,
): Promise<{ id: string; name: string } | null> => {
  const trimmed = name.trim();
  const typeWhere = type ? { type } : {};
  const pick = (categories: any[]) => {
    if (categories.length === 0) return null;
    // 優先選有 parentId 的子分類（交易通常掛在子分類上）
    const preferred = categories.find((c) => c.parentId) ?? categories[0];
    return { id: preferred.id, name: preferred.name };
  };

  // 1) 精準（不分大小寫）比對
  const exact = await Category.findAll({
    where: {
      ...typeWhere,
      name: { [Op.iLike]: trimmed },
      [Op.or]: [{ userId }, { userId: null }],
    },
  });
  if (exact.length > 0) return pick(exact);

  // 2) 取出該類型全部分類，於記憶體做模糊比對（子字串／字元重疊）作為後備
  const candidates = await Category.findAll({
    where: {
      ...typeWhere,
      [Op.or]: [{ userId }, { userId: null }],
    },
  });
  const match = bestNameMatch(trimmed, candidates as any[]);
  return match ? { id: (match as any).id, name: (match as any).name } : null;
};

/**
 * 列出使用者在指定收支類型下可用的分類名稱（給「找不到分類」時提示模型實際選項，
 * 避免模型自己幻想出不存在的分類）。優先列出子分類（交易實際掛載處），去重。
 */
const listCategoryNames = async (
  userId: string,
  type: RootType,
): Promise<string[]> => {
  const categories = await Category.findAll({
    where: {
      type,
      [Op.or]: [{ userId }, { userId: null }],
    },
  });
  const leaves = categories.filter((c) => (c as any).parentId);
  const source = leaves.length > 0 ? leaves : categories;
  const names = source.map((c) => (c as any).name as string);
  return Array.from(new Set(names)); // 去重
};

/** 列出使用者所有未封存帳戶的名稱（給「找不到帳戶」時提示模型可選項） */
const listAccountNames = async (userId: string): Promise<string[]> => {
  const accounts = await Account.findAll({
    where: { userId, isArchived: false },
    order: [['createdAt', 'ASC']],
  });
  return accounts.map((a) => (a as any).name);
};

/**
 * 解析帳戶名稱 → accountId；未指定名稱則取第一個未封存帳戶。
 * 比對策略：先精準 iLike；找不到則取全部未封存帳戶做模糊比對（子字串／字元重疊），
 * 讓「現金」對到「現金錢包」、「CUBE」對到「國泰 CUBE 卡」、口語帳戶名也能命中最接近者。
 */
const resolveAccount = async (
  userId: string,
  name?: string,
): Promise<{ id: string; name: string } | null> => {
  const baseWhere = { userId, isArchived: false };

  if (!name) {
    const first = await Account.findOne({
      where: baseWhere,
      order: [['createdAt', 'ASC']],
    });
    return first
      ? { id: (first as any).id, name: (first as any).name }
      : null;
  }

  const trimmed = name.trim();
  // 1) 精準（不分大小寫）比對
  const exact = await Account.findOne({
    where: { ...baseWhere, name: { [Op.iLike]: trimmed } },
    order: [['createdAt', 'ASC']],
  });
  if (exact) return { id: (exact as any).id, name: (exact as any).name };

  // 2) 取出全部未封存帳戶，於記憶體做模糊比對作為後備
  const accounts = await Account.findAll({
    where: baseWhere,
    order: [['createdAt', 'ASC']],
  });
  const match = bestNameMatch(trimmed, accounts as any[]);
  return match ? { id: (match as any).id, name: (match as any).name } : null;
};

/** 把 Zod 驗證錯誤整理成給 LLM 看的精簡字串 */
const formatZodError = (error: any): string => {
  try {
    return error.issues
      .map((i: any) => `${i.path.join('.') || 'arg'}: ${i.message}`)
      .join('; ');
  } catch {
    return '參數格式錯誤';
  }
};

export interface ChatToolEvent {
  type: 'draft';
  draft: ChatTransactionDraft;
}

export interface ChatToolResult {
  /** 回填給 LLM 的 tool 訊息內容（字串） */
  content: string;
  /** 需要額外推送給前端的結構化事件（如交易草稿） */
  event?: ChatToolEvent;
}

// ---------- Dispatcher ----------

/**
 * 執行單一 tool。userId 由呼叫端注入，絕不取自 LLM 參數。
 * 任何錯誤都轉成 content 字串回給模型，讓對話可以繼續而非崩潰。
 */
export const executeChatTool = async (
  name: string,
  rawArgs: unknown,
  userId: string,
): Promise<ChatToolResult> => {
  try {
    switch (name) {
      case 'query_spending_by_category': {
        const parsed = chatDateRangeSchema.safeParse(rawArgs);
        if (!parsed.success)
          return { content: `參數錯誤：${formatZodError(parsed.error)}` };

        const rows = await statisticsServices.getCategoryTabData(
          parsed.data,
          userId,
        );
        const expenses = rows
          .filter((r) => r.type === RootType.EXPENSE && !r.isTransfer)
          .map((r) => ({ category: r.name, amount: r.amount, count: r.count }))
          .sort((a, b) => b.amount - a.amount);

        if (expenses.length === 0)
          return { content: '此區間沒有任何支出紀錄。' };
        return { content: JSON.stringify({ range: parsed.data, expenses }) };
      }

      case 'query_overview_trend': {
        const parsed = chatDateRangeSchema.safeParse(rawArgs);
        if (!parsed.success)
          return { content: `參數錯誤：${formatZodError(parsed.error)}` };

        const trend = await statisticsServices.getOverviewTrend(
          parsed.data,
          userId,
        );
        const top3 = await statisticsServices.getOverviewTop3Expenses(
          parsed.data,
          userId,
        );
        const topExpenses = top3.map((t: any) => ({
          amount: t.amount,
          description: t.description,
          category: t.category?.name,
          date: t.date,
        }));
        return {
          content: JSON.stringify({
            range: parsed.data,
            income: trend.income,
            expense: trend.expense,
            balance: trend.balance,
            topExpenses,
          }),
        };
      }

      case 'query_transactions': {
        const parsed = chatQueryTransactionsSchema.safeParse(rawArgs);
        if (!parsed.success)
          return { content: `參數錯誤：${formatZodError(parsed.error)}` };

        const { keyword, minAmount, maxAmount, limit, ...query } = parsed.data;
        const needsPostFilter =
          keyword !== undefined ||
          minAmount !== undefined ||
          maxAmount !== undefined;

        const { items } = await transactionServices.getTransactionsByDate(
          { ...query, page: 1, limit: needsPostFilter ? 100 : limit } as any,
          userId,
        );

        let filtered = items as any[];
        if (keyword) {
          const kw = keyword.toLowerCase();
          filtered = filtered.filter((t) =>
            (t.description || '').toLowerCase().includes(kw),
          );
        }
        if (minAmount !== undefined)
          filtered = filtered.filter((t) => Number(t.amount) >= minAmount);
        if (maxAmount !== undefined)
          filtered = filtered.filter((t) => Number(t.amount) <= maxAmount);

        const result = filtered.slice(0, limit).map((t) => ({
          date: t.date,
          amount: Number(t.amount),
          type: t.type,
          description: t.description,
        }));

        if (result.length === 0)
          return { content: '找不到符合條件的交易。' };
        return {
          content: JSON.stringify({ count: result.length, transactions: result }),
        };
      }

      case 'list_categories': {
        const parsed = chatListCategoriesSchema.safeParse(rawArgs);
        if (!parsed.success)
          return { content: `參數錯誤：${formatZodError(parsed.error)}` };

        if (parsed.data.type) {
          const names = await listCategoryNames(userId, parsed.data.type);
          if (names.length === 0)
            return {
              content: `使用者在「${parsed.data.type}」類型下目前沒有任何分類。`,
            };
          return {
            content: JSON.stringify({ type: parsed.data.type, categories: names }),
          };
        }

        const [expense, income] = await Promise.all([
          listCategoryNames(userId, RootType.EXPENSE),
          listCategoryNames(userId, RootType.INCOME),
        ]);
        return {
          content: JSON.stringify({
            expense,
            income,
          }),
        };
      }

      case 'list_accounts': {
        const accounts = await listAccountNames(userId);
        if (accounts.length === 0)
          return { content: '使用者目前沒有任何可用帳戶。' };
        return { content: JSON.stringify({ accounts }) };
      }

      case 'create_transaction': {
        const parsed = chatCreateTransactionDraftSchema.safeParse(rawArgs);
        if (!parsed.success)
          return { content: `參數錯誤：${formatZodError(parsed.error)}` };

        const { amount, type, categoryName, accountName, description, date } =
          parsed.data;

        const category = await resolveCategoryId(userId, categoryName, type);
        if (!category) {
          const availableCats = await listCategoryNames(userId, type);
          return {
            content:
              availableCats.length > 0
                ? `找不到名為「${categoryName}」的分類。使用者在「${type}」類型下實際可用的分類有：${availableCats.join('、')}。請務必從這份清單挑一個最接近的分類重新呼叫 create_transaction，或把清單提供給使用者讓他選；切勿自行虛構不在清單中的分類。`
                : `找不到名為「${categoryName}」的分類，且使用者在「${type}」類型下沒有任何分類，請建議使用者先建立分類。`,
          };
        }

        const account = await resolveAccount(userId, accountName);
        if (!account) {
          if (!accountName)
            return {
              content: '使用者目前沒有任何可用帳戶，無法建立交易。',
            };
          const available = await listAccountNames(userId);
          return {
            content:
              available.length > 0
                ? `找不到名為「${accountName}」的帳戶。使用者目前可用的帳戶有：${available.join('、')}。請從中挑一個最接近的帳戶重新呼叫 create_transaction，或直接詢問使用者要用哪個帳戶。`
                : `找不到名為「${accountName}」的帳戶，且使用者目前沒有任何可用帳戶。`,
          };
        }

        const draftDate = date ?? todayStr();
        const draft: ChatTransactionDraft = {
          amount,
          type,
          date: draftDate,
          // 草稿不綁特定時刻：使用中性的中午 12:00:00，避免 server 時區誤差，
          // 也免得「昨天的咖啡」帶上現在的時刻。使用者可在確認卡片上自行調整。
          time: '12:00:00',
          description: description ?? null,
          accountId: account.id,
          accountName: account.name,
          categoryId: category.id,
          categoryName: category.name,
        };

        // 用既有 transaction schema 驗證，確保草稿可被後續寫入 API 接受
        const validation = createTransactionSchema.safeParse({
          accountId: draft.accountId,
          categoryId: draft.categoryId,
          amount: draft.amount,
          description: draft.description,
          date: draft.date,
          time: draft.time,
          receipt: null,
          paymentFrequency: PaymentFrequency.ONE_TIME,
          type: draft.type,
        });
        if (!validation.success)
          return { content: `草稿驗證失敗：${formatZodError(validation.error)}` };

        return {
          content: `已準備好交易草稿（${draft.type} ${draft.amount} 元，分類「${draft.categoryName}」，帳戶「${draft.accountName}」，日期 ${draft.date}${draft.description ? `，備註「${draft.description}」` : ''}）。草稿已顯示給使用者，請提醒他確認後才會正式記帳。`,
          event: { type: 'draft', draft },
        };
      }

      default:
        return { content: `未知的工具：${name}` };
    }
  } catch (error) {
    console.error(`[chatTools] Error executing tool "${name}":`, error);
    return { content: '執行此查詢時發生錯誤，請稍後再試。' };
  }
};
