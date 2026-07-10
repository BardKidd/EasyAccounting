import { ResponseHelper, ChatTransactionDraft } from '@repo/shared';
import { getErrorMessage, getApiDomain } from '@/lib/utils';

export type { ChatTransactionDraft } from '@repo/shared';

export interface MessageContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
  };
}

/** AI 產生、待使用者確認的交易草稿在訊息上的狀態 */
export type DraftStatus = 'pending' | 'confirming' | 'confirmed' | 'cancelled';

export interface ChatMessage {
  role: 'user' | 'ai';
  content: string | MessageContent[];
  /** 後端 create_transaction tool 回傳的交易草稿（若有） */
  draft?: ChatTransactionDraft;
  /** 草稿的確認狀態；僅在 draft 存在時有意義 */
  draftStatus?: DraftStatus;
}

export const streamChat = async (
  message: string | MessageContent[],
  history: ChatMessage[],
  onChunk: (text: string) => void,
  onError: (error: string) => void,
  onComplete: () => void,
  onDraft: (draft: ChatTransactionDraft) => void,
  signal: AbortSignal,
): Promise<void> => {
  const apiUrl = getApiDomain() || 'http://localhost:3000/api';

  try {
    const res = await fetch(`${apiUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, history }),
      // Needs to include credentials if cookie token is required
      credentials: 'include',
      signal,
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('請重新登入以使用此功能');
      }
      throw new Error(`Failed to fetch: ${res.statusText}`);
    }

    if (!res.body) throw new Error('ReadableStream not supported');

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');

    // ⚠️ SSE 事件可能被網路切在兩次 read() 之間（尤其 draft 這種較大的 JSON）。
    // 必須跨 read 累積 buffer，只處理「已收完整的一行」，殘缺的尾段留到下次 read 補齊。
    // 否則半截的 data: 行會 JSON.parse 失敗被丟棄，導致草稿卡片（與確認按鈕）有時整個消失。
    let buffer = '';

    const handleLine = (line: string) => {
      if (!line.startsWith('data:')) return;
      // 移除 "data:" 前綴（容許有無空格），只剩 JSON 物件文字
      const dataText = line.slice(5).trim();
      if (!dataText || dataText === '[DONE]') return;
      try {
        const parsed = JSON.parse(dataText);
        if (parsed.error) {
          onError(parsed.error);
        } else if (parsed.type === 'draft' && parsed.draft) {
          // 結構化事件：AI 準備好的交易草稿，交給 UI 顯示確認卡片
          onDraft(parsed.draft as ChatTransactionDraft);
        } else if (parsed.content) {
          onChunk(parsed.content);
        }
      } catch (e) {
        console.warn('Failed to parse SSE chunk JSON:', dataText);
      }
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // 取出所有以 \n 結尾的完整行；最後殘缺的一段留在 buffer 等下次補齊
      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        handleLine(line);
      }
    }

    // 串流結束：flush 解碼器，並處理 buffer 內最後一段（可能沒有換行結尾）
    buffer += decoder.decode();
    for (const line of buffer.split('\n')) handleLine(line);
    onComplete();
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.log('Stream aborted by user');
      // Abort is not an error we need to surface to the UI as an error state usually
      onComplete();
    } else {
      onError(getErrorMessage(err));
      onComplete();
    }
  }
};
