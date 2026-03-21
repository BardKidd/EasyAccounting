'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { Footer } from './footer';

interface InfoLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function InfoLayout({ title, subtitle, children }: InfoLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-500">
      {/* Background Decor */}
      <div className="fixed top-0 right-0 -mr-32 -mt-32 w-96 h-96 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 left-0 -ml-32 -mb-32 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <h3 className="font-outfit text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Easy<span className="text-emerald-500">Accounting</span>
            </h3>
          </Link>
          <Button variant="ghost" asChild className="text-slate-600 dark:text-slate-400 hover:text-emerald-500">
            <Link href="/" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              返回首頁
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 relative z-10 py-16 md:py-24">
        <div className="container mx-auto px-6 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4 mb-12 text-center md:text-left"
          >
            <h1 className="font-outfit text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
              {title}
            </h1>
            {subtitle && (
              <p className="text-lg text-slate-600 dark:text-slate-400 font-medium max-w-2xl">
                {subtitle}
              </p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-white/20 dark:border-slate-800/50 rounded-3xl p-8 md:p-12 shadow-2xl"
          >
            <div className="w-full">
              {children}
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
