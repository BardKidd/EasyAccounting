import {
  ServiceBusClient,
  ServiceBusSender,
  ServiceBusReceiver,
  ServiceBusReceivedMessage,
  ProcessErrorArgs,
} from '@azure/service-bus';

const QUEUE_NAME =
  process.env.AZURE_SERVICE_BUS_QUEUE_NAME || 'bill-parse-queue';

let sbClient: ServiceBusClient | null = null;

/**
 * 取得 Service Bus Client（Singleton）
 *
 * 只在有設定 connection string 時才初始化，
 * 避免開發環境沒設定時就掛掉。
 */
const getClient = (): ServiceBusClient => {
  if (!sbClient) {
    const connectionString = process.env.AZURE_SERVICE_BUS_CONNECTION_STRING;

    if (!connectionString) {
      throw new Error('AZURE_SERVICE_BUS_CONNECTION_STRING is not defined');
    }

    sbClient = new ServiceBusClient(connectionString);
  }

  return sbClient;
};

// ---------- Producer ----------

let sender: ServiceBusSender | null = null;

const getSender = (): ServiceBusSender => {
  if (!sender) {
    sender = getClient().createSender(QUEUE_NAME);
  }
  return sender;
};

export interface BillParseMessage {
  uploadId: string;
  userId: string;
  blobUrls: string[];
  processingMode: 'local' | 'cloud';
  password?: string;
}

/**
 * 發送解析任務到 Queue
 */
export const sendParseMessage = async (
  message: BillParseMessage,
): Promise<void> => {
  await getSender().sendMessages({
    body: message,
    messageId: message.uploadId,
    contentType: 'application/json',
  });
};

// ---------- Consumer ----------

export interface MessageHandler {
  processMessage: (message: BillParseMessage) => Promise<void>;
  processError: (error: Error) => Promise<void>;
}

/**
 * 啟動 Worker 監聽 Queue
 *
 * 呼叫後會持續監聽，直到呼叫 closeWorker()。
 * 一次只處理一筆（maxConcurrentCalls: 1），避免 rate limit。
 */
export const startWorker = (handler: MessageHandler): ServiceBusReceiver => {
  const receiver = getClient().createReceiver(QUEUE_NAME);

  receiver.subscribe(
    {
      processMessage: async (receivedMessage: ServiceBusReceivedMessage) => {
        console.log(
          '[ServiceBus Worker] Raw received message:',
          receivedMessage.messageId,
        );
        try {
          await handler.processMessage(
            receivedMessage.body as BillParseMessage,
          );
          // 只有處理成功才從 Queue 移除，避免 tsx force kill 時訊息遺失
          await receiver.completeMessage(receivedMessage);
        } catch (err) {
          // 處理失敗，abandon 讓訊息回到 Queue 重試
          await receiver.abandonMessage(receivedMessage);
          throw err;
        }
      },
      processError: async (args: ProcessErrorArgs) => {
        await handler.processError(args.error);
      },
    },
    {
      maxConcurrentCalls: 1,
      autoCompleteMessages: false,
    },
  );

  return receiver;
};

// ---------- Cleanup ----------

/**
 * 關閉所有連線（graceful shutdown 用）
 */
export const closeServiceBus = async (): Promise<void> => {
  if (sender) {
    await sender.close();
    sender = null;
  }
  if (sbClient) {
    await sbClient.close();
    sbClient = null;
  }
};
