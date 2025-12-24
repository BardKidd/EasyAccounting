export interface CategoryType {
  id: string;
  name: string;
  type: string;
  icon: string | null;
  color: string | null;
  children: CategoryType[];
  parent: CategoryType | null;
  parentId: string | null;
  userId: string | null;
}
