const createNextIntlPlugin = require("next-intl/plugin");

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.r2.dev" },
      { protocol: "https", hostname: "fal.media" },
    ],
  },
  experimental: {
    serverActions: { allowedOrigins: ["localhost:3000", "frameagent.vercel.app"] },
  },
};

module.exports = withNextIntl(nextConfig);
