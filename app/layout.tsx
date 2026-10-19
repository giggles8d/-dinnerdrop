import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";
import PwaRegister from "@/components/PwaRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "DinnerDrop — Weekly Dinner Plans, Straight Into Your Instacart Cart",
  description: "Five weeknight dinners planned around your family and budget, and your grocery list in your Instacart cart in one tap. Free, no card needed.",
  openGraph: {
    title: "DinnerDrop — Weekly Dinner Plans, Straight Into Your Instacart Cart",
    description: "Five weeknight dinners planned around your family and budget, and your grocery list in your Instacart cart in one tap. Free, no card needed.",
    images: [{ url: "/og-image.png?v=3", width: 1200, height: 630, alt: "DinnerDrop" }],
    type: "website",
    url: "https://www.dinnerdrop.app",
  },
  twitter: {
    card: "summary_large_image",
    title: "DinnerDrop — Weekly Dinner Plans, Straight Into Your Instacart Cart",
    description: "Five weeknight dinners planned around your family and budget, and your grocery list in your Instacart cart in one tap. Free, no card needed.",
    images: ["/og-image.png?v=3"],
  },
  metadataBase: new URL("https://www.dinnerdrop.app"),
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "DinnerDrop",
    statusBarStyle: "default",
  },
  verification: {
    google: "aRL3GZUE7P9djb-TJ4-DGsySJ-a4ga092frVWuHVvmo",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#1a5c38",
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
        <meta name="p:domain_verify" content="427458932d59da42a3de89511f35be98" />
        {/* Impact.com domain verification — uses the non-standard `value=` attribute per their docs, so we spread to bypass React's strict <meta> types */}
        <meta {...({ name: 'impact-site-verification', value: '873816be-9855-4c55-995a-412f97a0bbac' } as React.MetaHTMLAttributes<HTMLMetaElement>)} />
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
              "url": "https://www.dinnerdrop.app",
              "description": "Weekly dinner planning for busy families. Five personalized dinners, a deduplicated grocery list, and a one-tap Instacart cart.",
              "offers": [
                { "@type": "Offer", "name": "Free", "price": "0", "priceCurrency": "USD", "description": "Unlimited weekly dinner plans, grocery list, and one-tap Instacart cart. No card needed." },
                { "@type": "Offer", "name": "Family", "price": "4.99", "priceCurrency": "USD", "description": "$4.99/month or $39/year after a 14-day free trial. Cancel anytime." }
              ],
              "featureList": [
                "AI meal planning personalized for your family",
                "One-tap grocery list generation",
                "Instacart and Kroger one-tap grocery cart integration",
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
        {/* Reddit Pixel — gated on env var; once NEXT_PUBLIC_REDDIT_PIXEL_ID is set in Vercel, this fires without redeploy. */}
        {process.env.NEXT_PUBLIC_REDDIT_PIXEL_ID && (
          <>
            <Script id="reddit-pixel" strategy="afterInteractive">
              {`
                !function(w,d){if(!w.rdt){var p=w.rdt=function(){p.sendEvent?p.sendEvent.apply(p,arguments):p.callQueue.push(arguments)};p.callQueue=[];var t=d.createElement("script");t.src="https://www.redditstatic.com/ads/pixel.js",t.async=!0;var s=d.getElementsByTagName("script")[0];s.parentNode.insertBefore(t,s)}}(window,document);
                rdt('init', '${process.env.NEXT_PUBLIC_REDDIT_PIXEL_ID}');
                rdt('track', 'PageVisit');
              `}
            </Script>
            <noscript>
              <img
                height="1"
                width="1"
                style={{ display: "none" }}
                alt=""
                src={`https://alb.reddit.com/snoo.gif?q=CAAHAAABAAoACQAAAAA&s=${process.env.NEXT_PUBLIC_REDDIT_PIXEL_ID}`}
              />
            </noscript>
          </>
        )}
        {children}
        <Analytics />
        <PwaRegister />
      </body>
    </html>
  );
}
