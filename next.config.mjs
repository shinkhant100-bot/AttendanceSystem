/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: "node_modules/.cache/next",
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
