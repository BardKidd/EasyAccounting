import { cn } from '@/lib/utils';
import React from 'react';

export function Logo({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 40 40"
      fill="none"
      className={cn('w-8 h-8', className)}
      {...props}
    >
      {/* Outer Hexagon */}
      <path
        d="M20 4L4 12V28L20 36L36 28V12L20 4Z"
        className="fill-emerald-500/10 stroke-emerald-500 dark:stroke-emerald-400"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Inner Geometry Lines */}
      <path
        d="M20 4L20 20L4 12"
        className="stroke-emerald-400 dark:stroke-emerald-300"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 4L20 20L36 12"
        className="stroke-teal-500 dark:stroke-teal-400"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 36L20 20L4 28"
        className="stroke-emerald-600 dark:stroke-emerald-500"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 36L20 20L36 28"
        className="stroke-teal-600 dark:stroke-teal-500"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Center Glow Node */}
      <circle cx="20" cy="20" r="3" className="fill-emerald-400" />
    </svg>
  );
}
