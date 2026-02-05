import { AlertTriangle } from 'lucide-react';

export function MajorRefactorNotice() {
  return (
    <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-200 mb-6">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        <p className="text-sm font-medium">
          系統升級與重構進行中｜為提供更穩定的服務，部分功能正進行優化調整
        </p>
      </div>
    </div>
  );
}
