import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="container mx-auto py-6 space-y-8">
      {/* Header（靜態文字與頁面一致，避免載入完成時閃跳） */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight bg-linear-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent font-outfit uppercase">
          帳單匯入
        </h1>
      </div>

      {/* 檔案上傳 dropzone */}
      <div className="border-2 border-dashed rounded-3xl p-16 text-center border-slate-200 dark:border-slate-800">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>

      {/* 待確認交易區 */}
      <div className="space-y-4">
        <Skeleton className="h-7 w-40" />
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg border-slate-200 dark:border-slate-800">
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
    </div>
  );
}
