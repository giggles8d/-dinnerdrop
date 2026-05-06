import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4"
         style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)" }}>
      <div className="text-center max-w-md">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-full flex items-center justify-center"
               style={{ background: "#1a5c38" }}>
            <span className="text-white font-bold text-lg">D</span>
          </div>
          <span className="font-bold text-xl" style={{ color: "#1a5c38" }}>DinnerDrop</span>
        </div>

        {/* 404 Headline */}
        <h1 className="text-6xl font-bold mb-4" style={{ color: "#1a5c38" }}>404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-3">
          This page went missing.
        </h2>
        <p className="text-gray-500 mb-8">
          Looks like this link has expired or doesn&apos;t exist. But your dinners don&apos;t have to be a mystery.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-6 py-3 rounded-lg text-white font-semibold transition-opacity hover:opacity-90"
            style={{ background: "#1a5c38" }}
          >
            Go home
          </Link>
          <Link
            href="/beta"
            className="px-6 py-3 rounded-lg font-semibold transition-opacity hover:opacity-90 border-2"
            style={{ borderColor: "#1a5c38", color: "#1a5c38" }}
          >
            Join beta — 6 months free
          </Link>
        </div>
      </div>
    </div>
  );
}
