// 使用動態載入以避免 SSR（伺服器端渲染）與 canvas/DOMMatrix 相關的問題
// import * as pdfjsLib from 'pdfjs-dist';

export class PasswordRequiredError extends Error {
  constructor() {
    // = new Error('Password required')
    super('Password required');
    this.name = 'PasswordRequiredError';
  }
}

/**
 * 將 PDF 檔案轉換為一組 JPEG Blob 陣列
 * @param file PDF 檔案物件
 * @param password 選擇性參數，用於加密 PDF 的密碼
 * @returns 回傳一個包含多個 Blob（JPEG 圖片）陣列的 Promise
 */
export const convertPdfToImages = async (
  file: File,
  password?: string,
): Promise<Blob[]> => {
  // 動態載入 pdfjs-dist
  // @ts-ignore
  const pdfjsLib = await import('pdfjs-dist'); // pdfjs-dist 需要瀏覽器的 API，所以在上面就 import 有可能會導致錯誤。
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';

  const arrayBuffer = await file.arrayBuffer();

  // 載入 PDF 文件
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      password: password,
    });

    const pdf = await loadingTask.promise;
    const pageCount = pdf.numPages;
    const blobs: Blob[] = [];

    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 }); // 放大比例以提升圖片品質

      // 建立一個 canvas 來渲染頁面
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      if (!context) {
        throw new Error('Canvas context not available');
      }

      // 將頁面渲染到 canvas 上
      await page.render({
        canvasContext: context,
        viewport: viewport,
      } as any).promise;

      // 將 canvas 轉換為 Blob (JPEG 格式)
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.6);
      });

      if (blob) {
        blobs.push(blob);
      }
    }

    return blobs;
  } catch (error: any) {
    if (error.name === 'PasswordException' || error.code === 1) {
      throw new PasswordRequiredError();
    }
    throw error;
  }
};
