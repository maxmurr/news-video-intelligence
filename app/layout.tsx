import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Interactive News Video Intelligence",
  description: "Interactive News Video Intelligence",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
