import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
