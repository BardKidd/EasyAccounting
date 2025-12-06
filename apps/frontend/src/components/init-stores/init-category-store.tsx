'use client';

import { useRef } from 'react';
import stores from '@/stores';
import { CategoryType } from '@repo/shared';

const InitCategoryStore = ({ categories }: { categories: CategoryType[] }) => {
  const isInitialized = useRef(false);

  if (!isInitialized.current) {
    if (!categories || categories.length === 0) {
      return null;
    }

    const mainType = categories.filter((category) => category.parent === null);

    const subType = categories.filter((category) => {
      return mainType.some((main) => main.id === category.parent?.id);
    });
    const detailType = categories.filter((category) => {
      return subType.some((sub) => sub.id === category.parent?.id);
    });

    stores.useCategoryStore.setState({ mainType, subType, detailType });
    isInitialized.current = true;
  }

  return null;
};

export default InitCategoryStore;
