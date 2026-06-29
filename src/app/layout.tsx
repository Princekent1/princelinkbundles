import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import AppProvider from "@/providers/AppProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Prince K Ventures — Data bundles for Ghana",
  description: "Buy MTN, Telecel and AirtelTigo data bundles for any number in Ghana. No account needed. Secure Paystack checkout. Data delivered in minutes.",
  metadataBase: new URL("https://princekventures.com"),
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "512x512" },
  },
  openGraph: {
    title: "Prince K Ventures",
    description: "MTN, Telecel and AirtelTigo bundles. No account. 60-second checkout.",
    url: "https://princekventures.com",
    siteName: "Prince K Ventures",
    images: [{ url: "/og-image.png", width: 1024, height: 1024, alt: "Prince K Ventures" }],
    locale: "en_GH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Prince K Ventures",
    description: "MTN, Telecel and AirtelTigo bundles. No account. 60-second checkout.",
    images: ["/og-image.png"],
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
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full" style={{ background: "#0b1121", color: "#94a3b8" }}>
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
