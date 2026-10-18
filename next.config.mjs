/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'znxuxkqmmulnhkuwlshr.supabase.co',
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
      { source: '/pricing', destination: '/start', permanent: true },
      // Old label used in ads/links; the landing page is picky-eater-dinners.
      { source: '/dinners/kid-friendly-dinners', destination: '/dinners/picky-eater-dinners', permanent: true },
      { source: '/dinners/kid', destination: '/dinners/picky-eater-dinners', permanent: true },
      { source: '/dinners/30-minute-dinners', destination: '/dinners/dinners-under-30-minutes', permanent: true },
      { source: '/dinners/under-30-minutes', destination: '/dinners/dinners-under-30-minutes', permanent: true },
    ]
  },
};

export default nextConfig;
