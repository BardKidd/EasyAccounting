import { Logo } from '@/components/ui/logo';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full relative flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-[#060c15] transition-colors duration-500">
      {/* Dynamic Ambient Background Elements */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 dark:bg-emerald-500/10 rounded-full blur-[100px] md:blur-[150px] mix-blend-multiply dark:mix-blend-screen opacity-70 animate-pulse transition-opacity duration-[10s]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-teal-500/10 dark:bg-teal-500/10 rounded-full blur-[100px] md:blur-[150px] mix-blend-multiply dark:mix-blend-screen opacity-50 transition-opacity duration-[15s]" />
      </div>

      {/* Main Content Container - Centered Glass Card Context */}
      <div className="relative z-10 w-full max-w-lg px-4 animate-in fade-in zoom-in-95 duration-700 slide-in-from-bottom-8">
        {/* Logo and Slogan */}
        <div className="flex flex-col items-center justify-center mb-8 text-center space-y-3">
          <Logo className="w-8 h-8 text-emerald-500" />
          <div className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white font-outfit">
            EasyAccounting
          </div>
        </div>

        {/* The Auth Forms */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-linear-to-r from-emerald-500 to-teal-500 rounded-3xl blur-md opacity-20 dark:opacity-30 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
          <div className="relative bg-white/90 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-2xl rounded-2xl p-8 md:p-10">
            {children}
          </div>
        </div>
      </div>

      {/* Footer / Copyright */}
      <div className="absolute bottom-6 text-sm font-medium text-slate-500 dark:text-slate-500 z-10 transition-colors">
        © {new Date().getFullYear()} EasyAccounting. All rights reserved.
      </div>
    </div>
  );
}
