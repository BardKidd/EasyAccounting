'use client';

import * as React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';

import { cn } from '@/lib/utils';

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'group peer relative inline-flex h-7 w-14 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent outline-none focus-visible:ring-[3px] focus-visible:ring-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-50 shadow-inner backdrop-blur-sm transition-colors duration-300',
        'data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-slate-200 dark:data-[state=unchecked]:bg-slate-800',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'pointer-events-none relative flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md ring-0 transform transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
          'data-[state=checked]:translate-x-7 data-[state=unchecked]:translate-x-0',
        )}
      >
        {/* Inner detail for high-tech look */}
        <span className="h-2 w-2 rounded-full transition-colors duration-300 bg-slate-300 group-data-[state=checked]:bg-emerald-500" />
      </SwitchPrimitive.Thumb>

      {/* Ambient Glow */}
      <span className="absolute inset-0 -z-10 rounded-full bg-emerald-500 blur-md opacity-0 transition-opacity duration-500 group-data-[state=checked]:opacity-40" />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
