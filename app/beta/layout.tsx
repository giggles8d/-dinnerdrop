import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DinnerDrop — 6 Months Free for the First 100 Families",
  description: "First 100 families get 6 months of AI-powered dinner planning completely free. No credit card required, cancel anytime.",
  openGraph: {
    title: "DinnerDrop — 6 Months Free for the First 100 Families",
    description: "First 100 families get 6 months of AI-powered dinner planning completely free. No credit card required, cancel anytime.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "DinnerDrop — 6 Months Free" }],
    url: "https://dinnerdrop.app/beta",
    siteName: "DinnerDrop",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DinnerDrop — 6 Months Free for the First 100 Families",
    description: "First 100 families get 6 months of AI-powered dinner planning completely free. No credit card required, cancel anytime.",
    images: ["/og-image.png"],
  },
};

export default function BetaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
