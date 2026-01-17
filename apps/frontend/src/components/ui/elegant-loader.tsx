'use client';

import { cn } from '@/lib/utils';

interface ElegantLoaderProps {
  message?: string;
  className?: string;
}

export function ElegantLoader({
  message = '載入中...',
  className,
}: ElegantLoaderProps) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-100 flex flex-col items-center justify-center',
        'bg-slate-950/80 backdrop-blur-xl',
        className,
      )}
    >
      {/* Animated Orbs Container */}
      <div className="relative w-32 h-32 mb-8">
        {/* Primary Orb - Outer glow */}
        <div
          className="absolute inset-0 rounded-full bg-linear-to-br from-white/20 to-white/5 blur-2xl animate-pulse"
          style={{ animationDuration: '2s' }}
        />

        {/* Secondary Orb - Floating ring */}
        <div
          className="absolute inset-2 rounded-full border border-white/20 animate-spin"
          style={{ animationDuration: '8s' }}
        />

        {/* Tertiary Orb - Inner glass */}
        <div
          className="absolute inset-4 rounded-full bg-linear-to-br from-white/30 via-white/10 to-transparent backdrop-blur-md border border-white/30 shadow-2xl"
          style={{
            animation: 'breathe 2.5s ease-in-out infinite',
          }}
        />

        {/* Core - Bright center */}
        <div
          className="absolute inset-8 rounded-full bg-white/50 blur-md"
          style={{
            animation: 'breathe 2s ease-in-out infinite',
            animationDelay: '0.5s',
          }}
        />

        {/* Floating particles */}
        <div
          className="absolute top-1/2 left-1/2 w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80"
          style={{
            animation: 'float 3s ease-in-out infinite',
          }}
        />
        <div
          className="absolute top-1/4 left-1/4 w-1 h-1 rounded-full bg-white/60"
          style={{
            animation: 'float 2.5s ease-in-out infinite',
            animationDelay: '0.8s',
          }}
        />
        <div
          className="absolute top-3/4 right-1/4 w-1 h-1 rounded-full bg-white/60"
          style={{
            animation: 'float 3.2s ease-in-out infinite',
            animationDelay: '1.2s',
          }}
        />
      </div>

      {/* Message */}
      <p className="text-white/90 text-lg font-playfair tracking-widest">
        {message}
      </p>

      {/* Subtle loading bar */}
      <div className="mt-6 w-48 h-0.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-linear-to-r from-transparent via-white/60 to-transparent rounded-full"
          style={{
            animation: 'shimmer 1.5s ease-in-out infinite',
          }}
        />
      </div>

      {/* Custom keyframes */}
      <style jsx>{`
        @keyframes breathe {
          0%,
          100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.08);
            opacity: 0.8;
          }
        }
        @keyframes float {
          0%,
          100% {
            transform: translate(-50%, -50%) translateY(0);
          }
          50% {
            transform: translate(-50%, -50%) translateY(-8px);
          }
        }
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(200%);
          }
        }
      `}</style>
    </div>
  );
}
