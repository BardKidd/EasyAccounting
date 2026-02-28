import { Sidebar, Header } from '@/components/layout';

function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex fixed inset-0 overflow-hidden bg-slate-50 dark:bg-[#060c15] transition-colors duration-500">
      {/* Animated Ambient Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 blur-[120px] animate-pulse"
          style={{ animationDuration: '8s' }}
        />
        <div
          className="absolute top-[20%] -right-[10%] w-[30%] h-[50%] rounded-full bg-teal-500/10 dark:bg-teal-500/15 blur-[100px] animate-pulse"
          style={{ animationDuration: '10s' }}
        />
        <div
          className="absolute -bottom-[10%] left-[20%] w-[35%] h-[40%] rounded-full bg-emerald-400/10 dark:bg-emerald-600/15 blur-[110px] animate-pulse"
          style={{ animationDuration: '7s' }}
        />
      </div>

      <Sidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="md:container md:mx-auto md:p-8 p-4 pt-4 md:pt-8 pb-24 md:pb-32 w-full max-w-7xl relative">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
