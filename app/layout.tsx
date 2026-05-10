import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DinnerDrop — AI Dinner Planning for Busy Families",
  description: "Generate 5 personalized dinner plans, build your grocery list, and shop at your favorite store — all in one tap. Try free for 7 days.",
  openGraph: {
    title: "DinnerDrop — AI Dinner Planning for Busy Families",
    description: "Generate 5 personalized dinner plans, build your grocery list, and shop at your favorite store — all in one tap. Try free for 7 days.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "DinnerDrop" }],
    type: "website",
    url: "https://dinnerdrop.app",
  },
  twitter: {
    card: "summary_large_image",
    title: "DinnerDrop — AI Dinner Planning for Busy Families",
    description: "Generate 5 personalized dinner plans, build your grocery list, and shop at your favorite store — all in one tap.",
    images: ["/og-image.png"],
  },
  metadataBase: new URL("https://dinnerdrop.app"),
  icons: {
    icon: "/favicon.ico",
  },
  verification: {
    google: "aRL3GZUE7P9djb-TJ4-DGsySJ-a4ga092frVWuHVvmo",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="google-site-verification" content="aRL3GZUE7P9djb-TJ4-DGsySJ-a4ga092frVWuHVvmo" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "DinnerDrop",
              "applicationCategory": "LifestyleApplication",
              "operatingSystem": "Web",
              "url": "https://dinnerdrop.app",
              "description": "AI-powered weekly dinner planning for busy families. Get 5 personalized meals and a one-tap grocery list in seconds.",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD",
                "description": "6-month free beta offer — no credit card required"
              },
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.9",
                "reviewCount": "47"
              },
              "featureList": [
                "AI meal planning personalized for your family",
                "One-tap grocery list generation",
                "Instacart, Walmart, Amazon Fresh, Kroger integration",
                "Picky-eater friendly meal swapping",
                "Weekly budget tracking"
              ]
            })
          }}
        />
      </head>
      <body className="antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
