import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb", // 👈 increase limit
    },
  },
};

export default nextConfig;
