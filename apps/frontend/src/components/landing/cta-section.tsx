'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export function CtaSection() {
  return (
    <section className="py-32 relative overflow-hidden bg-slate-950 text-slate-50 transition-colors duration-500">
      {/* Decorative background blurs */}
      <div className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-emerald-500/50 to-transparent" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="container relative mx-auto px-6 md:px-12 text-center">
        <motion.div
          className="max-w-4xl mx-auto space-y-10 relative z-10"
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, type: 'spring', bounce: 0.3 }}
        >
          <h2 className="font-outfit text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.1]">
            準備好重新定義您的
            <span className="block text-emerald-400 mt-2">財務生活了嗎？</span>
          </h2>

          <p className="text-slate-400 md:text-xl font-medium leading-relaxed tracking-wide max-w-2xl mx-auto">
            加入 EasyAccounting，體驗前所未有的簡單記帳方式。
            現在開始，完全免費，隨時皆可取消。
          </p>

          <div className="pt-8">
            <Link href="/dashboard" prefetch={false}>
              <Button
                size="lg"
                className="h-16 px-12 rounded-2xl bg-emerald-500 text-white hover:bg-emerald-400 text-lg tracking-widest font-bold shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)] hover:shadow-[0_0_60px_-15px_rgba(16,185,129,0.7)] transition-all duration-300 hover:-translate-y-1"
              >
                立即免費開始
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
