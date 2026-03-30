/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turbopack hatasını susturmak için boş bir nesne ekliyoruz
  experimental: {
    turbopack: {},
  },
};

export default nextConfig;