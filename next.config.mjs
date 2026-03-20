/** @type {import('next').NextConfig} */
const nextConfig = {
  // Desabilitar cache de headers para JS chunks — garante código fresco
  async headers() {
    return [
      {
        source: '/_next/static/chunks/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store, must-revalidate' }],
      },
    ]
  },
  // Cross-Origin headers necessários para Web Audio API + SharedArrayBuffer
  async headers2() { return [] },
};

export default nextConfig;
