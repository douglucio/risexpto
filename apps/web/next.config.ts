import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: { useTypeScriptCli: false, cpus: 1 },
};
export default nextConfig;
