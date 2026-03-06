
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    allowedDevOrigins: [
      '6000-firebase-studio-1756832756924.cluster-r7kbxfo3fnev2vskbkhhphetq6.cloudworkstations.dev',
      '9000-firebase-studio-1756832756924.cluster-r7kbxfo3fnev2vskbkhhphetq6.cloudworkstations.dev',
    ],
  },
  images: {
    // Activamos unoptimized global para que cualquier URL externa cargue sin restricciones de dominio
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
