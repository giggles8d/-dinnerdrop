import type { Metadata } from "next";

const title = "DinnerDrop — Free Weekly Dinner Plans + One-Tap Instacart Cart";
const description =
  "Five weeknight dinners planned for your family and budget, and your whole grocery list in your Instacart cart in one tap. Free to start, no card needed.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "https://www.dinnerdrop.app/start" },
  openGraph: {
    title,
    description,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "DinnerDrop — Dinner, handled" }],
    url: "https://www.dinnerdrop.app/start",
    siteName: "DinnerDrop",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og-image.png"],
  },
};

export default function StartLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
