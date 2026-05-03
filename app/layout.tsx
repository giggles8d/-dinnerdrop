import type { Metadata } from "next";
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
