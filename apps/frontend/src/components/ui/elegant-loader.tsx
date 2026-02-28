'use client';

import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Logo } from '@/components/ui/logo';

interface ElegantLoaderProps {
  message?: string;
  className?: string;
  fullScreen?: boolean;
  progress?: number;
}

export function ElegantLoader({
  message = '載入中...',
  className,
  fullScreen = true,
  progress,
}: ElegantLoaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center',
        fullScreen
          ? 'fixed inset-0 z-100 bg-slate-50/80 dark:bg-[#060c15]/80 backdrop-blur-xl transition-colors duration-500'
          : 'relative w-full h-full py-8',
        className,
      )}
    >
      {/* Animated Rings Container */}
      <div className="relative flex items-center justify-center w-32 h-32 mb-8">
        {/* Outer Ring - Spins Clockwise */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
          className="absolute inset-0 rounded-full border-4 border-emerald-500/10 dark:border-emerald-500/20 border-t-emerald-500 dark:border-t-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.3)]"
        />

        {/* Inner Ring - Spins Counter-Clockwise */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
          className="absolute inset-4 rounded-full border-4 border-teal-500/10 dark:border-teal-500/20 border-b-teal-500 dark:border-b-teal-500"
        />

        {/* Inner Core Pulsing Background */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          className="absolute inset-10 rounded-full bg-emerald-500/20 blur-md"
        />

        {/* Center Logo */}
        <motion.div
          animate={{ scale: [0.95, 1.05, 0.95] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        >
          <Logo className="w-6 h-6 text-emerald-500" />
        </motion.div>
      </div>

      {/* Message Text */}
      <motion.p
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        className="font-outfit text-slate-800 dark:text-white/90 text-lg sm:text-xl font-semibold tracking-[0.2em] uppercase"
      >
        {message}
      </motion.p>

      {/* Loading Progress Bar Illusion or Actual Progress */}
      <div className="mt-8 w-48 h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative">
        {typeof progress === 'number' ? (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="absolute inset-y-0 left-0 bg-emerald-500 rounded-full"
          />
        ) : (
          <motion.div
            animate={{ x: ['-100%', '200%'] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
            className="absolute inset-y-0 left-0 w-1/2 bg-linear-to-r from-transparent via-emerald-500 to-transparent rounded-full"
          />
        )}
      </div>
      {typeof progress === 'number' && (
        <p className="mt-3 text-sm font-bold text-emerald-600 dark:text-emerald-400 drop-shadow-sm">
          {Math.round(progress)}%
        </p>
      )}
    </div>
  );
}
