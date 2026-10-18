/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async redirects() {
    // 2026-10-16: the "first 100 families free" offer is fulfilled (228 members).
    // /beta used to redirect every visitor to /waitlist once the counter hit 0,
    // which closed the funnel. All legacy entry points now land on /start
    // (14-day free trial). Query strings (utm_*) are preserved by Next.js.
    return [
      { source: '/beta', destination: '/start', permanent: true },
      { source: '/beta-v2', destination: '/start', permanent: true },
      { source: '/waitlist', destination: '/start', permanent: true },
      { source: '/pricing', destination: '/#pricing', permanent: true },
    ]
  },
};

export default nextConfig;
