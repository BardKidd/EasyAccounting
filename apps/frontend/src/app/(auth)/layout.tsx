import Image from 'next/image';
import LoginBackground from '@/assets/login_background.png';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
      <div className="hidden lg:block relative h-full w-full">
        <Image
          src={LoginBackground}
          alt="Authentication background"
          fill
          className="object-cover"
          priority
          placeholder="blur"
        />
        <div className="absolute inset-0 bg-black/40" />{' '}
        {/* Overlay for better text readability if needed */}
        <div className="relative z-20 flex h-full flex-col justify-between p-10 text-white">
          <div className="flex items-center text-lg font-medium">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2 h-6 w-6"
            >
              <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
            </svg>
            EasyAccounting
          </div>
          <div className="space-y-2">
            <blockquote className="space-y-2">
              <p className="text-lg font-playfair italic">
                &ldquo;掌控財務，就是掌控人生。讓每一筆收支都清晰可見，為您的未來奠定堅實基礎。&rdquo;
              </p>
            </blockquote>
          </div>
        </div>
      </div>
      <div className="flex h-full items-center justify-center p-8 bg-slate-50 dark:bg-slate-950">
        {children}
      </div>
    </div>
  );
}
