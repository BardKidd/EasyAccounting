import {
  BlobSASPermissions,
  BlobServiceClient,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} from '@azure/storage-blob';

const CONNECTION_STRING = process.env.AZURE_BLOB_CONNECTION_STRING || '';
const CONTAINER_NAME =
  process.env.AZURE_STORAGE_CONTAINER_NAME || 'excel-files';

if (!CONNECTION_STRING) {
  console.warn('AZURE_BLOB_CONNECTION_STRING is not defined');
}

// 初始化 BlobServiceClient
const blobServiceClient =
  BlobServiceClient.fromConnectionString(CONNECTION_STRING);
const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);

// block 指的是 Azure Blob Storage 中的一種儲存類型，因為檔案可能很大，所以底層會將大檔案切成多塊 block 儲存。以下的 getBlockBlobClient 直接當作呼叫取得該檔案的 function 就好。

export const uploadFileToBlob = async (
  blobName: string,
  buffer: Buffer,
  contentType: string = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
) => {
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: {
      blobContentType: contentType,
    },
  });

  return blockBlobClient.url;
};

export const generateSasUrl = (
  blobName: string,
  expiresInMinutes: number = 15
) => {
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  // (.*?) 會抓取到在這裡的最短字串
  const matches = CONNECTION_STRING.match(
    /AccountName=(.*?);AccountKey=(.*?);/
  );

  if (!matches) {
    throw new Error('Invalid Connection String format');
  }

  // 抓到後第 0 項是 match 的整個字串，所以 1, 2 才是抓到的值
  const accountName = matches[1] as string;
  const accountKey = matches[2] as string;
  // 產生憑證
  const sharedKeyCredential = new StorageSharedKeyCredential(
    accountName,
    accountKey
  );

  const sasOptions = {
    containerName: CONTAINER_NAME,
    blobName,
    permissions: BlobSASPermissions.parse('r'), // 只能讀取
    startsOn: new Date(),
    expiresOn: new Date(Date.now() + expiresInMinutes * 60 * 1000),
  };

  // 產生 SAS Token，附上我們憑證簽名。
  const sasToken = generateBlobSASQueryParameters(
    sasOptions,
    sharedKeyCredential
  ).toString();

  return `${blockBlobClient.url}?${sasToken}`;
};

export const downloadBuffer = async (blobName: string): Promise<Buffer> => {
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  const downloadBlobResponse = await blockBlobClient.download(0); // 從第 0 個 byte 開始下載。
  // 加個備註：當下載巨型檔案時才會使用到這個 offset，因為通常會避免需要完全重新下載該檔案。

  // 將 readable stream 轉為 buffer
  const chunks: Buffer[] = [];
  // 取得資料流
  const stream = downloadBlobResponse.readableStreamBody;

  if (!stream) {
    throw new Error('Download stream is undefined');
  }

  for await (const chunk of stream) {
    // 防止該 chunk 不是 Buffer，所以轉成 Buffer
    // 在某些 Azure SKD 版本或特殊環境時有可能拿到 Unit8Array
    chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
};
