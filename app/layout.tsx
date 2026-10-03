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
  title: "Outpost — Autonomous Quick-Commerce Inventory Deck",
  description:
    "Deterministic decision engine for multi-node dark store inventory balancing and human-in-the-loop replenishment execution.",
  icons: {
    icon: '/logo.svg',
    shortcut: '/logo.svg',
    apple: '/logo.svg',
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
      <body className="min-h-full flex flex-col selection:bg-zinc-800 selection:text-white relative overflow-x-hidden bg-[#FAFAFA] text-zinc-900 font-sans">
        {children}
        <Toaster position="top-right" theme="light" richColors />
        <Analytics />
      </body>
    </html>
  );
}
