import type { Metadata, Viewport } from "next";
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
