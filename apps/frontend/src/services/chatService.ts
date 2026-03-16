import { ResponseHelper } from '@repo/shared';
import { getErrorMessage } from '@/lib/utils';

export interface MessageContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
  };
}

export interface ChatMessage {
  role: 'user' | 'ai';
  content: string | MessageContent[];
}

export const streamChat = async (
  message: string | MessageContent[],
  history: ChatMessage[],
  onChunk: (text: string) => void,
  onError: (error: string) => void,
  onComplete: () => void,
  signal: AbortSignal,
): Promise<void> => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

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

    while (true) {
      // 前端打字機效果的主要設定
      const { value, done } = await reader.read();
      if (done) break;

      const chunkStr = decoder.decode(value, { stream: true });
      const lines = chunkStr.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          // 後端傳來 data: {....}
          // 移除 data: 前綴
          // 只會剩下 context 物件。
          const dataText = line.substring(6).trim();
          if (dataText === '[DONE]') {
            continue;
          }
          try {
            const parsed = JSON.parse(dataText);
            if (parsed.error) {
              onError(parsed.error);
            } else if (parsed.content) {
              onChunk(parsed.content);
            }
          } catch (e) {
            console.warn('Failed to parse SSE chunk JSON:', dataText);
          }
        }
      }
    }
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
