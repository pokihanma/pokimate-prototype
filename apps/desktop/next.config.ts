const isProd = process.env.NODE_ENV === 'production';
const internalHost = process.env.TAURI_DEV_HOST || 'localhost';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  assetPrefix: isProd ? undefined : `http://${internalHost}:3000`,
  watchOptions: {
    ignored: ['**/node_modules', 'C:\\*.sys', 'C:\\*.tmp', 'C:\\*.log'],
  },
};

export default nextConfig;
