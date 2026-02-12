export const PDF_VALIDATION = {
  allowedTypes: ['application/pdf'],
  allowedImageTypes: ['image/jpeg', 'image/png'],
  maxPdfSize: 10 * 1024 * 1024, // 10MB
  maxImageSize: 5 * 1024 * 1024, // 5MB per image
  maxImageCount: 50, // 最多 50 頁
  imageFormat: 'image/jpeg', // PDF 轉圖片統一用 JPEG
  imageQuality: 0.85,
} as const;

interface FileInfo {
  size: number;
  type?: string; // MIME type, 後端可能沒有
}

/**
 * 驗證 PDF 檔案（前後端共用）
 *
 * 前端傳 File 物件，後端傳 { size, type } 即可
 */
export const validatePdfFile = (
  file: FileInfo,
): { valid: boolean; error?: string } => {
  // MIME type 檢查（後端可能不帶 type，跳過）
  if (
    file.type &&
    !(PDF_VALIDATION.allowedTypes as ReadonlyArray<string>).includes(file.type)
  ) {
    return { valid: false, error: '只允許上傳 PDF 檔案' };
  }

  if (file.size > PDF_VALIDATION.maxPdfSize) {
    return { valid: false, error: '檔案大小不可超過 10MB' };
  }

  return { valid: true };
};

/**
 * 驗證圖片檔案列表（前端本地模式轉出的 JPEG）
 */
export const validateImageFiles = (
  images: FileInfo[],
): { valid: boolean; error?: string } => {
  if (images.length > PDF_VALIDATION.maxImageCount) {
    return {
      valid: false,
      error: `最多僅支援 ${PDF_VALIDATION.maxImageCount} 頁`,
    };
  }

  for (const img of images) {
    if (img.size > PDF_VALIDATION.maxImageSize) {
      return { valid: false, error: '單頁圖片不可超過 5MB' };
    }
  }

  return { valid: true };
};
