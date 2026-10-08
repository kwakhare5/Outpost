import type { Metadata } from 'next';
import { Public_Sans } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';
import { Analytics } from '@vercel/analytics/react';

const publicSans = Public_Sans({
  subsets: ['latin'],
  variable: '--font-sans-public',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Outpost — Quick-Commerce Inventory Replenishment Decision Engine",
  description:
    "Deterministic decision engine for high-velocity dark stores. Forecasts localized demand, enforces Level-2 human review, and tracks lateral stock rebalancing with mass conservation.",
  keywords: [
    "quick-commerce",
    "dark store",
    "inventory replenishment",
    "supply chain",
    "FastAPI",
    "Next.js",
    "deterministic simulation",
    "Mumbai",
    "demand forecasting",
    "loss prevention",
  ],
  authors: [{ name: "Karan Wakhare", url: "https://github.com/kwakhare5" }],
  openGraph: {
    title: "Outpost — Quick-Commerce Inventory Replenishment Decision Engine",
    description:
      "Deterministic decision engine for high-velocity dark stores. Forecasts localized demand, enforces Level-2 human review, and tracks lateral stock rebalancing with mass conservation.",
    url: "https://outtpost.vercel.app",
    siteName: "Outpost",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Outpost — Quick-Commerce Inventory Replenishment Decision Engine",
    description:
      "Deterministic decision engine for high-velocity dark stores. Forecasts localized demand, enforces Level-2 human review, and tracks lateral stock rebalancing with mass conservation.",
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${publicSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col selection:bg-[#2563EB] selection:text-white relative overflow-x-hidden bg-[#FAF8F5] text-[#1C1917] font-sans">
        {children}
        <Toaster position="top-right" theme="light" richColors />
        <Analytics />
      </body>
    </html>
  );
}
