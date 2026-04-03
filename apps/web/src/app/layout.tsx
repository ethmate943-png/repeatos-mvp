import type { Metadata } from "next";
import { Figtree, Host_Grotesk } from "next/font/google";

import "./globals.css";

const figtree = Figtree({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-figtree",
});

const hostGrotesk = Host_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-host-grotesk",
});

export const metadata: Metadata = {
  title: "RepeatOS | Premium Hosted Menu",
  description: "The hospitality retention operating system.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${figtree.variable} ${hostGrotesk.variable}`}>
      <body className={`${figtree.className} antialiased`}>{children}</body>
    </html>
  );
}
