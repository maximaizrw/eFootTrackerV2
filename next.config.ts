
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
    // Forzamos el uso de etiquetas <img> estándar para evitar procesamientos del servidor que fallen con dominios externos
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
