import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { CategoryType } from '@repo/shared';

interface CategoryState {
  mainType: CategoryType[];
  subType: CategoryType[];
  detailType: CategoryType[];
  setMainType: (mainType: CategoryType[]) => void;
  setSubType: (subType: CategoryType[]) => void;
  setDetailType: (detailType: CategoryType[]) => void;
}

export const useCategoryStore = create<CategoryState>()(
  devtools((set) => ({
    mainType: [],
    subType: [],
    detailType: [],

    setMainType: (mainType) => set({ mainType }),
    setSubType: (subType) => set({ subType }),
    setDetailType: (detailType) => set({ detailType }),
  }))
);
