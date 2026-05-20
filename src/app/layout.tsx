import type { Metadata, Viewport } from "next";
import { Noto_Sans_TC } from "next/font/google";
import { JsonLd } from "@/components/JsonLd";
import { createMetadata } from "@/lib/metadata";
import { siteConfig } from "@/lib/site";
import "./globals.css";

const notoSansTC = Noto_Sans_TC({
  variable: "--font-noto-sans-tc",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  ...createMetadata(),
  appleWebApp: {
    capable: true,
    title: siteConfig.name,
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#fff8f0",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant" className={`${notoSansTC.variable} h-full`}>
      <body className="min-h-full antialiased">
        <JsonLd />
        {children}
      </body>
    </html>
  );
}
