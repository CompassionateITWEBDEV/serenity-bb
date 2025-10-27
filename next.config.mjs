/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Disable Turbopack to avoid ChunkLoadError
  experimental: {
    turbo: {
      rules: {}
    }
  },
};

export default nextConfig;
