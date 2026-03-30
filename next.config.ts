import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
  // ✅ DÜZELTME: Cross-origin uyarısını gidermek için allowedDevOrigins eklendi.
  // Kendi IP adresinle değiştir (veya birden fazla cihaz için dizi genişlet).
  ...(process.env.NODE_ENV === "development" && {
    allowedDevOrigins: ["192.168.1.166"],
  }),
};

export default nextConfig;