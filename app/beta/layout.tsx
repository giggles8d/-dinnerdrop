import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join the DinnerDrop Beta — 6 Months Free",
  description: "First 100 families get 6 months of AI-powered dinner planning completely free. $0 charged today, cancel anytime.",
  openGraph: {
    title: "Join the DinnerDrop Beta — 6 Months Free",
    description: "First 100 families get 6 months of AI-powered dinner planning completely free. $0 charged today, cancel anytime.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "DinnerDrop Beta — 6 Months Free" }],
    url: "https://dinnerdrop.app/beta",
    siteName: "DinnerDrop",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Join the DinnerDrop Beta — 6 Months Free",
    description: "First 100 families get 6 months of AI-powered dinner planning completely free. $0 charged today, cancel anytime.",
    images: ["/og-image.png"],
  },
};

export default function BetaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
