import { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

interface BetaDesignOverlayProps extends ComponentProps<'div'> {}

export function BetaDesignOverlay({
  className,
  ...props
}: BetaDesignOverlayProps) {
  return (
    <div
      className={cn(
        'fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-1000 ease-out',
        className,
      )}
      {...props}
    >
      <div className="relative group cursor-default">
        {/* Glassmorphism Background */}
        <div className="absolute inset-0 bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl transition-all duration-500 group-hover:bg-white/15 dark:group-hover:bg-black/30" />

        {/* Content */}
        <div className="relative p-5 flex flex-col items-end gap-3 min-w-[280px]">
          {/* Badge */}
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/30 bg-white/10 backdrop-blur-sm text-[10px] font-bold tracking-[0.2em] uppercase text-white shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
            Running Preview
          </span>

          {/* Main Text */}
          <div className="text-right space-y-1">
            <p className="text-sm font-medium text-white/90 tracking-wider font-serif">
              Beta 預覽階段
            </p>
            <p className="text-[10px] text-white/60 font-light tracking-wide leading-relaxed">
              致力於打造極致體驗
              <br />
              功能持續優化中
            </p>
          </div>

          {/* Decorative Elements */}
          <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b border-l border-white/10 rounded-bl-2xl opacity-50" />
          <div className="absolute -top-1 -right-1 w-8 h-8 border-t border-r border-white/10 rounded-tr-2xl opacity-50" />
        </div>
      </div>
    </div>
  );
}
