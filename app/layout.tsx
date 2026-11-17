import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Outpost",
  description:
    "Outpost warns which store shelf will go empty next, shows the cheapest safe fix, and proves the result on real data, including the days it lost.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
