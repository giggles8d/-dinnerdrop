import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join the DinnerDrop Beta — 6 Months Free",
  description: "First 100 families get 6 months of AI-powered dinner planning completely free. No credit card required.",
  openGraph: {
    title: "Join the DinnerDrop Beta — 6 Months Free",
    description: "First 100 families get 6 months of AI-powered dinner planning completely free. No credit card required.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "DinnerDrop Beta" }],
  },
};

export default function BetaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
