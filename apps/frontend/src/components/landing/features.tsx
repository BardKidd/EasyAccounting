'use client';

import {
  BarChart3,
  Cloud,
  Lock,
  PieChart,
  Smartphone,
  Zap,
} from 'lucide-react';
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';
import { MouseEvent, useRef } from 'react';

function FeatureVisual({ name }: { name: string }) {
  if (name === '智慧視覺分析') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl z-0 flex items-center justify-center">
        {/* Core ambient glow */}
        <div className="absolute inset-0 bg-emerald-500/10 blur-[100px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

        {/* Abstract Data Waves Background */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-40 transition-all duration-1000 transform scale-110 group-hover:scale-100 pointer-events-none">
          <svg
            className="w-full h-full"
            viewBox="0 0 600 400"
            preserveAspectRatio="none"
          >
            <motion.path
              initial={{ pathLength: 0, opacity: 0 }}
              whileInView={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 2.5, ease: 'easeOut' }}
              d="M 0 350 C 150 350, 200 150, 350 200 S 500 50, 600 80"
              fill="none"
              stroke="url(#glowGradient1)"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <motion.path
              initial={{ pathLength: 0, opacity: 0 }}
              whileInView={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 3, ease: 'easeOut', delay: 0.3 }}
              d="M 0 380 C 180 380, 250 250, 400 280 S 550 120, 600 160"
              fill="none"
              stroke="url(#glowGradient2)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient
                id="glowGradient1"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="50%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
              <linearGradient
                id="glowGradient2"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.8" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Floating Holographic Widgets */}
        <div className="absolute inset-x-0 top-10 bottom-32 opacity-0 group-hover:opacity-100 transition-all duration-700 translate-y-8 group-hover:translate-y-0">
          {/* Widget 1: Bar Chart Data Panel */}
          <motion.div
            animate={{ y: [-10, 10, -10] }}
            transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
            className="absolute top-8 right-12 md:right-24 w-56 h-36 rounded-2xl bg-white/10 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-[0_20px_40px_rgba(0,0,0,0.1)] p-5 flex flex-col gap-4"
          >
            <div className="flex justify-between items-center">
              <div className="w-24 h-3 bg-slate-300/50 dark:bg-slate-700/50 rounded-full" />
              <div className="w-8 h-3 bg-emerald-500/50 rounded-full" />
            </div>
            <div className="flex-1 flex items-end gap-2 mt-2">
              {[40, 70, 45, 100, 60, 85, 30].map((h, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  whileInView={{ height: `${h}%` }}
                  transition={{
                    duration: 0.8,
                    delay: 0.2 + i * 0.1,
                    type: 'spring',
                    damping: 15,
                  }}
                  className="flex-1 bg-linear-to-t from-emerald-500 to-emerald-400 rounded-sm"
                />
              ))}
            </div>
          </motion.div>

          {/* Widget 2: Orbital Rings / Pie Chart Mockup */}
          <motion.div
            animate={{ y: [10, -10, 10] }}
            transition={{
              repeat: Infinity,
              duration: 6,
              ease: 'easeInOut',
              delay: 1,
            }}
            className="absolute top-24 left-10 md:left-20 w-36 h-36 rounded-2xl bg-white/10 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 shadow-2xl flex items-center justify-center transform-style-3d"
          >
            {/* Outer Spin */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
              className="absolute w-24 h-24 rounded-full border-4 border-emerald-500/30 border-t-emerald-500"
            />
            {/* Inner Spin (Reverse) */}
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ repeat: Infinity, duration: 12, ease: 'linear' }}
              className="absolute w-16 h-16 rounded-full border-4 border-cyan-500/30 border-b-cyan-500"
            />
            {/* Center dot */}
            <div className="w-4 h-4 bg-emerald-400 rounded-full shadow-[0_0_15px_rgba(52,211,153,0.8)]" />
          </motion.div>

          {/* Widget 3: Live Pulse Toast */}
          <motion.div
            animate={{ y: [0, -5, 0], scale: [1, 1.02, 1] }}
            transition={{
              repeat: Infinity,
              duration: 4,
              ease: 'easeInOut',
              delay: 2,
            }}
            className="absolute bottom-16 right-1/4 w-48 h-12 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.15)] flex items-center px-4 gap-3 z-10"
          >
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </div>
            <div className="w-20 h-2 bg-slate-300 dark:bg-slate-700 rounded-full" />
            <div className="ml-auto w-8 h-2 bg-emerald-500/50 rounded-full" />
          </motion.div>
        </div>
      </div>
    );
  }
  if (name === '極速閃電記帳') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl z-0">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          whileInView={{ scale: 1.5, opacity: 0 }}
          whileHover={{ scale: [1, 1.5, 1], opacity: [0, 0.5, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="absolute -top-10 -right-10 w-48 h-48 bg-yellow-400/20 rounded-full blur-2xl"
        />
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          whileHover={{ y: -10, opacity: 1, transition: { duration: 0.3 } }}
          className="absolute bottom-10 right-10 flex gap-2"
        >
          <div className="w-8 h-2 bg-slate-200 dark:bg-slate-700 rounded-full" />
          <div className="w-16 h-2 bg-emerald-400 rounded-full" />
        </motion.div>
      </div>
    );
  }
  if (name === '即時雲端同步') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl z-0">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 25, ease: 'linear' }}
          className="absolute -top-20 -right-20 w-80 h-80 border border-dashed border-emerald-500/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}
          className="absolute -top-8 -right-8 w-48 h-48 border border-emerald-500/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"
        />
        <motion.div
          initial={{ y: 0, opacity: 0 }}
          whileHover={{ y: -20, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="absolute bottom-8 right-8"
        >
          <Cloud className="w-16 h-16 text-emerald-500/20 animate-pulse" />
        </motion.div>
      </div>
    );
  }
  if (name === '銀行級加密保障') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl z-0 flex items-center pr-12 md:pr-24">
        {/* Dynamic Binary Matrix Data Stream */}
        <div className="absolute inset-0 flex flex-col justify-center opacity-[0.03] group-hover:opacity-10 transition-opacity duration-1000 overflow-hidden font-mono tracking-widest text-[10px] md:text-sm text-emerald-500 gap-1 md:gap-2">
          <motion.div
            animate={{ x: [0, -1000] }}
            transition={{ repeat: Infinity, duration: 25, ease: 'linear' }}
            className="whitespace-nowrap"
          >
            {Array(20)
              .fill('01100001 01100011 01100011 01100101 01110011 01110011 ')
              .join('')}
          </motion.div>
          <motion.div
            animate={{ x: [-1000, 0] }}
            transition={{ repeat: Infinity, duration: 30, ease: 'linear' }}
            className="whitespace-nowrap"
          >
            {Array(20)
              .fill(
                '00110010 00110101 00110110 00101101 01100010 01101001 01110100 ',
              )
              .join('')}
          </motion.div>
          <motion.div
            animate={{ x: [0, -1000] }}
            transition={{ repeat: Infinity, duration: 22, ease: 'linear' }}
            className="whitespace-nowrap"
          >
            {Array(20)
              .fill(
                '01010011 01000101 01000011 01010101 01010010 01000101 01000100 ',
              )
              .join('')}
          </motion.div>
        </div>
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-500 relative z-10"
        >
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-32 bg-emerald-500/20 blur-[50px] rounded-full" />
          <Lock className="w-32 h-32 md:w-48 md:h-48 text-slate-100 dark:text-slate-800/80 stroke-1 relative z-10" />
        </motion.div>
      </div>
    );
  }
  if (name === '主動預算守門員') {
    return (
      <div className="absolute inset-x-8 bottom-0 -z-10 pointer-events-none overflow-hidden rounded-b-3xl flex items-end justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-700">
        {[40, 70, 45, 90, 60, 30].map((height, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            whileHover={{ height: `${height}px` }}
            transition={{ duration: 0.5, delay: i * 0.05, type: 'spring' }}
            className={`w-[12%] rounded-t-lg ${height > 75 ? 'bg-orange-500/20' : 'bg-emerald-500/20'}`}
          />
        ))}
      </div>
    );
  }
  if (name === '跨裝置完美體驗') {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl z-0">
        <div className="absolute top-1/2 right-12 z-0 -translate-y-1/2 flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-all duration-700 translate-x-10 group-hover:translate-x-0">
          <div className="w-16 h-28 rounded-2xl border-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl relative top-8">
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-4 h-[2px] rounded-full bg-slate-300 dark:bg-slate-700" />
            <div className="absolute top-2 inset-x-2 bottom-6 bg-slate-100 dark:bg-slate-800/50 rounded-md" />
          </div>
          <div className="w-32 h-44 rounded-2xl border-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl relative">
            <div className="absolute top-3 inset-x-3 bottom-4 bg-slate-100 dark:bg-slate-800/50 rounded-lg overflow-hidden flex flex-col gap-1 p-2">
              <div className="w-full h-8 bg-emerald-500/20 rounded-md" />
              <div className="w-2/3 h-4 bg-slate-200 dark:bg-slate-700 rounded-md mt-2" />
              <div className="w-1/2 h-4 bg-slate-200 dark:bg-slate-700 rounded-md" />
            </div>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

function BentoCard({
  feature,
  className,
}: {
  feature: any;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Mouse absolute position for spotlight (origin top-left)
  const pxX = useMotionValue(0);
  const pxY = useMotionValue(0);

  // Mouse normalized position for 3D tilt (-1 to 1)
  const rotX = useSpring(0, { stiffness: 400, damping: 40 });
  const rotY = useSpring(0, { stiffness: 400, damping: 40 });

  function handleMouseMove({ currentTarget, clientX, clientY }: MouseEvent) {
    const { left, top, width, height } = currentTarget.getBoundingClientRect();
    const x = clientX - left;
    const y = clientY - top;

    pxX.set(x);
    pxY.set(y);

    // Map position to degrees: [-10, 10]
    const rX = (y / height - 0.5) * -15;
    const rY = (x / width - 0.5) * 15;

    rotX.set(rX);
    rotY.set(rY);
  }

  function handleMouseLeave() {
    rotX.set(0);
    rotY.set(0);
  }

  return (
    <motion.div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`group relative perspective-1000 ${className}`}
      style={{ perspective: 1200 }}
      variants={{
        hidden: { opacity: 0, scale: 0.9, y: 30 },
        show: {
          opacity: 1,
          scale: 1,
          y: 0,
          transition: { type: 'spring', stiffness: 300, damping: 24 },
        },
      }}
    >
      <motion.div
        style={{
          rotateX: rotX,
          rotateY: rotY,
          transformStyle: 'preserve-3d',
        }}
        className={`relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl transition-all duration-300 p-8 shadow-sm hover:shadow-2xl hover:shadow-emerald-500/5 h-full w-full`}
      >
        {/* Dynamic Background visual */}
        <FeatureVisual name={feature.name} />

        {/* Global Spotlight */}
        <motion.div
          className="pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100 z-0 mix-blend-color-dodge dark:mix-blend-screen"
          style={{
            background: useMotionTemplate`
              radial-gradient(
                500px circle at ${pxX}px ${pxY}px,
                rgba(16, 185, 129, 0.15),
                transparent 80%
              )
            `,
          }}
        />

        {/* Active Laser Border Glow */}
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition duration-300 group-hover:opacity-100 z-20"
          style={{
            padding: '2px', // Border width
            background: useMotionTemplate`
              radial-gradient(
                300px circle at ${pxX}px ${pxY}px,
                rgba(16, 185, 129, 0.8),
                transparent 100%
              )
            `,
            WebkitMask:
              'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
          }}
        />

        {/* Floating Content wrapper (Popped out using translateZ) */}
        <div
          className="relative z-10 flex flex-col h-full transform-gpu transition-all duration-300 origin-center pointer-events-none"
          style={{ transform: 'translateZ(60px)' }}
        >
          <div className="mb-6 inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-500 shadow-sm group-hover:shadow-emerald-500/30 group-hover:scale-110">
            <feature.icon className="h-8 w-8" />
          </div>
          <div className="mt-auto pointer-events-auto">
            <h3 className="mb-3 font-outfit text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white drop-shadow-sm">
              {feature.name}
            </h3>
            <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 leading-relaxed font-medium drop-shadow-sm max-w-sm">
              {feature.description}
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

const features = [
  {
    name: '智慧視覺分析',
    description:
      '顛覆傳統記帳模式。自動生成精美圖表，讓您一眼洞悉財務健康狀況與隱藏的消費趨勢。',
    icon: PieChart,
    className: 'md:col-span-2 md:row-span-2',
  },
  {
    name: '極速閃電記帳',
    description: '優化至極致的操作介面，體驗幾秒內完成記帳的流暢感受。',
    icon: Zap,
    className: 'md:col-span-1 md:row-span-1',
  },
  {
    name: '即時雲端同步',
    description: '資料永不丟失！無論在什麼網域，記帳無痛接軌。',
    icon: Cloud,
    className: 'md:col-span-1 md:row-span-1',
  },
  {
    name: '跨裝置完美體驗',
    description: '擺脫設備限制！電腦、平板、手機皆能享有絕對完美的響應式設計。',
    icon: Smartphone,
    className: 'md:col-span-2 md:row-span-1',
  },
  {
    name: '主動預算守門員',
    description: '設定目標與極限，即時監控花費，避免吃土。',
    icon: BarChart3,
    className: 'md:col-span-1 md:row-span-1',
  },
  {
    name: '銀行級加密保障',
    description: '軍規加密技術，每一筆隱密收支都固若金湯。',
    icon: Lock,
    className: 'md:col-span-3 md:row-span-1',
  },
];

export function Features() {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  return (
    <section
      id="features"
      className="relative z-10 py-32 bg-slate-50 dark:bg-[#060c15] transition-colors duration-500 overflow-hidden"
    >
      <div className="container mx-auto px-6 md:px-12 relative z-10 max-w-7xl">
        <motion.div
          className="text-center mb-20 space-y-6"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, type: 'spring' }}
        >
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 dark:bg-emerald-500/10 border border-slate-800 dark:border-emerald-500/20 text-sm font-bold text-white dark:text-emerald-400 tracking-widest uppercase shadow-2xl backdrop-blur-xl">
            核心特徵
          </div>
          <h2 className="font-outfit text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 dark:text-white drop-shadow-sm">
            極致強大，
            <span className="block text-emerald-500 mt-2 filter drop-shadow-[0_0_20px_rgba(16,185,129,0.5)]">
              超越期待。
            </span>
          </h2>
          <p className="max-w-3xl mx-auto text-lg md:text-xl text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
            我們將強悍的計算功能包裹在令人屏息的設計當中。所有數據一目瞭然，所有的體驗都無比絲滑。
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 auto-rows-auto md:auto-rows-[340px] gap-8 perspective-1200"
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-100px' }}
        >
          {features.map((feature) => (
            <BentoCard
              key={feature.name}
              feature={feature}
              className={feature.className}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
