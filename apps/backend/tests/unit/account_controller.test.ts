import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import accountController from '@/controllers/accountController';
import Account from '@/models/account';
import CreditCardDetail from '@/models/CreditCardDetail';
import sequelize from '@/utils/postgres';
import { Account as AccountEnum } from '@repo/shared';

// Mock Models and Utils
vi.mock('@/models/account', () => ({
  default: {
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    destroy: vi.fn(),
    findByPk: vi.fn(),
  },
}));

vi.mock('@/models/CreditCardDetail', () => ({
  default: {
    create: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/utils/postgres', () => {
  const mSequelize = {
    transaction: vi.fn(() => ({
      commit: vi.fn(),
      rollback: vi.fn(),
    })),
  };
  return { default: mSequelize };
});

vi.mock('@/utils/common', () => ({
  simplifyTryCatch: async (req: any, res: any, fn: any) => {
    try {
      await fn();
    } catch (error) {
      res.status(500).json({ error });
    }
  },
  responseHelper: (
    isSuccess: boolean,
    data: any,
    message: string,
    error: any
  ) => ({
    isSuccess,
    data,
    message,
    error,
  }),
}));

const mockRequest = () => {
  return {
    user: { userId: 'user-123' },
    body: {},
    params: {},
    query: {},
  } as unknown as Request;
};

const mockResponse = () => {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const waitTick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('Account Controller (Mocked)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAccountsByUser', () => {
    it('should return accounts including credit card details', async () => {
      const mockAcc = {
        name: 'Test Acc',
        balance: 100,
        toJSON: () => ({
          name: 'Test Acc',
          balance: 100,
          credit_card_detail: { creditLimit: 5000 },
        }),
      };
      (Account.findAll as any).mockResolvedValue([mockAcc]);

      const req = mockRequest();
      const res = mockResponse();

      await accountController.getAccountsByUser(req, res);
      await waitTick();

      expect(Account.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-123', isArchived: false },
        })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              name: 'Test Acc',
              creditCardDetail: expect.objectContaining({ creditLimit: 5000 }),
            }),
          ]),
        })
      );
    });
  });

  describe('addAccount', () => {
    it('should create general account without credit card detail', async () => {
      const newAcc = { id: 'acc-1' };
      (Account.create as any).mockResolvedValue(newAcc);
      (Account.findByPk as any).mockResolvedValue(newAcc);

      const req = mockRequest();
      req.body = { name: 'Cash', type: '一般' };
      const res = mockResponse();

      await accountController.addAccount(req, res);
      await waitTick();

      expect(Account.create).toHaveBeenCalled();
      expect(CreditCardDetail.create).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
    });

    it('should create credit card account with detail', async () => {
      const newAcc = { id: 'acc-cc' };
      (Account.create as any).mockResolvedValue(newAcc);
      (Account.findByPk as any).mockResolvedValue(newAcc);

      const req = mockRequest();
      req.body = {
        name: 'My Card',
        type: AccountEnum.CREDIT_CARD,
        creditCardDetail: { statementDate: 5 },
      };
      const res = mockResponse();

      await accountController.addAccount(req, res);
      await waitTick();

      expect(Account.create).toHaveBeenCalled();
      expect(CreditCardDetail.create).toHaveBeenCalledWith(
        expect.objectContaining({ statementDate: 5, accountId: 'acc-cc' }),
        expect.anything()
      );
      expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
    });
  });

  describe('editAccount', () => {
    it('should update account and update or create credit card detail', async () => {
      const transaction = { commit: vi.fn(), rollback: vi.fn() };
      (sequelize.transaction as any).mockResolvedValue(transaction);

      (Account.update as any).mockResolvedValue([1]); // 1 row updated
      (CreditCardDetail.findOne as any).mockResolvedValue(null); // No existing detail, so create
      (CreditCardDetail.create as any).mockResolvedValue({});

      const req = mockRequest();
      req.params.accountId = 'acc-cc';
      req.body = {
        name: 'Updated Card',
        type: AccountEnum.CREDIT_CARD,
        creditCardDetail: { statementDate: 10 },
      };
      const res = mockResponse();

      await accountController.editAccount(req, res);
      await waitTick();

      expect(Account.update).toHaveBeenCalled();
      expect(CreditCardDetail.create).toHaveBeenCalled();
      expect(transaction.commit).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    });
  });

  describe('deleteAccount', () => {
    it('should destroy account', async () => {
      (Account.destroy as any).mockResolvedValue(1);

      const req = mockRequest();
      req.params.accountId = 'acc-1';
      const res = mockResponse();

      await accountController.deleteAccount(req, res);
      await waitTick();

      expect(Account.destroy).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'acc-1', userId: 'user-123' } })
      );
      expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    });
  });
});
