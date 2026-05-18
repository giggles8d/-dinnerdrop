import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";
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
        {/* Google Ads Tag */}
        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=AW-18170234265"
          strategy="afterInteractive"
        />
        <Script id="google-ads-tag" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-18170234265');
          `}
        </Script>
        {/* Meta Pixel */}
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '2031808580404505');
            fbq('track', 'PageView');
          `}
        </Script>
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=2031808580404505&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
        {/* Pinterest Tag */}
        <Script id="pinterest-tag" strategy="afterInteractive">
          {`
            !function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments)
            },s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.pinimg.com/js/pintrk.js'
            ,a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');
            pintrk('load', '2612772503928');
            pintrk('page');
          `}
        </Script>
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            alt=""
            src="https://ct.pinterest.com/v3/?event=init&tid=2612772503928&noscript=1"
          />
        </noscript>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
