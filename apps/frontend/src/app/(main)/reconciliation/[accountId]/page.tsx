import { getReconciliationData } from '@/services/reconciliationService';
import ReconciliationDetailClient from './reconciliation-detail-client';

export default async function ReconciliationDetailPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;
  const res = await getReconciliationData(accountId);

  if (!res.isSuccess || !res.data) {
    console.error('Failed to fetch reconciliation data:', res.message);
    return <div>找不到資料</div>;
  }

  return <ReconciliationDetailClient data={res.data} accountId={accountId} />;
}
