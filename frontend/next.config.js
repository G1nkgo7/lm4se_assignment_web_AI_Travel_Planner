/** @type {import('next').NextConfig} */
const API_PROXY_TARGET = process.env.API_PROXY_TARGET ?? "";

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
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com"
      },
      {
        protocol: "https",
        hostname: "*.baidu.com"
      }
    ]
  },
  async rewrites() {
    if (!API_PROXY_TARGET) {
      return [];
    }

    const target = API_PROXY_TARGET.replace(/\/$/, "");

    return [
      {
        source: "/api/:path*",
        destination: `${target}/api/:path*`
      }
    ];
  }
};

module.exports = nextConfig;
