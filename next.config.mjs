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
  // Optimize for static generation where possible
  // Use 'standalone' for deployment with API routes support
  output: 'standalone',
  
  // For fully static export (no API routes), uncomment these lines:
  // output: 'export',
  // trailingSlash: true,
  // Disable Turbopack to avoid ChunkLoadError
  experimental: {
    turbo: {
      rules: {}
    }
  },
};

export default nextConfig;
