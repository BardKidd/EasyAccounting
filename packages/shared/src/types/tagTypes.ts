// 標籤型別（前後端共用）。對應 backend src/models/tag.ts。
export interface TagType {
  id: string;
  userId: string;
  name: string;
  color: string;
  groupName: string | null;
  isArchived: boolean;
}

// 交易回應中夾帶的精簡標籤（getTransactionsByDate / getTransactionById）
export interface TransactionTagBrief {
  id: string;
  name: string;
  color: string;
  groupName: string | null;
}
