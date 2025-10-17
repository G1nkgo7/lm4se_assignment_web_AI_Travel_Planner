/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.alicdn.com"
      },
      {
        protocol: "https",
        hostname: "*.amap.com"
      }
    ]
  }
};

module.exports = nextConfig;
