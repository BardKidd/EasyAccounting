import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { toast } from 'sonner';
import { ResponseHelper } from '@repo/shared';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 與後端共用的 API 報錯格式
function isResponseHelper(error: unknown): error is ResponseHelper<any> {
  return (
    error !== null &&
    typeof error === 'object' &&
    'isSuccess' in error &&
    'data' in error &&
    'message' in error &&
    'error' in error
  );
}

/**
 * 取得錯誤訊息的輔助函數
 */
export function getErrorMessage(errors: unknown): string {
  // 1. 先檢查是不是自己的 ResponseHelper 格式
  console.log('errors===================', isResponseHelper(errors));
  if (isResponseHelper(errors)) {
    // 因為使用 toast 這個元件，所以好像只能顯示字串，所以只能取第一個錯誤訊息
    if (errors.error && errors.error.length > 0) {
      return errors.error[0].message; // 參考ErrorObject 格式
    }
    // 否則顯示 message
    return errors.message;
  }

  // 2. 以下再檢查可能是一般 JS 的錯誤
  if (errors instanceof Error) {
    return errors.message;
  }
  if (errors && typeof errors === 'object' && 'message' in errors) {
    return String(errors.message);
  }
  if (typeof errors === 'string') {
    return errors;
  }

  // 3. 都不是，回傳預設訊息
  return '發生未知錯誤';
}

// 適合直接呼叫某個 UI 等待結果
export async function simplifyTryCatch(
  cb: () => Promise<any>,
  setIsLoading: (isLoading: boolean) => void
) {
  try {
    await cb();
  } catch (error) {
    throw error;
  } finally {
    setIsLoading(false);
  }
}
// 有針對 Server Components 和 Client Components 兩種寫法差異去做調整
export async function apiHandler(
  url: string,
  method: string,
  data: any,
  headers?: any
): Promise<ResponseHelper<any>> {
  const domain = process.env.NEXT_PUBLIC_API_DOMAIN;
  const caseInsensitiveMethod = method.toUpperCase();

  const config: RequestInit = {
    method: caseInsensitiveMethod,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: data ? JSON.stringify(data) : undefined,
  };

  if (typeof window === 'undefined') {
    // Server Side: 需要手動抓取 Cookie 並加到 Header，因為他不會像瀏覽器一樣自動帶入 Cookie。
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    config.headers = {
      ...config.headers,
      Cookie: cookieStore.toString(),
    };
  } else {
    // Client Side: 使用 credentials include 自動帶 Cookie
    config.credentials = 'include';
  }

  const res = await fetch(`${domain}${url}`, config);
  const result = (await res.json()) as ResponseHelper<any>;

  // 錯誤跳去 catch
  if (!result.isSuccess) {
    throw result;
  }
  return result;
}
