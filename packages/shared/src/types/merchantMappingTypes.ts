// 商家→分類自動對應型別（前後端共用）。對應 backend src/models/MerchantMapping.ts。
export interface MerchantMappingType {
  id: string;
  userId: string;
  merchantName: string;
  categoryId: string;
  matchCount: number;
  isEnabled: boolean;
}

// 管理頁列表項：夾帶分類顯示資訊（名稱/圖示/色）以免前端再查一次。
// categoryName 為 null 代表對應指向的分類已被刪除（軟刪）。
export interface MerchantMappingListItem {
  id: string;
  merchantName: string;
  categoryId: string;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
  matchCount: number;
  isEnabled: boolean;
}
