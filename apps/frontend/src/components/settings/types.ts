import { CategoryType } from '@repo/shared';

export interface ExtendedCategoryType extends CategoryType {
  isMainCategory: boolean;
}

export enum CategoryDialogMode {
  ADD_MAIN = 'ADD_MAIN',
  ADD_SUB = 'ADD_SUB',
  EDIT = 'EDIT',
}
