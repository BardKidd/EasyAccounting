import Image from 'next/image';
import LoginBackground from '@/assets/login_background.png';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full relative flex items-center justify-center overflow-hidden bg-slate-950">
      {/* Background Image with optional blur for Depth of Field */}
      <div className="absolute inset-0 w-full h-full z-0">
        <Image
          src={LoginBackground}
          alt="Authentication background"
          fill
          className="object-cover opacity-90 transition-opacity duration-700 hover:scale-105 transform hover:opacity-100 ease-in-out"
          priority
          placeholder="blur"
          style={{
            /* Subtle zoom effect for "alive" feel */
            transition: 'transform 20s ease-in-out',
          }}
        />
        {/* Dark overlay with blur for DOF effect behind the glass card */}
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
      </div>

      {/* Main Content Container - Centered Glass Card Context */}
      <div className="relative z-10 w-full max-w-lg px-4 animate-in fade-in zoom-in duration-500 slide-in-from-bottom-4">
        {/* Logo and Slogan typically go inside the card or just above it. 
            For this design, let's keep it clean and put the logo inside the cards or just above.
            We'll pass children through which will be the cards.
        */}
        <div className="flex flex-col items-center justify-center mb-8 text-center space-y-2 text-white drop-shadow-md">
          <div className="flex items-center text-2xl font-semibold tracking-wide">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-3 h-8 w-8 text-white"
            >
              <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
            </svg>
            EasyAccounting
          </div>
        </div>

        {children}
      </div>

      {/* Footer / Copyright / Additional Links if needed */}
      <div className="absolute bottom-4 text-xs text-white/50 z-10">
        © {new Date().getFullYear()} EasyAccounting. All rights reserved.
      </div>
    </div>
  );
}
