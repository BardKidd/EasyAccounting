import { v4 as uuidv4 } from 'uuid';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import {
  validatePdfFile,
  validateImageFiles,
  PDF_VALIDATION,
} from '@repo/shared';

const CONNECTION_STRING = process.env.AZURE_BLOB_CONNECTION_STRING || '';
const CONTAINER_NAME = 'pdf-temp';

let containerClient: ContainerClient | null = null;

const getContainerClient = (): ContainerClient => {
  if (!containerClient) {
    if (!CONNECTION_STRING) {
      throw new Error('AZURE_BLOB_CONNECTION_STRING is not defined');
    }
    const blobServiceClient =
      BlobServiceClient.fromConnectionString(CONNECTION_STRING);
    containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
  }
  return containerClient;
};

/**
 * 上傳圖片到 pdf-temp container
 *
 * 本地模式：前端已把 PDF 轉成 JPEG，上傳多張圖片
 * 雲端模式：前端上傳 PDF，後端處理（Phase 2 再實作轉檔邏輯）
 */
export const uploadImages = async (
  userId: string,
  files: Express.Multer.File[],
): Promise<{ uploadId: string; blobUrls: string[] }> => {
  const uploadId = uuidv4();
  const container = getContainerClient();
  const blobUrls: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;
    // 路徑格式：{userId}/{uploadId}/page-{index}.jpg
    const blobName = `${userId}/${uploadId}/page-${i}.jpg`;
    const blockBlobClient = container.getBlockBlobClient(blobName);

    await blockBlobClient.uploadData(file.buffer, {
      blobHTTPHeaders: {
        blobContentType: file.mimetype,
      },
    });

    blobUrls.push(blockBlobClient.url);
  }

  return { uploadId, blobUrls };
};

/**
 * 上傳 PDF 到 pdf-temp container（雲端模式）
 */
export const uploadPdf = async (
  userId: string,
  file: Express.Multer.File,
): Promise<{ uploadId: string; blobUrl: string }> => {
  const uploadId = uuidv4();
  const container = getContainerClient();
  const blobName = `${userId}/${uploadId}/original.pdf`;
  const blockBlobClient = container.getBlockBlobClient(blobName);

  await blockBlobClient.uploadData(file.buffer, {
    blobHTTPHeaders: {
      blobContentType: 'application/pdf',
    },
  });

  return { uploadId, blobUrl: blockBlobClient.url };
};

/**
 * 刪除某次上傳的所有暫存（Worker 完成後呼叫）
 */
export const deleteTempBlobs = async (blobUrls: string[]): Promise<void> => {
  const container = getContainerClient();

  for (const url of blobUrls) {
    // 從 URL 取得 blob name（URL 格式：https://{account}.blob.core.windows.net/{container}/{blobName}）
    const urlObj = new URL(url);
    // pathName: /{container}/{blobName}，去掉 /{container}/
    const blobName = urlObj.pathname.split('/').slice(2).join('/');
    const blockBlobClient = container.getBlockBlobClient(blobName);

    await blockBlobClient.deleteIfExists();
  }
};

/**
 * 驗證上傳的檔案
 */
export const validateUploadFiles = (
  files: Express.Multer.File[],
  mode: 'local' | 'cloud',
): { valid: boolean; error?: string } => {
  if (!files || files.length === 0) {
    return { valid: false, error: '未上傳任何檔案' };
  }

  if (mode === 'cloud') {
    // 雲端模式：只接受一個 PDF
    if (files.length !== 1) {
      return { valid: false, error: '雲端模式只能上傳一個 PDF 檔案' };
    }
    const file = files[0]!;

    // 透過檔案格式該投的固定簽名來判斷，而不是從副檔名
    // https://en.wikipedia.org/wiki/List_of_file_signatures
    const header = file.buffer.subarray(0, 5).toString();
    if (header !== '%PDF-') {
      return { valid: false, error: '檔案不是有效的 PDF' };
    }

    return validatePdfFile({ size: file.size, type: file.mimetype });
  }

  // 本地模式：接受多張圖片
  const imageInfos = files.map((f) => ({
    size: f.size,
    type: f.mimetype,
  }));

  // 檢查 MIME type
  for (const img of imageInfos) {
    if (
      !(PDF_VALIDATION.allowedImageTypes as ReadonlyArray<string>).includes(
        img.type,
      )
    ) {
      return { valid: false, error: '只允許 JPEG 或 PNG 格式的圖片' };
    }
  }

  return validateImageFiles(imageInfos);
};
