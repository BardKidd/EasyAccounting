'use client';

import { useRef } from 'react';
import { useCategoryStore } from '@/stores';
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

    useCategoryStore.setState({ mainType, subType, detailType });
    isInitialized.current = true;
  }

  return null;
};

export default InitCategoryStore;
