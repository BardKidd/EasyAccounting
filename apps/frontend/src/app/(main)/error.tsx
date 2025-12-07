'use client'; // Error components must be Client Components

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RotateCcw } from 'lucide-react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getErrorMessage } from '@/lib/utils';

function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-[80vh] w-full flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-destructive/20">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-destructive/10 p-3 ring-1 ring-destructive/20">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-xl font-bold text-foreground">
            無法載入頁面
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground text-sm">
            系統在讀取資料時發生了預期外的錯誤。別擔心，這通常只是暫時的連線問題。
          </p>

          {/* DEV 下顯示錯誤細節，PRD 的話不顯示 */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-muted/50 rounded-md p-3 text-xs font-mono text-left overflow-auto max-h-[500px] border">
              {getErrorMessage(error)}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button
            onClick={() => reset()}
            className="cursor-pointer gap-2 min-w-[120px]"
          >
            <RotateCcw className="h-4 w-4" />
            再試一次
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default Error;
