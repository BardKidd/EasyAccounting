'use client';

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { useSearchParams } from 'next/navigation';

type PaginationType = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

const CustomPagination = ({ pagination }: { pagination: PaginationType }) => {
  // query 的固定寫法，以前都用 window.location.search，但 SSR 的話會沒有 window
  // 這個是「唯獨」的當前參數(會自動監聽變化所以也不需要去寫監聽)
  const searchParams = useSearchParams();

  const createPageURL = (pageNumber: number | string) => {
    // 複製一份 Web API 的格式後才可以修改並且使用其他操作
    // 直接 console 會看到 size 之類奇怪的內容，需要使用 .toString() 來轉換
    const params = new URLSearchParams(searchParams); // 不是一般的物件，需要使用 .toString() 來轉換

    params.set('page', pageNumber.toString());
    return `?${params.toString()}`;
  };

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href={createPageURL(pagination.page > 1 ? pagination.page - 1 : 1)}
          />
        </PaginationItem>
        {(() => {
          /**
           * 頁碼 ... 顯示邏輯
           * 頁數很少時，小於 7 頁的話就顯示 1, 2, 3, 4, 5, 6
           * 頁數大於等於 7 的時候，以 10 舉例:
           * 1. 只顯示前面 2 頁 + ... + 最後一頁(第十頁)
           * 2. 假如在中間的話(第五頁)，顯示 1 + ... + 4, 5, 6 + ... + 10
           * 3. 假如在最後的話(第十頁)，顯示 1 + ... + 8, 9, 10
           */
          const { page, totalPages } = pagination;
          const visiblePages = [];
          const delta = 1; // 當前頁碼左右要顯示幾頁

          // 總是顯示第一頁
          visiblePages.push(1);

          // 計算中間頁碼範圍
          const rangeStart = Math.max(2, page - delta);
          const rangeEnd = Math.min(totalPages - 1, page + delta);

          // 如果第一頁跟範圍起點中間有空缺，加入 ...
          if (rangeStart > 2) {
            visiblePages.push('ellipsis-start');
          }

          // 加入中間頁碼
          for (let i = rangeStart; i <= rangeEnd; i++) {
            visiblePages.push(i);
          }

          // 如果範圍終點跟最後一頁中間有空缺，加入 ...
          if (rangeEnd < totalPages - 1) {
            visiblePages.push('ellipsis-end');
          }

          // 總是顯示最後一頁（除非只有一頁）
          if (totalPages > 1) {
            visiblePages.push(totalPages);
          }

          return visiblePages.map((p, index) => {
            if (typeof p === 'string') {
              return (
                <PaginationItem key={p}>
                  <PaginationEllipsis />
                </PaginationItem>
              );
            }

            return (
              <PaginationItem key={p}>
                <PaginationLink href={createPageURL(p)} isActive={page === p}>
                  {p}
                </PaginationLink>
              </PaginationItem>
            );
          });
        })()}
        <PaginationItem>
          <PaginationNext
            href={createPageURL(
              Number(pagination.page) === Number(pagination.totalPages)
                ? Number(pagination.page)
                : Number(pagination.page) + 1
            )}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};

export default CustomPagination;
