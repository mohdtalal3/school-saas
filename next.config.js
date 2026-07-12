/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "itjffvgszlvmzkpzbydh.supabase.co",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  // Ensure @react-pdf/renderer is transpiled and not treated as a Node-only package
  transpilePackages: ["@react-pdf/renderer"],
};

module.exports = nextConfig;
