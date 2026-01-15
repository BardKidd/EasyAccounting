import { apiHandler } from '@/lib/utils';
import { ResponseHelper } from '@repo/shared';

export interface ReconciliationNotification {
  accountId: string;
  accountName: string;
  statementDate: string;
  unreconciledCount: number;
  message: string;
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  category?: {
    name: string;
    icon?: string;
    color?: string;
  };
  billingDate: string;
}

export interface ReconciliationData {
  accountId: string;
  period: {
    start: string;
    end: string;
  };
  transactions: Transaction[];
}

export interface ConfirmReconciliationPayload {
  confirmedTransactionIds: string[];
  deferredTransactionIds: string[];
}

export const getReconciliationNotifications = async (): Promise<
  ResponseHelper<ReconciliationNotification[]>
> => {
  return await apiHandler('/notifications/reconciliation', 'get', null);
};

export const getReconciliationData = async (
  accountId: string
): Promise<ResponseHelper<ReconciliationData>> => {
  return await apiHandler(`/reconciliation/${accountId}`, 'get', null);
};

export const confirmReconciliation = async (
  accountId: string,
  payload: ConfirmReconciliationPayload
): Promise<ResponseHelper<null>> => {
  return await apiHandler(
    `/reconciliation/${accountId}/confirm`,
    'post',
    payload
  );
};
