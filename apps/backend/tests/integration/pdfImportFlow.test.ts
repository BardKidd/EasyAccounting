import { describe, it, expect, vi, beforeEach } from 'vitest';

process.env.RESEND_API_KEY = 're_123';
process.env.AZURE_BLOB_CONNECTION_STRING =
  'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=test;';

import request from 'supertest';
import { app } from '../../src/app';
import { StatusCodes } from 'http-status-codes';
import { PendingTransactionStatus, ParseStatus } from '@repo/shared';
// Import fixtures
import {
  mockUser,
  mockAccount,
  mockTransaction,
} from '../fixtures/excel_mocks';

// 1. Mock Auth Middleware
vi.mock('@/middlewares/authMiddleware', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    req.user = { userId: mockUser.id, email: mockUser.email };
    next();
  },
}));

// 2. Mock Models
vi.mock('@/models', () => {
  const createMockModel = () => ({
    findOne: vi.fn(),
    findByPk: vi.fn(),
    findAll: vi.fn(),
    findAndCountAll: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    destroy: vi.fn(),
    belongsTo: vi.fn(),
    hasMany: vi.fn(),
    hasOne: vi.fn(),
  });

  return {
    User: createMockModel(),
    Account: createMockModel(),
    Category: createMockModel(),
    Transaction: createMockModel(),
    TransactionExtra: createMockModel(),
    PendingTransaction: createMockModel(),
    BillParseTelemetry: createMockModel(),
    MerchantMapping: createMockModel(),
  };
});

// Mock database utils
vi.mock('@/utils/postgres', () => ({
  default: {
    transaction: vi.fn(() => ({
      commit: vi.fn(),
      rollback: vi.fn(),
    })),
    query: vi.fn(),
    define: vi.fn(() => ({
      belongsTo: vi.fn(),
      hasMany: vi.fn(),
      hasOne: vi.fn(),
      belongsToMany: vi.fn(),
      addHook: vi.fn(),
    })),
  },
  TABLE_DEFAULT_SETTING: {},
}));

import {
  PendingTransaction,
  BillParseTelemetry,
  Transaction,
  TransactionExtra,
} from '@/models';

// 3. Mock External Services
vi.mock('@/utils/azureBlob', () => ({
  uploadFileToBlob: vi.fn(() => Promise.resolve()),
  generateSasUrl: vi.fn(() => 'https://mock-sas-url.com/file'),
  getContainerClient: vi.fn(),
}));

vi.mock('@azure/storage-blob', () => {
  return {
    BlobServiceClient: {
      fromConnectionString: vi.fn(() => ({
        getContainerClient: vi.fn(() => ({
          getBlockBlobClient: vi.fn(() => ({
            uploadData: vi.fn(() => Promise.resolve()),
            url: 'https://mock-blob.com/fake.jpg',
            deleteIfExists: vi.fn(() => Promise.resolve()),
          })),
        })),
      })),
    },
  };
});

vi.mock('@/utils/serviceBus', () => ({
  sendParseMessage: vi.fn(() => Promise.resolve()),
  startWorker: vi.fn(() => ({
    close: vi.fn(),
  })),
}));

describe('PDF Import Flow API Test (Mocked)', () => {
  vi.setConfig({ testTimeout: 10000 });
  const agent = request.agent(app);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. GET /api/pdf/pending - should return empty pending transactions', async () => {
    (PendingTransaction.findAndCountAll as any).mockResolvedValue({
      rows: [],
      count: 0,
    });
    (BillParseTelemetry.findOne as any).mockResolvedValue(null);

    const res = await agent.get('/api/pdf/pending');

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body.isSuccess).toBe(true);
    expect(res.body.data.data).toEqual([]);
    expect(res.body.data.activeJob).toBeNull();
  });

  it('2. POST /api/pdf/upload - should upload images and create telemetry', async () => {
    (BillParseTelemetry.create as any).mockResolvedValue({});

    const fakeImageBuffer = Buffer.from('fake-jpeg-data');

    const res = await agent
      .post('/api/pdf/upload')
      .attach('files', fakeImageBuffer, {
        filename: 'page1.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body.isSuccess).toBe(true);
    expect(res.body.data.uploadId).toBeDefined();
    expect(res.body.data.blobUrls).toHaveLength(1);
    expect(res.body.data.blobUrls[0]).toBe('https://mock-blob.com/fake.jpg');

    // Verifies telemetry task was created
    expect(BillParseTelemetry.create).toHaveBeenCalled();
  });

  it('3. POST /api/pdf/parse/:uploadId - should queue parse job', async () => {
    const res = await agent.post('/api/pdf/parse/upload-123').send({
      blobUrls: ['https://mock-blob.com/fake.jpg'],
    });

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body.isSuccess).toBe(true);
    expect(res.body.data.status).toBe(ParseStatus.QUEUED);
  });

  it('4. POST /api/pdf/confirm - should convert pending to real transactions', async () => {
    const mockPendingTx = {
      id: 'ptx-1',
      userId: mockUser.id,
      uploadBatchId: 'batch-1',
      rawMerchantName: 'Test Merchant',
      suggestedCategoryId: 'cat-1',
      status: PendingTransactionStatus.PENDING,
      transactionData: {
        amount: 100,
        type: 'expense',
        description: 'Mock item',
        date: '2026-02-01',
        time: '12:00:00',
        categoryId: 'cat-1',
        extraAdd: 0,
        extraMinus: 0,
      },
    };

    (PendingTransaction.findAll as any).mockResolvedValue([mockPendingTx]);
    (PendingTransaction.count as any).mockResolvedValue(0); // skipped count
    (TransactionExtra.create as any).mockResolvedValue({ id: 'extra-1' });
    (Transaction.create as any).mockResolvedValue({ id: 'tx-1' });
    (BillParseTelemetry.findOne as any).mockResolvedValue({
      update: vi.fn(),
      totalTransactions: 1,
    });

    const res = await agent.post('/api/pdf/confirm').send({
      transactionIds: ['ptx-1'],
      accountId: 'acc-1',
    });

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body.isSuccess).toBe(true);
    expect(res.body.data.created).toBe(1);
    expect(Transaction.create).toHaveBeenCalled();
  });
});
