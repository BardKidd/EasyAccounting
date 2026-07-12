import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // 允許從 LAN IP（如 VM）存取 dev server 內部資產（/__nextjs_font、/_next）
  // 否則 Next 16.2+ 會對非 localhost 來源回 403
  allowedDevOrigins: ['192.168.64.2'],
};

export default nextConfig;
