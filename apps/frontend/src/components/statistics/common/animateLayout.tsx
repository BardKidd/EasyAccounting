'use client';

const AnimateLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-500">
      {children}
    </div>
  );
};

export default AnimateLayout;
