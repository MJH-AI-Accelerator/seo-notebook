import type { Metadata, Viewport } from "next";
import "../index.css";

export const metadata: Metadata = {
  title: "SEO Notebook",
  description:
    "SEO Notebook - AI-powered SEO writing assistant by MJH Life Sciences",
  icons: {
    icon: "/favicon.svg",
    apple: "/icons/icon-192.svg",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SEO Notebook",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#E6C01B",
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
