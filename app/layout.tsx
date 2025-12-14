import type React from "react"
import type { Metadata, Viewport } from "next"
import { Fredoka, Caveat } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { CartProvider } from "@/components/cart/cart-context"
import { PasswordChecker } from "@/components/coming-soon/password-checker"
import "./globals.css"

const fredoka = Fredoka({ subsets: ["latin"], variable: "--font-sans" })
const caveat = Caveat({ subsets: ["latin"], variable: "--font-display" })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: "ArtsyFam - Kids Art Print on Demand",
  description: "Unique art creations by young artists, available on custom products through print-on-demand",
  generator: "v0.app",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-light-32x32.png", sizes: "32x32", type: "image/png", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark-32x32.png", sizes: "32x32", type: "image/png", media: "(prefers-color-scheme: dark)" },
    ],
    apple: [{ url: "/apple-touch-icon.jpg", sizes: "180x180", type: "image/jpeg" }],
  },
  openGraph: {
    title: "ArtsyFam - Kids Art Print on Demand",
    description: "Unique art creations by young artists, available on custom products through print-on-demand",
    url: "https://artsyfam.com",
    siteName: "ArtsyFam",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 628,
        alt: "ArtsyFam - Kids Art Print on Demand",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ArtsyFam - Kids Art Print on Demand",
    description: "Unique art creations by young artists, available on custom products through print-on-demand",
    images: ["/og-image.jpg"],
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#7c3aed",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background">
      <body className={`${fredoka.variable} ${caveat.variable} font-sans antialiased`}>
        <PasswordChecker />
        <CartProvider>{children}</CartProvider>
        <Analytics />
      </body>
    </html>
  )
}
