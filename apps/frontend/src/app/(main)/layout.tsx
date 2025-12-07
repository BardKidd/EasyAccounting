import { Sidebar, Header } from '@/components/layout';

function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex fixed inset-0 overflow-hidden bg-background">
      {/* inset-0 === top-0 left-0 bottom-0 right-0 */}
      <Sidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="md:container md:mx-auto md:p-8 p-4 pt-4 md:pt-8 w-full max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
