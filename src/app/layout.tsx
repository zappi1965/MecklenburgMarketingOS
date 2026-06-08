import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MecklenburgMarketingOS",
  description:
    "Enterprise Marketing SaaS für lokale Stores — Loyalty, Reviews & mehr.",
};

// Mobile-first: customer flows (scan, review, redeem) are primarily on phones.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
