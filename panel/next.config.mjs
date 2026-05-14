/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.dubizzle.com" },
      { protocol: "https", hostname: "**.dubicars.com" },
      { protocol: "https", hostname: "**.coches.net" },
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
