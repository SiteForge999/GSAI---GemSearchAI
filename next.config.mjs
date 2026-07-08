/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.ytimg.com" },
      { protocol: "https", hostname: "**.userapi.com" },
      { protocol: "https", hostname: "**.vk.com" },
      { protocol: "https", hostname: "**.rutube.ru" },
      { protocol: "https", hostname: "**.rutubelist.ru" },
      { protocol: "http", hostname: "**.rutube.ru" }
    ]
  },
  eslint: {
    ignoreDuringBuilds: true
  }
};

export default nextConfig;
