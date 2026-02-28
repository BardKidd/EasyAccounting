'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  Sparkles,
  LineChart,
  PieChart,
  Activity,
} from 'lucide-react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type Variants,
} from 'framer-motion';
import { useEffect, useRef } from 'react';

export function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Mouse position
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth springs for the rotation
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [15, -15]), {
    damping: 30,
    stiffness: 200,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-15, 15]), {
    damping: 30,
    stiffness: 200,
  });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      // Calculate mouse position relative to center of container (-0.5 to 0.5)
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;

      mouseX.set(x);
      mouseY.set(y);
    };

    const handleMouseLeave = () => {
      mouseX.set(0);
      mouseY.set(0);
    };

    const element = containerRef.current;
    if (element) {
      element.addEventListener('mousemove', handleMouseMove);
      element.addEventListener('mouseleave', handleMouseLeave);
      return () => {
        element.removeEventListener('mousemove', handleMouseMove);
        element.removeEventListener('mouseleave', handleMouseLeave);
      };
    }
  }, [mouseX, mouseY]);

  const textVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 200, damping: 20 },
    },
  };

  const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-500 pt-20"
      style={{ perspective: '1200px' }}
    >
      {/* Background Decor */}
      <div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="container relative z-10 mx-auto px-6 md:px-12 grid lg:grid-cols-2 gap-16 items-center">
        {/* Left Side: Copy */}
        <motion.div
          className="flex flex-col items-start text-left space-y-8"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          <motion.div
            variants={textVariants}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-600 dark:text-slate-300 shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-emerald-500" />
            全新記帳體驗
          </motion.div>

          <motion.h1
            variants={textVariants}
            className="font-outfit text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.1]"
          >
            輕鬆掌握
            <span className="block text-emerald-500">每一筆財富</span>
          </motion.h1>

          <motion.p
            variants={textVariants}
            className="max-w-xl text-lg md:text-xl text-slate-600 dark:text-slate-400 leading-relaxed font-medium"
          >
            告別繁瑣的試算表。使用
            EasyAccounting，透過視覺化報表與直覺的操作，重新奪回您的財務控制權。
          </motion.p>

          <motion.div
            variants={textVariants}
            className="flex flex-col sm:flex-row gap-4 pt-4"
          >
            <Button
              size="lg"
              className="h-14 px-8 rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400 text-base font-semibold shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-1"
              asChild
            >
              <Link href="/dashboard">免費開始使用</Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="group h-14 px-8 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-base font-semibold hover:-translate-y-1 transition-all"
              asChild
            >
              <Link
                href="#features"
                onClick={(e) => {
                  e.preventDefault();
                  document
                    .getElementById('features')
                    ?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                探索功能
                <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </motion.div>
        </motion.div>

        {/* Right Side: 3D Interactive Mockup */}
        <motion.div
          className="relative hidden lg:block"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <motion.div
            style={{
              rotateX,
              rotateY,
              transformStyle: 'preserve-3d',
            }}
            className="relative w-full aspect-square md:aspect-4/3 rounded-3xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-white/20 dark:border-slate-800/50 p-6 shadow-2xl flex flex-col gap-6"
          >
            {/* Mockup Header */}
            <div
              className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4"
              style={{ transform: 'translateZ(30px)' }}
            >
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded-full" />
            </div>

            {/* Mockup Content */}
            <div
              className="flex-1 grid grid-cols-2 gap-4"
              style={{ transform: 'translateZ(50px)' }}
            >
              <div className="col-span-2 bg-slate-50 dark:bg-slate-950 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-sm">
                <div>
                  <p className="text-sm text-slate-500 font-medium mb-1">
                    本月總資產
                  </p>
                  <p className="text-3xl font-bold font-outfit text-slate-900 dark:text-white">
                    $124,500
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                  <LineChart className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                <PieChart className="w-6 h-6 text-indigo-500 mb-4" />
                <div>
                  <p className="text-sm text-slate-500 font-medium mb-1">
                    支出分析
                  </p>
                  <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex">
                    <div className="h-full bg-indigo-500 w-1/2" />
                    <div className="h-full bg-emerald-500 w-1/3" />
                  </div>
                </div>
              </div>

              <div
                className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between"
                style={{ transform: 'translateZ(20px)' }}
              >
                <Activity className="w-6 h-6 text-rose-500 mb-4" />
                <div>
                  <p className="text-sm text-slate-500 font-medium mb-1">
                    活躍動態
                  </p>
                  <p className="text-lg font-bold font-outfit text-slate-900 dark:text-white">
                    + 32 筆
                  </p>
                </div>
              </div>
            </div>

            {/* Floating Element */}
            <motion.div
              className="absolute -right-12 -bottom-12 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 flex items-center gap-4"
              style={{ transform: 'translateZ(80px)' }}
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
            >
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  智慧分析已完成
                </p>
                <p className="text-xs text-slate-500">減少了 15% 不必要開銷</p>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
