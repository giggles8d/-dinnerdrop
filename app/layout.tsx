import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DinnerDrop — Five weeknight dinners. One grocery run.",
  description: "Smart weekly dinner planner that generates personalized 5-dinner meal plans and sends your grocery list to your favorite store in one tap.",
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
